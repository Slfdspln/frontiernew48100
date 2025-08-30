import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { getSupa } from '@/utils/supabaseAdmin';
import { rl } from '@/utils/ratelimit';
import { checkCsrf } from '@/utils/csrf';
import { getSession } from '@/utils/session';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ApproveBody = z.object({
  passId: z.string().uuid(),
  approve: z.boolean()
});

export async function POST(req) {
  // Rate limiting
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const { success } = await rl.limit(`approve:${ip}`);
  if (!success) return NextResponse.json({ ok: false, error: 'Too many requests' }, { status: 429 });

  // CSRF protection
  const cookieStore = await cookies();
  if (!checkCsrf(req, cookieStore)) {
    return NextResponse.json({ ok: false, error: 'CSRF' }, { status: 403 });
  }

  // Session check
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { passId, approve } = ApproveBody.parse(await req.json());
    
    const supa = getSupa();

    // Verify pass belongs to this host and is pending
    const { data: guestPass } = await supa
      .from('guest_passes')
      .select('*')
      .eq('id', passId)
      .eq('host_id', session.residentId)
      .eq('status', 'pending')
      .single();

    if (!guestPass) {
      return NextResponse.json({ ok: false, error: 'Pass not found or not pending' }, { status: 404 });
    }

    // Update status based on approval
    const newStatus = approve ? 'scheduled' : 'canceled';
    
    const { data: updatedPass } = await supa
      .from('guest_passes')
      .update({ status: newStatus })
      .eq('id', passId)
      .select()
      .single();

    return NextResponse.json({ 
      ok: true, 
      passId: updatedPass.id,
      status: updatedPass.status
    });

  } catch (error) {
    console.error('Approve error:', error);
    return NextResponse.json({ ok: false, error: 'Invalid input or server error' }, { status: 400 });
  }
}

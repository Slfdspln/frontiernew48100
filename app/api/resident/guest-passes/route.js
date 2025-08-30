import { NextResponse } from 'next/server';
import { getSupa } from '@/utils/supabaseAdmin';
import { getSession } from '@/utils/session';
import { rl } from '@/utils/ratelimit';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  // Rate limiting
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const { success } = await rl.limit(`resident-passes:${ip}`);
  if (!success) return NextResponse.json({ ok: false, error: 'Too many requests' }, { status: 429 });

  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const supa = getSupa();
    
    // Get guest passes for this resident
    const { data: passes } = await supa
      .from('guest_passes')
      .select(`
        *,
        guests(*)
      `)
      .eq('host_id', session.residentId)
      .order('created_at', { ascending: false });

    return NextResponse.json(passes || []);

  } catch (error) {
    console.error('Get passes error:', error);
    return NextResponse.json({ ok: false, error: 'Failed to fetch passes' }, { status: 500 });
  }
}
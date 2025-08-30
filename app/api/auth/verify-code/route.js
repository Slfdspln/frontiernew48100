import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { Frontier } from '@/utils/frontierClient';
import { getSupa } from '@/utils/supabaseAdmin';
import { setSession } from '@/utils/session';
import { rl } from '@/utils/ratelimit';
import { checkCsrf } from '@/utils/csrf';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const VerifyCodeBody = z.object({
  code: z.string().regex(/^\d{6}$/, 'Code must be 6 digits')
});

export async function POST(req) {
  // Rate limiting
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const { success } = await rl.limit(`verify:${ip}`);
  if (!success) return NextResponse.json({ ok: false, error: 'Too many requests' }, { status: 429 });

  // CSRF protection
  const cookieStore = await cookies();
  if (!checkCsrf(req, cookieStore)) {
    return NextResponse.json({ ok: false, error: 'CSRF' }, { status: 403 });
  }

  // Input validation
  try {
    const { code } = VerifyCodeBody.parse(await req.json());
    const { access, refresh } = await Frontier.verifyLoginCode(code);

    // Pull profile (Bearer)
    const profile = await Frontier.meProfile(access);

    const email = profile?.user?.email || profile?.email;
    const name = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || null;
    const frontierUserId = String(profile?.user ?? profile?.id ?? '');

    // Your residency rule (adjust as needed to your data):
    const isResident =
      Boolean(profile?.community) ||
      String(profile?.organizationRole || '').toLowerCase().includes('resident') ||
      Boolean(profile?.isActive);

    const supa = getSupa();
    
    // Upsert resident record
    const { data: resident, error: residentError } = await supa
      .from('residents')
      .upsert({ email, name }, { onConflict: 'email' })
      .select()
      .single();

    // Upsert auth
    await supa.from('resident_auth').upsert({
      resident_id: resident.id,
      frontier_user_id: frontierUserId,
      frontier_access_token: access,
      frontier_refresh_token: refresh,
      is_resident: isResident,
      verified_at: new Date().toISOString()
    });

    setSession(resident.id);
    return NextResponse.json({ ok: true, isResident });
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'Invalid input or authentication failed' }, { status: 400 });
  }
}

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { Frontier } from '@/utils/frontierClient';
import { rl } from '@/utils/ratelimit';
import { checkCsrf } from '@/utils/csrf';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SendCodeBody = z.object({
  email: z.string().email().min(5).max(100)
});

export async function POST(req) {
  // Rate limiting
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const { success } = await rl.limit(`send-code:${ip}`);
  if (!success) return NextResponse.json({ ok: false, error: 'Too many requests' }, { status: 429 });

  // CSRF protection
  const cookieStore = await cookies();
  if (!checkCsrf(req, cookieStore)) {
    return NextResponse.json({ ok: false, error: 'CSRF' }, { status: 403 });
  }

  // Input validation
  try {
    const { email } = SendCodeBody.parse(await req.json());
    await Frontier.sendLoginCode(email);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'Invalid input' }, { status: 400 });
  }
}

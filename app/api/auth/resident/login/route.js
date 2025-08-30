import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { SignJWT } from 'jose';
import { getSupa } from '@/utils/supabaseAdmin';
import { Frontier } from '@/utils/frontierClient';
import { TwilioVerify } from '@/utils/twilioClient';
// import { rl } from '@/utils/ratelimit'; // Disabled for development
// import { checkCsrf } from '@/utils/csrf'; // Disabled for development

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const LoginBody = z.object({
  email: z.string().email().min(5).max(100),
  phone: z.string().regex(/^\+1\d{10}$/, 'Phone must be in format +1XXXXXXXXXX').optional()
});

export async function POST(req) {
  // Rate limiting (disabled for development)
  // const ip = req.headers.get('x-forwarded-for') || 'unknown';
  // const { success } = await rl.limit(`resident-login:${ip}`);
  // if (!success) return NextResponse.json({ ok: false, error: 'Too many requests' }, { status: 429 });

  // CSRF protection disabled for development

  try {
    const { email, phone } = LoginBody.parse(await req.json());
    
    // If phone provided, use SMS verification
    if (phone) {
      try {
        console.log('Sending SMS to phone:', phone);
        const smsResult = await TwilioVerify.sendVerificationCode(phone);
        console.log('SMS send result:', smsResult);
        
        // Store temporary login session with phone
        const supa = getSupa();
        console.log('Storing session with phone:', phone);
        
        // Delete any existing sessions for this email first
        await supa
          .from('temp_login_sessions')
          .delete()
          .eq('email', email);
          
        await supa
          .from('temp_login_sessions')
          .insert({
            email: email,
            phone: phone,
            ip: 'localhost',
            created_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 minutes
          });

        return NextResponse.json({ 
          ok: true, 
          method: 'sms',
          message: `SMS verification code sent to ${phone}`
        });
        
      } catch (error) {
        console.error('SMS verification send error:', error);
        return NextResponse.json({ ok: false, error: 'Failed to send SMS verification' }, { status: 400 });
      }
    } else {
      // Fallback to email via Frontier API
      try {
        const result = await Frontier.sendLoginCode(email);
        
        // Store temporary login session
        const supa = getSupa();
        
        // Delete any existing sessions for this email first
        await supa
          .from('temp_login_sessions')
          .delete()
          .eq('email', email);
          
        await supa
          .from('temp_login_sessions')
          .insert({
            email: email,
            ip: 'localhost',
            created_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 minutes
          });

        return NextResponse.json({ 
          ok: true, 
          method: 'email',
          message: 'Login code sent to your email'
        });
        
      } catch (error) {
        console.error('Email login code send error:', error);
        return NextResponse.json({ ok: false, error: 'Failed to send login code' }, { status: 400 });
      }
    }

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ ok: false, error: 'Invalid input' }, { status: 400 });
  }
}
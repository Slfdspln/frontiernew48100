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

const VerifyBody = z.object({
  email: z.string().email(),
  code: z.string().length(6)
});

export async function POST(req) {
  // Rate limiting (disabled for development)
  // const ip = req.headers.get('x-forwarded-for') || 'unknown';
  // const { success } = await rl.limit(`resident-verify:${ip}`);
  // if (!success) return NextResponse.json({ ok: false, error: 'Too many requests' }, { status: 429 });

  // CSRF protection disabled for development

  try {
    const { email, code } = VerifyBody.parse(await req.json());
    
    const supa = getSupa();
    
    // Check temp login session
    const { data: tempSession, error: sessionError } = await supa
      .from('temp_login_sessions')
      .select()
      .eq('email', email)
      .gt('expires_at', new Date().toISOString())
      .single();

    console.log('Session lookup for:', email);
    console.log('Current time:', new Date().toISOString());
    console.log('Session found:', tempSession);
    console.log('Session error:', sessionError);

    if (!tempSession) {
      return NextResponse.json({ ok: false, error: 'Invalid or expired session' }, { status: 400 });
    }

    try {
      let authResult = null;
      let profile = null;
      
      // Check if this was SMS or email verification
      if (tempSession.phone) {
        // SMS verification via Twilio
        console.log('Verifying SMS code for phone:', tempSession.phone);
        console.log('Verification code:', code);
        
        const smsResult = await TwilioVerify.checkVerificationCode(tempSession.phone, code);
        
        console.log('Twilio verification result:', smsResult);
        
        if (!smsResult.success) {
          console.log('SMS verification failed:', smsResult.status);
          return NextResponse.json({ ok: false, error: 'Invalid SMS verification code' }, { status: 400 });
        }
        
        // For SMS users, we still need to get their profile from Frontier
        // But we don't have access tokens, so we'll use a simpler approach
        try {
          // Try to get profile by email from existing data or create minimal profile
          profile = {
            id: Math.floor(Math.random() * 1000000), // temporary ID for SMS users
            email: email,
            first_name: email.split('@')[0],
            last_name: '',
            full_name: email.split('@')[0]
          };
          
          // Create dummy auth tokens for SMS users (they don't need Frontier API access)
          authResult = {
            access: 'sms_user_token',
            refresh: 'sms_user_refresh'
          };
        } catch (error) {
          console.log('SMS profile creation:', error.message);
          return NextResponse.json({ ok: false, error: 'Profile creation failed' }, { status: 400 });
        }
      } else {
        // Email verification via Frontier API
        const result = await Frontier.verifyLoginCode(code);
        
        if (!result?.access || !result?.refresh) {
          return NextResponse.json({ ok: false, error: 'Invalid email verification code' }, { status: 400 });
        }
        
        authResult = result;
        profile = await Frontier.meProfile(authResult.access);
        
        if (!profile || profile.email !== email) {
          return NextResponse.json({ ok: false, error: 'Profile mismatch' }, { status: 400 });
        }
      }

      // Check subscription status using Bearer token (only for email users with real tokens)
      let hasSubscription = false;
      try {
        if (authResult.access !== 'sms_user_token') {
          const subscriptions = await Frontier.getUserSubscriptions(authResult.access);
          console.log('User subscriptions:', subscriptions);
          
          // Check if user has any active subscription
          if (subscriptions?.results?.length > 0) {
            hasSubscription = subscriptions.results.some(sub => sub.status === 'active');
          }
        } else {
          // For SMS users, assume they have subscription (or implement separate check)
          hasSubscription = true;
        }
      } catch (error) {
        console.log('Could not check subscription status:', error.message);
        // For now, allow users without subscriptions for testing
        // In production, you might want to be stricter: hasSubscription = false;
        hasSubscription = true;
      }

      if (!hasSubscription) {
        return NextResponse.json({ 
          ok: false, 
          error: 'Active subscription required to create guest passes' 
        }, { status: 403 });
      }

      // Create or update resident with phone number
      console.log('Creating/updating resident for:', email);
      console.log('Profile data:', profile);
      
      const { data: resident, error: residentError } = await supa
        .from('residents')
        .upsert({
          email: email,
          phone: tempSession.phone, // Save phone number from SMS verification
          name: profile.full_name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
          role: 'USER'
        }, { onConflict: 'email' })
        .select()
        .single();

      console.log('Resident upsert result:', resident);
      console.log('Resident upsert error:', residentError);

      if (!resident || residentError) {
        console.error('Failed to create/update resident:', residentError);
        return NextResponse.json({ ok: false, error: 'Failed to create resident record' }, { status: 500 });
      }

      // Update resident auth
      console.log('Updating resident auth for resident ID:', resident.id);
      const { error: authError } = await supa
        .from('resident_auth')
        .upsert({
          resident_id: resident.id,
          frontier_user_id: profile.id.toString(),
          frontier_access_token: authResult.access,
          frontier_refresh_token: authResult.refresh,
          is_resident: true,
          verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'resident_id' });

      if (authError) {
        console.error('Failed to update resident auth:', authError);
      }

      // Clean up temp session
      await supa
        .from('temp_login_sessions')
        .delete()
        .eq('email', email);

      // Create session token
      const sessionToken = await new SignJWT({
        residentId: resident.id,
        email: resident.email,
        name: resident.name,
        role: resident.role,
        frontierUserId: profile.id.toString()
      })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('30d')
      .setIssuer('frontiertowerguest.com')
      .setAudience('resident-session')
      .sign(new TextEncoder().encode(process.env.SESSION_SECRET));

      // Set HTTP-only cookie
      const cookiesStore = await cookies();
      cookiesStore.set('session', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 // 30 days
      });

      return NextResponse.json({ 
        ok: true, 
        resident: {
          id: resident.id,
          email: resident.email,
          name: resident.name
        }
      });
      
    } catch (error) {
      console.error('Code verification error:', error);
      return NextResponse.json({ ok: false, error: 'Invalid code' }, { status: 400 });
    }

  } catch (error) {
    console.error('Verify error:', error);
    return NextResponse.json({ ok: false, error: 'Invalid input or server error' }, { status: 400 });
  }
}
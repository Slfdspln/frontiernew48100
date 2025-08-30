import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { jwtVerify } from 'jose';
import { getSupa } from '@/utils/supabaseAdmin';
import { rl } from '@/utils/ratelimit';
import { checkCsrf } from '@/utils/csrf';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const CompleteBody = z.object({
  token: z.string(),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  idCountry: z.string().min(2).max(3),
  idType: z.string().min(1).max(20),
  idLast4: z.string().regex(/^\d{4}$/),
  email: z.string().email(),
  phone: z.string().min(10).max(20),
  policyVersion: z.string().min(1)
});

export async function POST(req) {
  // Rate limiting
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const { success } = await rl.limit(`complete:${ip}`);
  if (!success) return NextResponse.json({ ok: false, error: 'Too many requests' }, { status: 429 });

  // CSRF protection
  const cookieStore = await cookies();
  if (!checkCsrf(req, cookieStore)) {
    return NextResponse.json({ ok: false, error: 'CSRF' }, { status: 403 });
  }

  try {
    const { token, firstName, lastName, idCountry, idType, idLast4, email, phone, policyVersion } = CompleteBody.parse(await req.json());
    
    // Verify pre-registration token
    const { payload } = await jwtVerify(
      token, 
      new TextEncoder().encode(process.env.SESSION_SECRET),
      {
        issuer: 'frontiertowerguest.com',
        audience: 'guest-prereg'
      }
    );

    const { passId, hostId, guestEmail, nonce } = payload;

    // Verify email matches
    if (email !== guestEmail) {
      return NextResponse.json({ ok: false, error: 'Email mismatch' }, { status: 400 });
    }

    const supa = getSupa();

    // First, get the existing guest pass to preserve extended_data and validate nonce
    const { data: existingPass } = await supa
      .from('guest_passes')
      .select('extended_data, status')
      .eq('id', passId)
      .single();

    if (!existingPass) {
      return NextResponse.json({ ok: false, error: 'Guest pass not found' }, { status: 404 });
    }

    // Validate the token nonce to prevent reuse (only for tokens that have nonce)
    // Legacy tokens without nonce are still allowed for backward compatibility
    if (nonce && existingPass.extended_data?.tokenNonce !== nonce) {
      return NextResponse.json({ ok: false, error: 'Invalid or already used token' }, { status: 400 });
    }

    // Check if this token has already been used (guest pass should be in 'scheduled' status)
    if (existingPass.status !== 'scheduled') {
      return NextResponse.json({ ok: false, error: 'Registration link has already been used' }, { status: 400 });
    }

    // Update guest pass with complete info and set to pending verification
    // Remove the tokenNonce to invalidate the token for future use
    const updatedExtendedData = {
      ...existingPass.extended_data,
      firstName,
      lastName,
      idCountry,
      idType,
      idLast4,
      phone,
      email,
      policyVersion,
      completedAt: new Date().toISOString()
    };
    // Remove the tokenNonce to prevent token reuse (if it exists)
    if (updatedExtendedData.tokenNonce) {
      delete updatedExtendedData.tokenNonce;
    }

    const { data: guestPass } = await supa
      .from('guest_passes')
      .update({
        extended_data: updatedExtendedData,
        status: 'pending_verification'
      })
      .eq('id', passId)
      .select()
      .single();

    if (!guestPass) {
      return NextResponse.json({ ok: false, error: 'Guest pass not found' }, { status: 404 });
    }

    // Create Stripe Identity verification session
    const verificationSession = await stripe.identity.verificationSessions.create({
      type: 'document',
      metadata: {
        guest_pass_id: passId,
        host_id: hostId,
        guest_email: email
      },
      options: {
        document: {
          allowed_types: ['driving_license', 'passport', 'id_card'],
          require_id_number: false,
          require_live_capture: true,
          require_matching_selfie: true
        }
      },
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/guest/verification-complete?session_id={VERIFICATION_SESSION_ID}&pass_id=${passId}`
    });

    return NextResponse.json({ 
      ok: true, 
      passId: guestPass.id,
      status: guestPass.status,
      verification_url: verificationSession.url,
      verification_session_id: verificationSession.id
    });

  } catch (error) {
    console.error('Complete error:', error);
    
    // Provide more specific error messages for debugging
    if (error.code === 'ERR_JWT_EXPIRED') {
      return NextResponse.json({ ok: false, error: 'Token has expired' }, { status: 400 });
    }
    if (error.code === 'ERR_JWT_INVALID') {
      return NextResponse.json({ ok: false, error: 'Invalid token format' }, { status: 400 });
    }
    if (error.code === 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED') {
      return NextResponse.json({ ok: false, error: 'Token signature verification failed' }, { status: 400 });
    }
    if (error.message?.includes('audience')) {
      return NextResponse.json({ ok: false, error: 'Token audience mismatch' }, { status: 400 });
    }
    if (error.message?.includes('issuer')) {
      return NextResponse.json({ ok: false, error: 'Token issuer mismatch' }, { status: 400 });
    }
    if (error.message?.includes('Email mismatch')) {
      return NextResponse.json({ ok: false, error: 'Email does not match invitation' }, { status: 400 });
    }
    if (error.message?.includes('Guest pass not found')) {
      return NextResponse.json({ ok: false, error: 'Guest pass not found' }, { status: 404 });
    }
    
    // Log the specific error for debugging
    console.error('Specific error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    
    return NextResponse.json({ ok: false, error: `Registration failed: ${error.message}` }, { status: 400 });
  }
}

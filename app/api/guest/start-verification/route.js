import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { z } from 'zod';
import { getSupa } from '@/utils/supabaseAdmin';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Initialize Stripe only when needed to avoid build errors
let stripe;
const getStripe = () => {
  if (!stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY environment variable is required');
    }
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripe;
};

const StartVerificationBody = z.object({
  token: z.string(),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  phoneNumber: z.string().min(10).max(20),
  isDelivery: z.boolean().optional()
});

export async function POST(req) {
  try {
    const { token, firstName, lastName, phoneNumber, isDelivery } = StartVerificationBody.parse(await req.json());
    
    // Verify token
    const { payload } = await jwtVerify(
      token, 
      new TextEncoder().encode(process.env.SESSION_SECRET),
      {
        issuer: 'frontiertowerguest.com',
        audience: 'guest-verification'
      }
    );

    const { passId, hostId, nonce } = payload;

    const supa = getSupa();

    // Get the existing guest pass and validate nonce
    const { data: existingPass } = await supa
      .from('guest_passes')
      .select('extended_data, status')
      .eq('id', passId)
      .single();

    if (!existingPass) {
      return NextResponse.json({ ok: false, error: 'Guest pass not found' }, { status: 404 });
    }

    // Validate the token nonce to prevent reuse
    if (nonce && existingPass.extended_data?.tokenNonce !== nonce) {
      return NextResponse.json({ ok: false, error: 'Invalid or already used verification link' }, { status: 400 });
    }

    // Check if already processed
    if (existingPass.status === 'checked_in') {
      return NextResponse.json({ ok: false, error: 'This guest has already been processed' }, { status: 400 });
    }

    // Update guest pass with confirmed details
    const updatedExtendedData = {
      ...existingPass.extended_data,
      confirmedFirstName: firstName,
      confirmedLastName: lastName,
      confirmedPhoneNumber: phoneNumber,
      isDelivery: isDelivery || false,
      verificationStartedAt: new Date().toISOString()
    };

    await supa
      .from('guest_passes')
      .update({
        extended_data: updatedExtendedData,
        guest_name: `${firstName} ${lastName}`,
        status: 'scheduled'
      })
      .eq('id', passId);

    // Create Stripe Identity verification session
    const stripeInstance = getStripe();
    const verificationSession = await stripeInstance.identity.verificationSessions.create({
      type: 'document',
      metadata: {
        guest_pass_id: passId,
        host_id: hostId,
        guest_name: `${firstName} ${lastName}`,
        guest_phone: phoneNumber,
        is_delivery: isDelivery ? 'true' : 'false'
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
      passId: passId,
      verification_url: verificationSession.url,
      verification_session_id: verificationSession.id
    });

  } catch (error) {
    console.error('Start verification error:', error);
    
    if (error.code === 'ERR_JWT_EXPIRED') {
      return NextResponse.json({ ok: false, error: 'Verification link has expired' }, { status: 400 });
    }
    if (error.code === 'ERR_JWT_INVALID') {
      return NextResponse.json({ ok: false, error: 'Invalid verification link' }, { status: 400 });
    }
    
    return NextResponse.json({ ok: false, error: 'Failed to start verification process' }, { status: 400 });
  }
}
import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { z } from 'zod';
import { getSupa } from '@/utils/supabaseAdmin';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
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
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  phoneNumber: z.string().min(10).max(20).optional(),
  isDelivery: z.boolean().optional()
});

export async function GET() {
  // Health check so you can test in browser
  return NextResponse.json({ ok: true, route: "/api/guest/start-verification" });
}

export async function POST(req) {
  try {
    // Accept token/passId in body OR query
    const query = new URL(req.url).searchParams;
    const fromQuery = {
      passId: query.get("passId") || undefined,
      token: query.get("token") || undefined,
    };
    const fromBody = await req.json().catch(() => ({}));
    const passIdIn = fromBody.passId ?? fromQuery.passId;
    const tokenIn = fromBody.token ?? fromQuery.token;

    let passId = passIdIn ?? null;

    // If only token was provided, resolve to passId
    if (!passId && tokenIn) {
      // Try JWT verification first
      try {
        const { payload } = await jwtVerify(
          tokenIn, 
          new TextEncoder().encode(process.env.SESSION_SECRET),
          {
            issuer: 'frontiertowerguest.com',
            audience: 'guest-verification'
          }
        );
        passId = payload.passId;
      } catch (jwtError) {
        // If JWT fails, look up in database
        console.log('JWT verification failed, looking up in database:', jwtError.message);
        const supa = getSupa();
        const { data, error } = await supa
          .from("guest_passes")
          .select("id")
          .or(`id.eq.${tokenIn}`)
          .maybeSingle();

        if (error) {
          console.error('Database lookup error:', error);
          return NextResponse.json({ 
            error: "Database lookup failed", 
            debug: { tokenIn, passIdIn, fromQuery, fromBody, dbError: error.message } 
          }, { status: 400 });
        }
        if (!data) {
          return NextResponse.json({ 
            error: "Invalid or expired link", 
            debug: { tokenIn, passIdIn, fromQuery, fromBody } 
          }, { status: 400 });
        }
        passId = data.id;
      }
    }

    if (!passId) {
      // Surface what we received for debugging
      return NextResponse.json({
        error: "passId or token required",
        debug: { passIdIn, tokenIn, fromQuery, fromBody }
      }, { status: 400 });
    }

    const supa = getSupa();

    // Create Stripe Identity verification session  
    const stripeInstance = getStripe();
    const verificationSession = await stripeInstance.identity.verificationSessions.create({
      type: 'document',
      metadata: {
        guest_pass_id: passId
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
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const { passId } = await req.json();
    if (!passId) {
      return NextResponse.json({ error: "passId required" }, { status: 400 });
    }

    const session = await stripe.identity.verificationSessions.create({
      type: "document",
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/guest/verification-complete?session_id={VERIFICATION_SESSION_ID}&pass_id=${passId}`,
      metadata: { guest_pass_id: passId }
    });

    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error("identity-session error:", e);
    return NextResponse.json({ 
      error: "Failed to create Identity session" 
    }, { status: 500 });
  }
}
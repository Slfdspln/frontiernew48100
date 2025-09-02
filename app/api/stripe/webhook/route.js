import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { getSupa } from '@/utils/supabaseAdmin';

async function generateWallet(passId, guestName, hostName, unit, expiresAt) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3007';
  const resp = await fetch(`${baseUrl}/api/wallet/generate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ passId, guestName, hostName, unit, expiresAt })
  });
  if (!resp.ok) {
    const errorText = await resp.text();
    throw new Error(`wallet/generate failed: ${errorText}`);
  }
  return resp.json();
}

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

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  let event;

  try {
    const stripeInstance = getStripe();
    event = stripeInstance.webhooks.constructEvent(body, signature, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supa = getSupa();

  try {
    switch (event.type) {
      case 'identity.verification_session.verified':
        await handleVerificationVerified(event.data.object, supa);
        break;
      case 'identity.verification_session.requires_input':
        await handleVerificationRequiresInput(event.data.object, supa);
        break;
      case 'identity.verification_session.canceled':
        await handleVerificationCanceled(event.data.object, supa);
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}

async function handleVerificationVerified(session, supa) {
  const { guest_pass_id, host_id, guest_email } = session.metadata;

  console.log('Identity verification verified for guest pass:', guest_pass_id);

  // Get existing guest pass to preserve extended_data
  const { data: existingPass } = await supa
    .from('guest_passes')
    .select('extended_data, guest_name, host_name, unit_number, expires_at')
    .eq('id', guest_pass_id)
    .single();

  if (!existingPass) {
    console.error('Guest pass not found:', guest_pass_id);
    return;
  }

  // Update guest pass status to approved
  const updatedExtendedData = {
    ...existingPass.extended_data,
    verificationStatus: 'verified',
    verificationId: session.id,
    verifiedAt: new Date().toISOString(),
    stripeMetadata: session.metadata
  };

  const { data: guestPass, error } = await supa
    .from('guest_passes')
    .update({
      status: 'approved',
      extended_data: updatedExtendedData
    })
    .eq('id', guest_pass_id)
    .select()
    .single();

  if (error) {
    console.error('Error updating guest pass after verification:', error);
    return;
  }

  console.log('Guest pass approved, generating Apple Wallet pass:', guest_pass_id);

  // Generate Apple Wallet pass
  try {
    await generateWallet(
      guest_pass_id, 
      existingPass.guest_name || 'Guest',
      existingPass.host_name,
      existingPass.unit_number,
      existingPass.expires_at
    );
    console.log('Apple Wallet pass generated successfully for:', guest_pass_id);
  } catch (walletError) {
    console.error('Failed to generate Apple Wallet pass:', walletError);
  }
}

async function handleVerificationRequiresInput(session, supa) {
  const { guest_pass_id } = session.metadata;

  await supa
    .from('guest_passes')
    .update({
      status: 'verification_failed',
      extended_data: {
        ...session.metadata,
        verificationStatus: 'requires_input',
        verificationId: session.id,
        failedAt: new Date().toISOString()
      }
    })
    .eq('id', guest_pass_id);

  console.log('Identity verification requires input for guest pass:', guest_pass_id);
}

async function handleVerificationCanceled(session, supa) {
  const { guest_pass_id } = session.metadata;

  await supa
    .from('guest_passes')
    .update({
      status: 'verification_canceled',
      extended_data: {
        ...session.metadata,
        verificationStatus: 'canceled',
        verificationId: session.id,
        canceledAt: new Date().toISOString()
      }
    })
    .eq('id', guest_pass_id);

  console.log('Identity verification canceled for guest pass:', guest_pass_id);
}

export const dynamic = 'force-dynamic';
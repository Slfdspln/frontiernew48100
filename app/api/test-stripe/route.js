import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function GET() {
  try {
    console.log('Testing Stripe configuration...');
    console.log('STRIPE_SECRET_KEY exists:', !!process.env.STRIPE_SECRET_KEY);
    console.log('STRIPE_SECRET_KEY value:', process.env.STRIPE_SECRET_KEY?.substring(0, 20) + '...');
    
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ 
        ok: false, 
        error: 'STRIPE_SECRET_KEY environment variable not set' 
      }, { status: 500 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    
    // Test Stripe connection
    const testSession = await stripe.identity.verificationSessions.create({
      type: 'document',
      metadata: {
        test: 'true'
      },
      options: {
        document: {
          allowed_types: ['driving_license'],
          require_id_number: false,
          require_live_capture: false,
          require_matching_selfie: false
        }
      },
      return_url: 'https://example.com/test'
    });

    console.log('Stripe test successful, session ID:', testSession.id);

    return NextResponse.json({
      ok: true,
      message: 'Stripe connection successful',
      sessionId: testSession.id,
      stripeKeyType: process.env.STRIPE_SECRET_KEY.startsWith('rk_live') ? 'Restricted Live' : 
                    process.env.STRIPE_SECRET_KEY.startsWith('sk_live') ? 'Live' : 
                    process.env.STRIPE_SECRET_KEY.startsWith('sk_test') ? 'Test' : 'Unknown'
    });

  } catch (error) {
    console.error('Stripe test error:', error);
    return NextResponse.json({
      ok: false,
      error: error.message,
      type: error.type || 'unknown'
    }, { status: 500 });
  }
}
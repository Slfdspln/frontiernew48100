import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupa } from '@/utils/supabaseAdmin';
import { rl } from '@/utils/ratelimit';

export const dynamic = 'force-dynamic';

const StatusBody = z.object({
  sessionId: z.string(),
  passId: z.string()
});

export async function POST(req) {
  // Rate limiting
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const { success } = await rl.limit(`verification-status:${ip}`);
  if (!success) {
    return NextResponse.json({ ok: false, error: 'Too many requests' }, { status: 429 });
  }

  try {
    const { sessionId, passId } = StatusBody.parse(await req.json());
    
    const supa = getSupa();
    
    // Get guest pass status
    const { data: guestPass, error } = await supa
      .from('guest_passes')
      .select('*')
      .eq('id', passId)
      .single();

    if (error || !guestPass) {
      return NextResponse.json({ 
        ok: false, 
        error: 'Guest pass not found' 
      }, { status: 404 });
    }

    const status = guestPass.status;
    let message = '';
    let walletUrl = null;

    switch (status) {
      case 'pending_verification':
        message = 'Identity verification is in progress...';
        break;
      case 'approved':
        message = 'Identity verified successfully!';
        // Check if wallet URL already exists in extended_data
        walletUrl = guestPass.extended_data?.wallet_url;
        if (!walletUrl) {
          // Legacy fallback to direct Apple Wallet API
          walletUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/apple-wallet?passId=${passId}`;
        }
        break;
      case 'verification_failed':
        message = 'Identity verification failed. Please try again.';
        break;
      case 'verification_canceled':
        message = 'Identity verification was canceled.';
        break;
      default:
        message = 'Unknown verification status.';
    }

    return NextResponse.json({
      ok: true,
      status,
      message,
      walletUrl,
      passId: guestPass.id
    });

  } catch (error) {
    console.error('Verification status error:', error);
    return NextResponse.json({ 
      ok: false, 
      error: 'Failed to check verification status' 
    }, { status: 500 });
  }
}
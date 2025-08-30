import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { decodeProtectedHeader, jwtVerify } from 'jose';
import { getSupa } from '@/utils/supabaseAdmin';
import { getSigningKey } from '@/lib/qrKeys';
import { rl } from '@/utils/ratelimit';
import { checkCsrf } from '@/utils/csrf';
import { getSession } from '@/utils/session';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const VerifyQRBody = z.object({
  token: z.string()
});

export async function POST(req) {
  // Rate limiting
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const { success } = await rl.limit(`verify-qr:${ip}`);
  if (!success) return NextResponse.json({ ok: false, error: 'Too many requests' }, { status: 429 });

  // CSRF protection
  const cookieStore = await cookies();
  if (!checkCsrf(req, cookieStore)) {
    return NextResponse.json({ ok: false, error: 'CSRF' }, { status: 403 });
  }

  // Admin session check
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { token } = VerifyQRBody.parse(body);

    // Check if this is an enhanced QR code (Apple Wallet or web)
    let passId, jti;
    let isEnhancedQR = false;
    let enhancedQRData;
    
    try {
      // Try to parse as enhanced QR JSON first
      enhancedQRData = JSON.parse(token);
      if (enhancedQRData.passId && enhancedQRData.securityHash) {
        isEnhancedQR = true;
        passId = enhancedQRData.passId;
        jti = `enhanced-qr-${enhancedQRData.securityHash}-${Date.now()}`;
      }
    } catch {
      // Not enhanced QR JSON, continue with JWT verification
    }

    if (!isEnhancedQR) {
      // Original JWT verification logic
      const { kid } = decodeProtectedHeader(token);
      if (!kid) {
        return NextResponse.json({ ok: false, error: 'Missing kid' }, { status: 400 });
      }

      // Verify JWT with appropriate key
      let payload;
      try {
        ({ payload } = await jwtVerify(token, getSigningKey(String(kid)), {
          issuer: 'frontiertowerguest.com',
          audience: 'door-scanner'
        }));
      } catch {
        return NextResponse.json({ ok: false, error: 'Invalid/expired token' }, { status: 400 });
      }

      ({ passId, jti } = payload);
    } else {
      // For enhanced QR codes, verify security hash and expiration
      
      // Verify security hash
      const expectedHash = crypto
        .createHash('sha256')
        .update(`${enhancedQRData.passId}_${enhancedQRData.guestEmail}_${enhancedQRData.residentId}_${process.env.APPLE_WALLET_SECRET}`)
        .digest('hex')
        .substring(0, 16);
      
      if (expectedHash !== enhancedQRData.securityHash) {
        return NextResponse.json({ ok: false, error: 'Invalid security hash' }, { status: 400 });
      }
      
      // Check expiration
      if (enhancedQRData.validUntil) {
        const expirationDate = new Date(enhancedQRData.validUntil);
        if (new Date() > expirationDate) {
          return NextResponse.json({ ok: false, error: 'Pass expired' }, { status: 400 });
        }
      }
    }

    const supa = getSupa();

    // Check for replay (idempotency)
    const { data: seen } = await supa
      .from('used_qr_tokens')
      .select('*')
      .eq('pass_id', passId)
      .eq('jti', jti)
      .single();

    if (seen) {
      // Already used, return current pass status
      const { data: pass } = await supa
        .from('guest_passes')
        .select(`
          *,
          guests(*),
          residents(name)
        `)
        .eq('id', passId)
        .single();

      return NextResponse.json({ 
        ok: pass?.status === 'checked_in', 
        pass,
        message: pass?.status === 'checked_in' ? 'Already checked-in' : 'Token already used'
      });
    }

    // Get pass details
    const { data: pass } = await supa
      .from('guest_passes')
      .select(`
        *,
        guests(*),
        residents(name)
      `)
      .eq('id', passId)
      .single();

    if (!pass) {
      return NextResponse.json({ ok: false, error: 'Pass not found' }, { status: 404 });
    }

    // Business rules validation
    const today = new Date().toISOString().slice(0, 10);
    if (pass.visit_date !== today) {
      return NextResponse.json({ ok: false, error: 'Wrong day' }, { status: 400 });
    }

    if (pass.status !== 'scheduled') {
      return NextResponse.json({ ok: false, error: `Pass is ${pass.status}` }, { status: 400 });
    }

    // Atomic transaction: record token usage and update pass
    const { error } = await supa.rpc('check_in_guest', {
      p_pass_id: passId,
      p_jti: jti
    });

    if (error) {
      console.error('Check-in error:', error);
      return NextResponse.json({ ok: false, error: 'Check-in failed' }, { status: 500 });
    }

    // Get updated pass
    const { data: updatedPass } = await supa
      .from('guest_passes')
      .select(`
        *,
        guests(*),
        residents(name)
      `)
      .eq('id', passId)
      .single();

    return NextResponse.json({ 
      ok: true, 
      passId,
      pass: updatedPass
    });

  } catch (error) {
    console.error('QR verify error:', error);
    return NextResponse.json({ ok: false, error: 'Invalid input or server error' }, { status: 400 });
  }
}

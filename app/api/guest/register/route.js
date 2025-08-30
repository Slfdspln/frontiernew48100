import { NextResponse } from 'next/server';
import { z } from 'zod';
import { SignJWT } from 'jose';
import crypto from 'crypto';
import { getSupa } from '@/utils/supabaseAdmin';
import { getSession } from '@/utils/session';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const RegisterBody = z.object({
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  phoneNumber: z.string().min(10).max(20),
  floor: z.string().min(1).max(50),
  isDelivery: z.boolean().optional()
});

export async function POST(req) {
  // Session check
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { firstName, lastName, phoneNumber, floor, isDelivery } = RegisterBody.parse(await req.json());
    
    const supa = getSupa();

    // Get resident details
    const { data: resident } = await supa
      .from('residents')
      .select('name, email')
      .eq('id', session.residentId)
      .single();

    // Create verification token first (don't save to DB until successful)
    const guestName = `${firstName} ${lastName}`;

    // Create verification token with temporary pass ID (will be replaced when guest pass is created)
    const tokenNonce = crypto.randomUUID();
    const tempPassId = crypto.randomUUID(); // Temporary ID for the token
    const verificationToken = await new SignJWT({
      passId: tempPassId,
      hostId: session.residentId,
      firstName: firstName,
      lastName: lastName,
      phoneNumber: phoneNumber,
      floor: floor,
      isDelivery: isDelivery || false,
      nonce: tokenNonce,
      iat: Math.floor(Date.now() / 1000)
    })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('48h') // 48 hour expiry
    .setIssuer('frontiertowerguest.com')
    .setAudience('guest-verification')
    .sign(new TextEncoder().encode(process.env.SESSION_SECRET));

    // Generate verification link (use localhost for testing, production domain when deployed)
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? (process.env.NEXT_PUBLIC_APP_URL || 'https://frontiertowerguest.com')
      : 'http://localhost:3005';
    const verificationLink = `${baseUrl}/guest/verify?token=${verificationToken}`;

    // Now create the guest pass only after everything else is successful
    const { data: guestPass, error: guestPassError } = await supa
      .from('guest_passes')
      .insert({
        id: tempPassId, // Use the same ID from the token
        resident_id: session.residentId,
        guest_name: guestName,
        visit_date: new Date().toISOString().split('T')[0], // Today's date
        status: 'scheduled',
        extended_data: {
          firstName: firstName,
          lastName: lastName,
          phoneNumber: phoneNumber,
          floor: floor,
          isDelivery: isDelivery || false,
          residentName: resident?.name || 'Resident',
          residentEmail: resident?.email,
          createdAt: new Date().toISOString(),
          passType: isDelivery ? 'delivery' : 'guest_access',
          tokenNonce: tokenNonce
        }
      })
      .select()
      .single();

    if (guestPassError) {
      console.error('Failed to create guest pass:', guestPassError);
      return NextResponse.json({ ok: false, error: 'Failed to create guest pass' }, { status: 500 });
    }

    return NextResponse.json({ 
      ok: true, 
      passId: guestPass.id,
      verificationLink: verificationLink,
      guestName: guestName
    });

  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ ok: false, error: 'Invalid input or server error' }, { status: 400 });
  }
}
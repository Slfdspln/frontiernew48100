import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ ok: false, error: 'No token provided' }, { status: 400 });
    }

    // Verify token
    const { payload } = await jwtVerify(
      token, 
      new TextEncoder().encode(process.env.SESSION_SECRET),
      {
        issuer: 'frontiertowerguest.com',
        audience: 'guest-verification'
      }
    );

    return NextResponse.json({ 
      ok: true,
      firstName: payload.firstName,
      lastName: payload.lastName,
      phoneNumber: payload.phoneNumber,
      floor: payload.floor,
      isDelivery: payload.isDelivery || false,
      passId: payload.passId
    });

  } catch (error) {
    console.error('Token verification error:', error);
    
    if (error.code === 'ERR_JWT_EXPIRED') {
      return NextResponse.json({ ok: false, error: 'Verification link has expired' }, { status: 400 });
    }
    if (error.code === 'ERR_JWT_INVALID') {
      return NextResponse.json({ ok: false, error: 'Invalid verification link' }, { status: 400 });
    }
    
    return NextResponse.json({ ok: false, error: 'Invalid verification link' }, { status: 400 });
  }
}
import { NextResponse } from 'next/server';
import { getSupa } from '@/utils/supabaseAdmin';
import { rl } from '@/utils/ratelimit';
import { jwtVerify } from 'jose';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  
  if (!token) {
    return NextResponse.json({ 
      ok: false, 
      error: 'Token required' 
    }, { status: 400 });
  }

  // Rate limiting
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const { success } = await rl.limit(`invitation-data:${ip}`);
  if (!success) {
    return NextResponse.json({ 
      ok: false, 
      error: 'Too many requests' 
    }, { status: 429 });
  }

  try {
    // Decode the JWT token to get pass information
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(process.env.SESSION_SECRET),
      {
        issuer: 'frontiertowerguest.com',
        audience: 'guest-prereg'
      }
    );

    console.log('JWT payload:', payload);

    const supa = getSupa();
    
    // Get the guest pass using the passId from the JWT payload
    const { data: guestPass, error } = await supa
      .from('guest_passes')
      .select('*')
      .eq('id', payload.passId)
      .single();

    console.log('Guest pass query result:', { guestPass, error });

    if (error || !guestPass) {
      console.log('Guest pass not found, error:', error);
      return NextResponse.json({ 
        ok: false, 
        error: 'Invitation not found or expired' 
      }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      data: {
        ...guestPass,
        host_name: guestPass.extended_data?.hostName || guestPass.host_name || 'Resident'
      }
    });

  } catch (error) {
    console.error('Invitation data fetch error:', error);
    return NextResponse.json({ 
      ok: false, 
      error: 'Failed to load invitation data' 
    }, { status: 500 });
  }
}
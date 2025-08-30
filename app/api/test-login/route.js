import { NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { getSupa } from '@/utils/supabaseAdmin';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req) {
  try {
    const { email } = await req.json();
    
    const supa = getSupa();
    
    // Find or create a test resident
    let { data: resident, error } = await supa
      .from('residents')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !resident) {
      // Create test resident
      const { data: newResident, error: createError } = await supa
        .from('residents')
        .insert({
          email: email,
          name: 'Test Resident',
          role: 'USER'
        })
        .select()
        .single();

      if (createError) {
        console.error('Failed to create test resident:', createError);
        return NextResponse.json({ ok: false, error: 'Failed to create test resident' }, { status: 500 });
      }
      
      resident = newResident;
    }

    // Always ensure resident_auth record exists
    const { data: authRecord } = await supa
      .from('resident_auth')
      .select('*')
      .eq('resident_id', resident.id)
      .single();

    if (!authRecord) {
      const { error: authError } = await supa
        .from('resident_auth')
        .insert({
          resident_id: resident.id,
          frontier_user_id: 'test-user',
          frontier_access_token: 'test-token',
          frontier_refresh_token: 'test-refresh',
          is_resident: true,
          verified_at: new Date().toISOString()
        });
        
      if (authError) {
        console.error('Failed to create auth record:', authError);
        return NextResponse.json({ ok: false, error: 'Failed to create auth record' }, { status: 500 });
      }
    }

    // Create session token
    const sessionToken = await new SignJWT({
      residentId: resident.id,
      email: resident.email,
      name: resident.name,
      role: resident.role || 'USER',
      frontierUserId: 'test-user',
      iat: Math.floor(Date.now() / 1000)
    })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('24h')
    .setIssuer('frontiertowerguest.com')
    .setAudience('resident-session')
    .sign(new TextEncoder().encode(process.env.SESSION_SECRET));

    // Set session cookie
    const cookieStore = await cookies();
    cookieStore.set('session', sessionToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 24 * 60 * 60 // 24 hours
    });

    return NextResponse.json({ 
      ok: true, 
      resident: {
        id: resident.id,
        email: resident.email,
        name: resident.name
      }
    });

  } catch (error) {
    console.error('Test login error:', error);
    return NextResponse.json({ ok: false, error: 'Test login failed' }, { status: 500 });
  }
}
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    // Clear the session cookie
    const cookiesStore = await cookies();
    cookiesStore.set('session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0, // Expire immediately
      path: '/'
    });

    return NextResponse.json({ 
      ok: true, 
      message: 'Logged out successfully' 
    });

  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ ok: false, error: 'Logout failed' }, { status: 500 });
  }
}
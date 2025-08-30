import { NextResponse } from 'next/server';
import { getSession } from '@/utils/session';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });
    }

    return NextResponse.json({
      ok: true,
      id: session.residentId,
      email: session.email,
      name: session.name,
      role: session.role
    });

  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json({ ok: false, error: 'Invalid session' }, { status: 401 });
  }
}
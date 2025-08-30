import { NextResponse } from 'next/server';
import { issueCsrf } from '@/utils/csrf';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const token = issueCsrf();
  
  const response = NextResponse.json({ csrfToken: token });
  
  // Set CSRF token as httpOnly: false cookie so client can read it
  response.cookies.set('csrf', token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 // 24 hours
  });
  
  return response;
}

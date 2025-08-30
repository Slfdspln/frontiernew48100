import { NextResponse } from 'next/server';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(s=>s.trim().toLowerCase());

export function middleware(request) {
  // Temporarily disable all authentication checks for testing
  return NextResponse.next();
}

export const config = {
  matcher: []
};

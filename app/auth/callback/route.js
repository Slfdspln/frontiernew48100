// app/auth/callback/route.js
import { NextResponse } from 'next/server';

export async function GET(req) {
  // Nothing to do here; we use Frontier email-code auth now.
  const url = new URL('/login', req.url);
  return NextResponse.redirect(url);
}

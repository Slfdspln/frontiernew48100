import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { SignJWT } from 'jose';
import crypto from 'crypto';
import { getSupa } from '@/utils/supabaseAdmin';
import { Frontier } from '@/utils/frontierClient';
import { SMS } from '@/utils/smsService';
import { rl } from '@/utils/ratelimit';
import { checkCsrf } from '@/utils/csrf';
import { getSession } from '@/utils/session';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const InviteBody = z.object({
  guestEmail: z.string().email().min(5).max(100),
  guestPhone: z.string().regex(/^\+1\d{10}$/, 'Phone must be in format +1XXXXXXXXXX').optional(),
  guestName: z.string().min(1).max(100).optional(),
  visitDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  floor: z.string().min(1).max(50)
});

export async function POST(req) {
  // Rate limiting
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const { success } = await rl.limit(`invite:${ip}`);
  if (!success) return NextResponse.json({ ok: false, error: 'Too many requests' }, { status: 429 });

  // CSRF protection
  const cookieStore = await cookies();
  if (!checkCsrf(req, cookieStore)) {
    return NextResponse.json({ ok: false, error: 'CSRF' }, { status: 403 });
  }

  // Session check
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { guestEmail, guestPhone, guestName, visitDate, floor } = InviteBody.parse(await req.json());
    
    // Verify host is still a resident via Frontier
    const supa = getSupa();
    const { data: auth } = await supa
      .from('resident_auth')
      .select('frontier_access_token, frontier_refresh_token, is_resident')
      .eq('resident_id', session.residentId)
      .single();

    if (!auth?.is_resident) {
      return NextResponse.json({ ok: false, error: 'Not a verified resident' }, { status: 403 });
    }

    // Get resident details for the invitation
    const { data: resident } = await supa
      .from('residents')
      .select('name')
      .eq('id', session.residentId)
      .single();

    // Create guest pass directly with guest info (no separate guests table)
    const { data: guestPass, error: guestPassError } = await supa
      .from('guest_passes')
      .insert({
        resident_id: session.residentId,
        guest_name: guestName || guestEmail.split('@')[0],
        visit_date: visitDate,
        status: 'scheduled',
        extended_data: {
          guestEmail: guestEmail,
          guestPhone: guestPhone,
          guestName: guestName,
          hostName: req.body.extendedData?.hostName,
          hostPhone: req.body.extendedData?.hostPhone,
          hostEmail: req.body.extendedData?.hostEmail,
          visitDate: visitDate,
          visitDateFormatted: req.body.extendedData?.visitDateFormatted,
          purposeOfVisit: req.body.extendedData?.purposeOfVisit,
          floorAccess: req.body.extendedData?.floorAccess,
          specialEquipment: req.body.extendedData?.specialEquipment || 'None',
          specialInstructions: req.body.extendedData?.specialInstructions || 'None',
          createdAt: new Date().toISOString(),
          passType: 'guest_access'
        }
      })
      .select()
      .single();

    console.log('Guest pass result:', guestPass);
    console.log('Guest pass error:', guestPassError);

    if (!guestPass || guestPassError) {
      console.error('Failed to create guest pass:', guestPassError);
      return NextResponse.json({ ok: false, error: 'Failed to create guest pass' }, { status: 500 });
    }

    // Create pre-registration token (24 hour expiry) with unique nonce for security
    const tokenNonce = crypto.randomUUID(); // Unique identifier for this token
    const preRegToken = await new SignJWT({
      passId: guestPass.id,
      hostId: session.residentId,
      guestEmail: guestEmail,
      guestName: guestName,
      visitDate: visitDate,
      floor: floor,
      nonce: tokenNonce, // Unique nonce for this invitation
      iat: Math.floor(Date.now() / 1000) // Issued at time for additional uniqueness
    })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('24h')
    .setIssuer('frontiertowerguest.com')
    .setAudience('guest-prereg')
    .sign(new TextEncoder().encode(process.env.SESSION_SECRET));

    // Store the token nonce in the guest pass for validation
    await supa
      .from('guest_passes')
      .update({
        extended_data: {
          ...guestPass.extended_data,
          tokenNonce: tokenNonce
        }
      })
      .eq('id', guestPass.id);

    // Send invitation via SMS if phone provided, otherwise return link
    const completionLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/guest/complete?token=${preRegToken}`;

    if (guestPhone) {
      try {
        const smsResult = await SMS.sendGuestInvitation(
          guestPhone,
          guestName || guestEmail.split('@')[0],
          resident?.name || 'Your host',
          completionLink,
          new Date(visitDate).toLocaleDateString()
        );
        
        return NextResponse.json({ 
          ok: true, 
          passId: guestPass.id,
          method: 'sms',
          message: `SMS invitation sent to ${guestPhone}`,
          completionLink // Still return link as backup
        });
      } catch (smsError) {
        console.error('SMS invitation error:', smsError);
        // Fall back to returning the link if SMS fails
        return NextResponse.json({ 
          ok: true, 
          passId: guestPass.id,
          method: 'link',
          message: 'SMS failed, please share the completion link with your guest',
          completionLink
        });
      }
    } else {
      return NextResponse.json({ 
        ok: true, 
        passId: guestPass.id,
        method: 'link',
        completionLink
      });
    }

  } catch (error) {
    console.error('Invite error:', error);
    return NextResponse.json({ ok: false, error: 'Invalid input or server error' }, { status: 400 });
  }
}

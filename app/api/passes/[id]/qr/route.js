import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { randomUUID } from 'crypto';
import { getSupa } from '@/utils/supabaseAdmin';
import { ACTIVE_KID, getSigningKey } from '@/lib/qrKeys';

export const dynamic = 'force-dynamic';

export async function GET(req, { params }) {
  try {
    const { id } = params;
    const supa = getSupa();

    const { data: pass } = await supa
      .from('guest_passes')
      .select(`
        *,
        guests(*),
        residents(*)
      `)
      .eq('id', id)
      .single();

    if (!pass || pass.status !== 'scheduled') {
      return NextResponse.json({ ok: false, error: 'Pass not found or not scheduled' }, { status: 404 });
    }

    // Check if visit date is today or future
    const today = new Date().toISOString().slice(0, 10);
    if (pass.visit_date < today) {
      return NextResponse.json({ ok: false, error: 'Pass expired' }, { status: 400 });
    }

    // Set expiration to end of visit day
    const visitDate = new Date(pass.visit_date + 'T23:59:59Z');
    const exp = Math.floor(visitDate.getTime() / 1000);

    // Include all guest and visit information in QR code for admin verification
    const qrPayload = {
      // Core pass data
      passId: pass.id,
      guestId: pass.guest_id,
      hostId: pass.host_id,
      visitDate: pass.visit_date,
      
      // Guest information for verification
      guestInfo: {
        name: pass.guests?.first_name + ' ' + (pass.guests?.last_name || ''),
        email: pass.guests?.email,
        phone: pass.guests?.phone
      },
      
      // Host information
      hostInfo: {
        name: pass.residents?.name,
        email: pass.residents?.email,
        phone: pass.residents?.phone
      },
      
      // Visit details
      visitInfo: {
        date: pass.visit_date,
        dateFormatted: new Date(pass.visit_date).toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }),
        status: pass.status,
        floor: pass.floor || 'TBD',
        createdAt: pass.created_at
      },
      
      // Extended data from form (if stored in pass)
      ...(pass.extended_data ? JSON.parse(pass.extended_data) : {}),
      
      // JWT metadata
      jti: randomUUID(),
      iss: 'frontiertowerguest.com',
      aud: 'door-scanner',
      generatedAt: new Date().toISOString()
    };

    const token = await new SignJWT(qrPayload)
      .setProtectedHeader({ alg: 'HS256', kid: ACTIVE_KID })
      .setExpirationTime(exp)
      .sign(getSigningKey(ACTIVE_KID));

    return NextResponse.json({ 
      ok: true, 
      qr_data: token,
      token,
      // Also return readable info for display
      passInfo: {
        guestName: qrPayload.guestInfo.name,
        hostName: qrPayload.hostInfo.name,
        visitDate: qrPayload.visitInfo.dateFormatted,
        status: pass.status
      }
    });

  } catch (error) {
    console.error('QR generation error:', error);
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}

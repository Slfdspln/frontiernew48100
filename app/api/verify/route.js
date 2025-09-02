import { NextResponse } from 'next/server';
import { getSupa } from '@/utils/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const { token, passId } = await req.json();
    
    if (!token && !passId) {
      return NextResponse.json({ ok: false, error: 'Token or passId required' }, { status: 400 });
    }

    const supa = getSupa();
    
    // Find the pass
    const { data: guestPass, error } = await supa
      .from('guest_passes')
      .select('*')
      .eq('id', passId || token)
      .single();

    if (error || !guestPass) {
      return NextResponse.json({ ok: false, error: 'Pass not found' }, { status: 404 });
    }

    // Check if pass is valid
    const now = new Date();
    const expiresAt = new Date(guestPass.expires_at || guestPass.visit_date + 'T23:59:59');
    
    if (now > expiresAt) {
      return NextResponse.json({ ok: false, error: 'Pass has expired' }, { status: 400 });
    }

    if (guestPass.status !== 'approved') {
      return NextResponse.json({ ok: false, error: 'Pass is not approved' }, { status: 400 });
    }

    // Mark as checked in
    await supa
      .from('guest_passes')
      .update({ 
        status: 'checked_in',
        used_at: new Date().toISOString()
      })
      .eq('id', guestPass.id);

    return NextResponse.json({
      ok: true,
      guest: {
        name: guestPass.guest_name,
        code: guestPass.pass_code,
        visit_date: guestPass.visit_date,
        host_name: guestPass.host_name,
        unit_number: guestPass.unit_number
      },
      message: 'Access granted'
    });

  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json({ 
      ok: false, 
      error: 'Verification failed' 
    }, { status: 500 });
  }
}
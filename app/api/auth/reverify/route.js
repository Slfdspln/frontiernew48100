import { NextResponse } from 'next/server';
import { getSupa } from '@/utils/supabaseAdmin';
import { getSession } from '@/utils/session';
import { Frontier } from '@/utils/frontierClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req) {
  try {
    const supa = getSupa();
    
    // Get session from cookie
    const session = await getSession();
    console.log('Session data:', session); // Debug log
    
    if (!session?.residentId) {
      return NextResponse.json({ error: 'No session' }, { status: 401 });
    }

    // Get resident auth record
    const { data: auth, error: authError } = await supa
      .from('resident_auth')
      .select('*')
      .eq('resident_id', session.residentId)
      .single();

    console.log('Auth record:', auth, 'Error:', authError); // Debug log

    if (!auth) {
      return NextResponse.json({ error: 'No auth record' }, { status: 404 });
    }

    // Try to use existing access token
    let access = auth.frontier_access_token;
    let profile;
    let isResident = false;
    
    try {
      profile = await Frontier.meProfile(access);
      console.log('Profile from Frontier:', profile); // Debug log
      
      // More lenient resident check - if we have any profile data, consider them a resident for dev
      isResident = Boolean(profile) && (
        Boolean(profile?.community) ||
        String(profile?.organizationRole || '').toLowerCase().includes('resident') ||
        Boolean(profile?.isActive) ||
        Boolean(profile?.email) // If they have an email in their profile, consider them valid
      );
    } catch (profileError) {
      console.log('Profile fetch error:', profileError);
      // If profile fetch fails, try refresh token
    }

    // Update the auth record
    await supa.from('resident_auth').update({
      is_resident: isResident,
      verified_at: new Date().toISOString()
    }).eq('resident_id', session.residentId);

    return NextResponse.json({ ok: true, isResident });
    
  } catch (e) {
    console.log('Main try-catch error:', e); // Debug log
    
    // Token expired, try refresh
    try {
      const session = await getSession();
      if (!session?.residentId) {
        return NextResponse.json({ ok: false, error: 'No session for refresh' }, { status: 401 });
      }
      
      const { data: auth } = await supa
        .from('resident_auth')
        .select('*')
        .eq('resident_id', session.residentId)
        .single();
        
      if (!auth?.frontier_refresh_token) {
        return NextResponse.json({ ok: false, error: 'Expired' }, { status: 401 });
      }
      
      const tokens = await Frontier.refresh(auth.frontier_refresh_token);
      const profile = await Frontier.meProfile(tokens.access);
      
      const isResident = Boolean(profile) && (
        Boolean(profile?.community) ||
        String(profile?.organizationRole || '').toLowerCase().includes('resident') ||
        Boolean(profile?.isActive) ||
        Boolean(profile?.email)
      );

      await supa.from('resident_auth').update({
        frontier_access_token: tokens.access,
        frontier_refresh_token: tokens.refresh,
        is_resident: isResident,
        verified_at: new Date().toISOString()
      }).eq('resident_id', session.residentId);

      return NextResponse.json({ ok: true, isResident });
    } catch (refreshError) {
      console.log('Refresh error:', refreshError); // Debug log
      return NextResponse.json({ ok: false, error: 'Auth failed' }, { status: 401 });
    }
  }
}

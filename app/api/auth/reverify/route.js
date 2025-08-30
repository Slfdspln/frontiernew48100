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
    const sessionId = await getSession();
    if (!sessionId) {
      return NextResponse.json({ error: 'No session' }, { status: 401 });
    }

    // Get resident auth record
    const { data: auth } = await supa
      .from('resident_auth')
      .select('*')
      .eq('resident_id', sessionId)
      .single();

    if (!auth) {
      return NextResponse.json({ error: 'No auth record' }, { status: 404 });
    }

    // Try to use existing access token
    let access = auth.frontier_access_token;
    const profile = await Frontier.meProfile(access);
    
    const isResident =
      Boolean(profile?.community) ||
      String(profile?.organizationRole || '').toLowerCase().includes('resident') ||
      Boolean(profile?.isActive);

    await supa.from('resident_auth').update({
      is_resident: isResident,
      verified_at: new Date().toISOString()
    }).eq('resident_id', sessionId);

    return NextResponse.json({ ok: true, isResident });
  } catch (e) {
    // Token expired, try refresh
    try {
      if (!auth.frontier_refresh_token) {
        return NextResponse.json({ ok: false, error: 'Expired' }, { status: 401 });
      }
      
      const tokens = await Frontier.refresh(auth.frontier_refresh_token);
      const profile = await Frontier.meProfile(tokens.access);
      
      const isResident =
        Boolean(profile?.community) ||
        String(profile?.organizationRole || '').toLowerCase().includes('resident') ||
        Boolean(profile?.isActive);

      await supa.from('resident_auth').update({
        frontier_access_token: tokens.access,
        frontier_refresh_token: tokens.refresh,
        is_resident: isResident,
        verified_at: new Date().toISOString()
      }).eq('resident_id', sessionId);

      return NextResponse.json({ ok: true, isResident });
    } catch (refreshError) {
      return NextResponse.json({ ok: false, error: 'Auth failed' }, { status: 401 });
    }
  }
}

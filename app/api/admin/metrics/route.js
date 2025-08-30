import { NextResponse } from 'next/server';
import { getSupa } from '@/utils/supabaseAdmin';

export const dynamic = 'force-dynamic';

function startOfDay(d=new Date()){ return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function endOfDay(d=new Date()){ return new Date(d.getFullYear(), d.getMonth(), d.getDate()+1); }

export async function GET() {
  try {
    const supa = getSupa();
    
    // Get current time for filtering
    const s = startOfDay(); 
    const e = endOfDay();
    
    // Count guest passes currently in building (checked in but not checked out)
    const { count: inBuilding } = await supa
      .from('guest_passes')
      .select('*', { count: 'exact', head: true })
      .is('checked_out_at', null)
      .eq('status', 'checked_in')
      .gte('checked_in_at', s.toISOString());

    // Count guest passes checked in today
    const { count: checkedInToday } = await supa
      .from('guest_passes')
      .select('*', { count: 'exact', head: true })
      .gte('checked_in_at', s.toISOString())
      .lt('checked_in_at', e.toISOString());

    // Count guest passes scheduled for today
    const { count: scheduledToday } = await supa
      .from('guest_passes')
      .select('*', { count: 'exact', head: true })
      .in('status', ['approved', 'scheduled'])
      .gte('visit_date', s.toISOString().slice(0,10))
      .lt('visit_date', e.toISOString().slice(0,10));

    // Count total guest passes ever created
    const { count: totalPasses } = await supa
      .from('guest_passes')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({ 
      inBuilding: inBuilding ?? 0, 
      checkedInToday: checkedInToday ?? 0, 
      scheduledToday: scheduledToday ?? 0,
      totalPasses: totalPasses ?? 0
    });
  } catch (error) {
    console.error('Admin metrics error:', error);
    return NextResponse.json({ error: 'Failed to retrieve metrics' }, { status: 500 });
  }
}

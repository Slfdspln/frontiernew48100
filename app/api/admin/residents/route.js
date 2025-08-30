import { NextResponse } from 'next/server';
import { getSupa } from '@/utils/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supa = getSupa();
    
    // Get residents with their guest pass statistics
    const { data: residents, error } = await supa
      .from('residents')
      .select(`
        id,
        name,
        email,
        apartment,
        created_at,
        updated_at
      `)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching residents:', error);
      return NextResponse.json({ error: 'Failed to fetch residents', details: error.message }, { status: 500 });
    }

    if (!residents) {
      return NextResponse.json([]);
    }

    // Get guest pass statistics for each resident
    const residentsWithStats = await Promise.all(
      residents.map(async (resident) => {
        // Count total passes created by this resident
        const { count: totalPasses } = await supa
          .from('guest_passes')
          .select('*', { count: 'exact', head: true })
          .eq('resident_id', resident.id);

        // Count active passes (approved, scheduled, checked_in)
        const { count: activePasses } = await supa
          .from('guest_passes')
          .select('*', { count: 'exact', head: true })
          .eq('resident_id', resident.id)
          .in('status', ['approved', 'scheduled', 'checked_in']);

        // Get most recent guest pass activity
        const { data: recentActivity } = await supa
          .from('guest_passes')
          .select('created_at')
          .eq('resident_id', resident.id)
          .order('created_at', { ascending: false })
          .limit(1);

        return {
          id: resident.id,
          name: resident.name,
          email: resident.email,
          apartment: resident.apartment,
          total_passes: totalPasses || 0,
          active_passes: activePasses || 0,
          last_activity: recentActivity?.[0]?.created_at || resident.created_at,
          created_at: resident.created_at,
          updated_at: resident.updated_at
        };
      })
    );

    return NextResponse.json(residentsWithStats);
  } catch (error) {
    console.error('Admin residents error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { getSupa } from '@/utils/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supa = getSupa();
    
    // Get all guest passes with resident information
    const { data: guestPasses, error } = await supa
      .from('guest_passes')
      .select(`
        id,
        guest_name,
        email,
        status,
        visit_date,
        created_at,
        checked_in_at,
        checked_out_at,
        notes,
        residents!inner(
          name,
          apartment
        )
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching guest passes:', error);
      return NextResponse.json({ error: 'Failed to fetch guest passes', details: error.message }, { status: 500 });
    }

    if (!guestPasses) {
      return NextResponse.json([]);
    }

    // Transform the data to flatten resident information
    const transformedPasses = guestPasses.map(pass => ({
      id: pass.id,
      guest_name: pass.guest_name,
      email: pass.email,
      status: pass.status,
      visit_date: pass.visit_date,
      created_at: pass.created_at,
      checked_in_at: pass.checked_in_at,
      checked_out_at: pass.checked_out_at,
      notes: pass.notes,
      resident_name: pass.residents?.name || 'Unknown',
      resident_apartment: pass.residents?.apartment || 'N/A'
    }));

    return NextResponse.json(transformedPasses);
  } catch (error) {
    console.error('Admin guest passes error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

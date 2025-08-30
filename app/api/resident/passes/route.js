import { NextResponse } from 'next/server';
import { getSupa } from '@/utils/supabaseAdmin';
import { getSession } from '@/utils/session';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req) {
  // Session check
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supa = getSupa();

    const { data: passes, error } = await supa
      .from('guest_passes')
      .select(`
        *,
        guests(id, first_name, last_name, email, phone)
      `)
      .eq('host_id', session.residentId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Passes fetch error:', error);
      return NextResponse.json({ ok: false, error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json(passes || []);

  } catch (error) {
    console.error('Resident passes error:', error);
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}

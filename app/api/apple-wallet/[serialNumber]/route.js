import { NextResponse } from 'next/server';
import { getSupa } from '@/utils/supabaseAdmin';

export async function GET(request, { params }) {
  try {
    const { serialNumber } = params;
    const authToken = request.headers.get('authorization')?.replace('ApplePass ', '');
    
    const supabase = getSupa();
    const { data: guestPass } = await supabase
      .from('guest_passes')
      .select('*')
      .eq('id', serialNumber)
      .single();
    
    if (!guestPass || guestPass.status === 'cancelled') {
      return NextResponse.json({ error: 'Pass not found or cancelled' }, { status: 404 });
    }
    
    return new NextResponse(null, { status: 304 });
  } catch (error) {
    console.error('Pass update check error:', error);
    return NextResponse.json({ error: 'Failed to check pass status' }, { status: 500 });
  }
}
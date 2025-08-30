import { NextResponse } from 'next/server';
import { getSupa } from '@/utils/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supa = getSupa();
    
    // Get recent guest pass activities (last 50 activities)
    const { data: recentPasses, error } = await supa
      .from('guest_passes')
      .select(`
        id,
        guest_name,
        status,
        created_at,
        checked_in_at,
        checked_out_at,
        visit_date,
        residents (
          name
        )
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Recent activity error:', error);
      return NextResponse.json({ error: 'Failed to retrieve recent activity' }, { status: 500 });
    }

    // Transform data into activity events
    const activities = [];
    
    recentPasses?.forEach(pass => {
      const hostName = pass.residents?.name || 'Unknown Host';
      
      // Add check-out events
      if (pass.checked_out_at) {
        activities.push({
          id: `${pass.id}_checkout`,
          type: 'check_out',
          message: 'Guest checked out',
          guestName: pass.guest_name,
          hostName: hostName,
          timestamp: pass.checked_out_at,
          status: 'completed'
        });
      }
      
      // Add check-in events
      if (pass.checked_in_at) {
        activities.push({
          id: `${pass.id}_checkin`,
          type: 'check_in',
          message: 'Guest checked in',
          guestName: pass.guest_name,
          hostName: hostName,
          timestamp: pass.checked_in_at,
          status: 'active'
        });
      }
      
      // Add creation events
      activities.push({
        id: `${pass.id}_created`,
        type: 'created',
        message: 'New pass created',
        guestName: pass.guest_name,
        hostName: hostName,
        timestamp: pass.created_at,
        status: 'created'
      });
    });

    // Sort by timestamp and take the most recent 10
    const sortedActivities = activities
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 10);

    return NextResponse.json({ 
      activities: sortedActivities,
      total: activities.length
    });
  } catch (error) {
    console.error('Recent activity error:', error);
    return NextResponse.json({ error: 'Failed to retrieve recent activity' }, { status: 500 });
  }
}
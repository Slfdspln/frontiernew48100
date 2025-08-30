import { NextResponse } from 'next/server';
import { Frontier } from '../../../../utils/frontierClient';

export async function GET() {
  try {
    console.log('Attempting to fetch real user data from multiple endpoints...');
    const realUsers = [];
    let userId = 1;

    // Try multiple approaches to get more real user data
    let userDataSources = [];

    // 1. Try X-API-Key /auth/users/me/ endpoint (from documentation)
    try {
      console.log('Trying X-API-Key /auth/users/me/...');
      const meData = await Frontier.getMeWithXApiKey();
      console.log('Success with /auth/users/me/:', meData);
      if (meData) {
        userDataSources.push({ source: '/auth/users/me/', data: meData });
      }
    } catch (error) {
      console.log('X-API-Key /auth/users/me/ failed:', error.message);
    }

    // 2. Try X-API-Key /auth/users/ endpoint
    try {
      console.log('Trying X-API-Key /auth/users/...');
      const usersData = await Frontier.getUsersWithXApiKey();
      console.log('Success with /auth/users/:', usersData);
      if (usersData) {
        userDataSources.push({ source: '/auth/users/', data: usersData });
      }
    } catch (error) {
      console.log('X-API-Key /auth/users/ failed:', error.message);
    }

    // 3. Try X-API-Key /auth/profiles/ endpoint
    try {
      console.log('Trying X-API-Key /auth/profiles/...');
      const profilesData = await Frontier.getProfilesWithXApiKey();
      console.log('Success with /auth/profiles/:', profilesData);
      if (profilesData) {
        userDataSources.push({ source: '/auth/profiles/', data: profilesData });
      }
    } catch (error) {
      console.log('X-API-Key /auth/profiles/ failed:', error.message);
    }

    // 4. Get community data (we know this works)
    try {
      console.log('Trying /communities/...');
      const communities = await Frontier.getAllCommunities();
      console.log('Success with /communities/, found', communities?.results?.length || 0, 'communities');
      if (communities?.results) {
        userDataSources.push({ source: '/communities/', data: communities });
      }
    } catch (error) {
      console.log('/communities/ failed:', error.message);
    }

    // Process all successful data sources
    userDataSources.forEach(({ source, data }) => {
      if (source === '/auth/users/me/' && data) {
        // Single user data
        realUsers.push({
          id: userId++,
          name: data.full_name || `${data.first_name || ''} ${data.last_name || ''}`.trim() || data.username || data.email,
          email: data.email,
          unit_number: data.unit_number || 'N/A',
          is_active: data.is_active !== undefined ? data.is_active : true,
          monthly_guest_count: 0,
          created_at: data.date_joined || data.created_at || new Date().toISOString(),
          phone: data.phone_number || data.phone || 'N/A',
          frontier_user_id: data.id?.toString() || data.user_id?.toString(),
          community: data.community_name || 'N/A',
          role: 'API User',
          data_source: 'X-API-Key /auth/users/me/'
        });
      } else if (source === '/auth/users/' && data?.results) {
        // Multiple users data
        data.results.forEach(user => {
          realUsers.push({
            id: userId++,
            name: user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || user.email,
            email: user.email,
            unit_number: user.unit_number || 'N/A',
            is_active: user.is_active !== undefined ? user.is_active : true,
            monthly_guest_count: 0,
            created_at: user.date_joined || user.created_at || new Date().toISOString(),
            phone: user.phone_number || user.phone || 'N/A',
            frontier_user_id: user.id?.toString(),
            community: user.community_name || 'N/A',
            role: 'Registered User',
            data_source: 'X-API-Key /auth/users/'
          });
        });
      } else if (source === '/auth/profiles/' && data?.results) {
        // Profile data
        data.results.forEach(profile => {
          realUsers.push({
            id: userId++,
            name: profile.display_name || profile.full_name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
            email: profile.email || profile.user?.email,
            unit_number: profile.unit_number || 'N/A',
            is_active: true,
            monthly_guest_count: 0,
            created_at: profile.created_at || new Date().toISOString(),
            phone: profile.phone_number || profile.phone || 'N/A',
            frontier_user_id: profile.user?.id?.toString() || profile.id?.toString(),
            community: profile.community_name || 'N/A',
            role: 'Profile User',
            profile_image: profile.avatar || profile.profile_image,
            data_source: 'X-API-Key /auth/profiles/'
          });
        });
      } else if (source === '/communities/' && data?.results) {
        // Community data (existing logic)
        data.results.forEach(community => {
          // Add main lead (REAL USER)
          if (community.mainLead) {
            realUsers.push({
              id: userId++,
              name: `${community.mainLead.firstName} ${community.mainLead.lastName}`,
              email: community.mainLead.email,
              unit_number: `Community Lead`,
              is_active: true,
              monthly_guest_count: 0,
              created_at: new Date().toISOString(),
              phone: 'N/A',
              frontier_user_id: community.mainLead.id.toString(),
              community: community.name,
              role: 'Community Lead',
              data_source: 'Communities API'
            });
          }
          
          // Add contacts (REAL USERS)
          [community.contact1, community.contact2, community.contact3].forEach((contact, idx) => {
            if (contact?.fullName) {
              realUsers.push({
                id: userId++,
                name: contact.fullName,
                email: contact.calendarUrl || 'N/A',
                unit_number: contact.role || 'Community Contact',
                is_active: true,
                monthly_guest_count: 0,
                created_at: new Date().toISOString(),
                phone: contact.calendarUrl ? 'Calendar Available' : 'N/A',
                frontier_user_id: `contact_${community.id}_${idx + 1}`,
                community: community.name,
                role: contact.role || 'Community Contact',
                profile_image: contact.image,
                data_source: 'Communities API'
              });
            }
          });
        });
      }
    });

    // Return only real users - no fallback to mock data
    if (realUsers.length === 0) {
      return NextResponse.json({ 
        error: 'No real users found in any Frontier API endpoint',
        message: 'Could not extract any real user data from any available endpoints',
        attempted_sources: userDataSources.map(s => s.source)
      }, { status: 404 });
    }

    // Remove duplicates based on email or frontier_user_id
    const uniqueUsers = realUsers.filter((user, index, self) => 
      index === self.findIndex(u => 
        u.email === user.email || 
        (u.frontier_user_id && u.frontier_user_id === user.frontier_user_id)
      )
    );

    // Sort by data source, then by name
    uniqueUsers.sort((a, b) => {
      if (a.data_source === b.data_source) {
        return a.name.localeCompare(b.name);
      }
      return a.data_source.localeCompare(b.data_source);
    });

    console.log(`Successfully extracted ${uniqueUsers.length} real users from ${userDataSources.length} data sources`);
    
    return NextResponse.json(uniqueUsers);
  } catch (error) {
    console.error('Failed to fetch real user data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch real user data from Frontier API' }, 
      { status: 500 }
    );
  }
}
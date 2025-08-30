// utils/supabaseBrowser.js
import { createClient } from '@supabase/supabase-js';

let client;

export function getBrowserSupabase() {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  // During build time, environment variables might not be available
  // Return a mock client to prevent build failures
  if (!url || !anon) {
    if (typeof window === 'undefined') {
      // Server-side during build - return minimal mock
      return {
        auth: {
          getSession: () => Promise.resolve({ data: { session: null }, error: null })
        }
      };
    } else {
      // Client-side - throw error as expected
      throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL/ANON_KEY');
    }
  }
  
  client = createClient(url, anon);
  return client;
}

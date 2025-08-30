import { createClient } from '@supabase/supabase-js';

let client = null;

export function getSupa() {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.warn('Supabase env vars missing - using mock client for development');
    // Return a mock client that returns empty arrays for development
    return {
      from: () => ({
        select: () => ({
          order: () => ({
            limit: () => Promise.resolve({ data: [], error: null }),
            eq: () => Promise.resolve({ data: [], error: null }),
            in: () => Promise.resolve({ data: [], error: null })
          }),
          eq: () => Promise.resolve({ data: [], error: null, count: 0 }),
          in: () => Promise.resolve({ data: [], error: null, count: 0 }),
          is: () => ({
            eq: () => ({
              gte: () => Promise.resolve({ data: [], error: null, count: 0 })
            })
          }),
          gte: () => Promise.resolve({ data: [], error: null, count: 0 })
        })
      })
    };
  }

  client = createClient(url, key, {
    auth: { persistSession: false },
    global: { fetch },
  });
  return client;
}

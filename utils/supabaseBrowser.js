// utils/supabaseBrowser.js
import { createClient } from '@supabase/supabase-js';

let client;

export function getBrowserSupabase() {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL/ANON_KEY');
  client = createClient(url, anon);
  return client;
}

// Legacy file - use getBrowserSupabase() from supabaseBrowser.js instead
import { getBrowserSupabase } from './supabaseBrowser';

// Export for backward compatibility
export const supabase = getBrowserSupabase();

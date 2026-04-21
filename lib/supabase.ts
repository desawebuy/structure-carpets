import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient | null {
  if (typeof window === 'undefined') return null;
  
  if (supabaseInstance) return supabaseInstance;
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  
  const isValidUrl = supabaseUrl.startsWith('http://') || supabaseUrl.startsWith('https://');
  
  if (supabaseUrl && supabaseKey && isValidUrl) {
    supabaseInstance = createClient(supabaseUrl, supabaseKey);
    return supabaseInstance;
  }
  
  return null;
}

export const supabase = {
  get client() {
    return getSupabaseClient();
  }
};

export type { SupabaseClient } from '@supabase/supabase-js';
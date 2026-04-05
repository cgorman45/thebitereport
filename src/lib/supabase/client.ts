import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _supabase: SupabaseClient | null = null;

// Browser-side Supabase client singleton.
// Lazily initialized to avoid build-time errors when env vars aren't set.
export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    _supabase = createClient(supabaseUrl, supabaseAnonKey);
  }
  return _supabase;
}

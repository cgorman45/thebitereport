import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _supabaseAdmin: SupabaseClient | null = null;

// Server-side client with service role — bypasses RLS.
// Only use in API routes and cron jobs, never in client code.
// Lazily initialized to avoid build-time errors when env vars aren't set.
export function getSupabaseAdmin(): SupabaseClient {
  if (!_supabaseAdmin) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    _supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
  }
  return _supabaseAdmin;
}

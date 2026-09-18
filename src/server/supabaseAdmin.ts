import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
// Modern secret API key with fallback to service role key
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

let cachedAdminClient: SupabaseClient | null = null;

/**
 * Returns the privileged Supabase Admin client with service-role access.
 * Strictly server-side only. Bypasses RLS for secure background tasks,
 * transactional rollups, and administrative authorization checks.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (!cachedAdminClient) {
    if (!supabaseUrl || !supabaseSecretKey) {
      console.warn(
        '[Supabase Admin] Warning: SUPABASE_URL or SUPABASE_SECRET_KEY is not defined in environment.'
      );
    }
    cachedAdminClient = createClient(
      supabaseUrl || 'https://placeholder.supabase.co',
      supabaseSecretKey || 'placeholder-secret-key',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  }
  return cachedAdminClient;
}

export const supabaseAdmin = getSupabaseAdmin();

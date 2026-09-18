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
    const validUrl =
      supabaseUrl && (supabaseUrl.startsWith('http://') || supabaseUrl.startsWith('https://'))
        ? supabaseUrl
        : 'https://placeholder.supabase.co';
    const validKey = supabaseSecretKey || 'placeholder-secret-key';

    cachedAdminClient = createClient(
      validUrl,
      validKey,
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

export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(target, prop, receiver) {
    const client = getSupabaseAdmin();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});


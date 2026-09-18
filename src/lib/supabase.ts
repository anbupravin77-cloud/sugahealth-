import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
// Prefer modern Supabase publishable key naming with fallback to legacy anon key
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabasePublishableKey) {
  // Only warn in dev mode to assist developer configuration without throwing unhandled exceptions
  if (import.meta.env.DEV) {
    console.warn(
      '[Supabase Client] Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY. Supabase client initialized in standby mode.'
    );
  }
}

/**
 * Browser-safe Supabase Client.
 * Uses only public/publishable credentials.
 * NEVER import or expose service-role or secret keys in this file.
 */
export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabasePublishableKey || 'placeholder-publishable-key', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

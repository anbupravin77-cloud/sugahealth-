/**
 * Controls whether the isolated Supabase Auth test environment and /auth-test route are accessible.
 * In production, it is strictly disabled unless VITE_ENABLE_AUTH_TEST='true' is configured.
 */
export const isAuthTestEnabled = (): boolean => {
  return import.meta.env.DEV || import.meta.env.VITE_ENABLE_AUTH_TEST === 'true';
};

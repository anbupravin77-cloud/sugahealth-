/**
 * Controls whether the isolated Supabase Auth test environment and /auth-test route are accessible.
 * In production, it is strictly disabled unless VITE_AUTH_TEST_ENABLED='true' or VITE_ENABLE_AUTH_TEST='true'.
 */
export const isAuthTestEnabled = (): boolean => {
  const isExplicitlyEnabled =
    import.meta.env.VITE_AUTH_TEST_ENABLED === 'true' ||
    import.meta.env.VITE_ENABLE_AUTH_TEST === 'true';

  if (import.meta.env.PROD || import.meta.env.VITE_VERCEL_ENV === 'production') {
    return isExplicitlyEnabled;
  }

  return import.meta.env.DEV || isExplicitlyEnabled;
};

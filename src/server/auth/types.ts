export type UserRole = 'patient' | 'doctor' | 'pharmacist' | 'admin';

export type AuthProvider = 'firebase' | 'supabase';

/**
 * Normalized authenticated user shape across both Firebase ID tokens (current)
 * and Supabase access tokens (target).
 */
export interface AuthenticatedUser {
  /** Unique user identifier (Firebase UID or Supabase UUID) */
  uid: string;
  /** Primary contact email */
  email?: string;
  /** Server-verified role (never from client or email domain heuristics) */
  role: UserRole;
  /** Active authentication authority */
  authProvider: AuthProvider;
  /** Raw decoded Firebase token (if authProvider === 'firebase') */
  firebaseToken?: any;
  /** Raw Supabase user object (if authProvider === 'supabase') */
  supabaseUser?: any;
}

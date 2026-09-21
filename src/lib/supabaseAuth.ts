import { supabase } from './supabase';
import type { Session, User, AuthChangeEvent } from '@supabase/supabase-js';

export interface SupabaseAuthCredentials {
  email: string;
  password: string;
}

export interface SupabaseUserProfile {
  id: string;
  email: string;
  role: 'patient' | 'doctor' | 'pharmacist' | 'admin';
  first_name?: string;
  last_name?: string;
  display_name?: string;
  phone_number?: string;
  created_at?: string;
}

/**
 * Sign up a new user with email and password.
 * Always defaults to 'patient' role on client side.
 * Staff/admin roles cannot be granted via client signup.
 */
export async function signUpWithEmail(credentials: SupabaseAuthCredentials, metadata?: { firstName?: string; lastName?: string; displayName?: string }) {
  const { data, error } = await supabase.auth.signUp({
    email: credentials.email.trim().toLowerCase(),
    password: credentials.password,
    options: {
      data: {
        first_name: metadata?.firstName || '',
        last_name: metadata?.lastName || '',
        display_name: metadata?.displayName || `${metadata?.firstName || ''} ${metadata?.lastName || ''}`.trim() || credentials.email.split('@')[0],
      },
      emailRedirectTo: `${window.location.origin}/login`,
    },
  });

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Sign in existing user with email and password.
 */
export async function signInWithEmail(credentials: SupabaseAuthCredentials) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: credentials.email.trim().toLowerCase(),
    password: credentials.password,
  });

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Sign out current active session from Supabase.
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
}

/**
 * Retrieve current active session from local client cache.
 */
export async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.warn('[SupabaseAuth] getSession error:', error.message);
    return null;
  }
  return data.session;
}

/**
 * Retrieve current user from Supabase auth authority.
 */
export async function getUser(): Promise<User | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    return null;
  }
  return data.user;
}

/**
 * Listen for authentication state transitions.
 */
export function onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
  return subscription;
}

/**
 * Initiate password reset email flow.
 */
export async function resetPasswordForEmail(email: string, redirectTo?: string) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: redirectTo || `${window.location.origin}/auth-test`,
  });

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Prepare Google OAuth sign-in flow.
 * Note: Requires Google OAuth client configured in Supabase dashboard.
 * Defaults redirect to current window origin.
 */
export async function signInWithGoogle(redirectTo?: string) {
  const targetUrl = redirectTo || `${window.location.origin}/`;
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: targetUrl,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Server-authenticated doctor login helper.
 * Validates doctor credentials and server-side role assignment.
 */
export async function signInWithDoctorCredentials(credentials: SupabaseAuthCredentials) {
  const response = await fetch('/api/auth/doctor-login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: credentials.email.trim().toLowerCase(),
      password: credentials.password,
    }),
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Invalid clinical credentials');
  }

  // If a session was returned from server, set it in the client Supabase instance
  if (data.session) {
    await supabase.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
  }

  return data;
}

/**
 * Client-safe profile bootstrap call.
 * Calls server endpoint /api/auth/bootstrap-profile using user's access token.
 * The server verifies the token and creates public.profiles with role = 'patient'.
 */
export async function bootstrapProfile(accessToken: string, metadata?: { firstName?: string; lastName?: string }): Promise<SupabaseUserProfile> {
  const response = await fetch('/api/auth/bootstrap-profile', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      firstName: metadata?.firstName,
      lastName: metadata?.lastName,
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({ error: 'Failed to bootstrap profile' }));
    throw new Error(errData.error || `Failed to bootstrap profile (HTTP ${response.status})`);
  }

  const result = await response.json();
  return result.profile;
}

/**
 * Fetch current user profile from server.
 */
export async function fetchCurrentProfile(accessToken: string): Promise<SupabaseUserProfile | null> {
  const response = await fetch('/api/auth/me', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    return null;
  }

  const result = await response.json();
  return result.profile;
}
import { UserRole } from './types';
import { adminDb } from '../firebaseAdmin';
import { supabaseAdmin } from '../supabaseAdmin';

const VALID_ROLES: ReadonlySet<UserRole> = new Set(['patient', 'doctor', 'pharmacist', 'admin']);

/**
 * Validates whether a given string is an authentic UserRole.
 */
export function isValidRole(role: unknown): role is UserRole {
  return typeof role === 'string' && VALID_ROLES.has(role as UserRole);
}

/**
 * Resolves the verified role for a Firebase-authenticated user.
 *
 * CRITICAL SECURITY DIRECTIVE:
 * Never infer roles from email patterns or domains (e.g., '@sugahealth.com').
 * Role must come strictly from:
 * 1. Verified custom token claims set by admin (`decodedToken.role`)
 * 2. Trusted server database document (`staff_profiles` or `users`)
 * 3. Default fallback: 'patient'
 */
export async function resolveFirebaseUserRole(decodedToken: any): Promise<UserRole> {
  if (!decodedToken) return 'patient';

  // 1. Check verified custom token claims (cryptographically signed by Firebase Admin)
  if (decodedToken.role && isValidRole(decodedToken.role)) {
    return decodedToken.role;
  }
  if (decodedToken.admin === true) {
    return 'admin';
  }

  const uid = decodedToken.uid;
  if (!uid) return 'patient';

  // 2. Query server-controlled database records
  try {
    // Check staff_profiles first (contains active doctors, pharmacists, admins)
    const staffDoc = await adminDb.collection('staff_profiles').doc(uid).get();
    if (staffDoc.exists) {
      const data = staffDoc.data();
      if (data?.active !== false && isValidRole(data?.role)) {
        return data.role;
      }
    }

    // Check users collection
    const userDoc = await adminDb.collection('users').doc(uid).get();
    if (userDoc.exists) {
      const data = userDoc.data();
      if (isValidRole(data?.role)) {
        return data.role;
      }
    }
  } catch (err: any) {
    console.warn(`[RoleResolution] Failed to query Firestore profile for uid ${uid}:`, err.message);
  }

  // 3. Fallback safely to least-privileged role
  return 'patient';
}

/**
 * Resolves the verified role for a Supabase-authenticated user.
 *
 * Checks:
 * 1. Supabase app_metadata.role (signed in user JWT, cannot be tampered by client)
 * 2. Supabase public.staff_profiles / public.profiles via privileged admin client
 * 3. Fallback to 'patient'
 */
export async function resolveSupabaseUserRole(supabaseUser: any): Promise<UserRole> {
  if (!supabaseUser) return 'patient';

  // 1. Check server-set app_metadata (tamper-proof JWT claim)
  const appRole = supabaseUser.app_metadata?.role;
  if (isValidRole(appRole)) {
    return appRole;
  }

  const userId = supabaseUser.id;
  if (!userId) return 'patient';

  // 2. Query Supabase staff_profiles via privileged service-role client
  try {
    const { data: staffData, error: staffError } = await supabaseAdmin
      .from('staff_profiles')
      .select('role, active')
      .eq('id', userId)
      .maybeSingle();

    if (!staffError && staffData && staffData.active && isValidRole(staffData.role)) {
      return staffData.role;
    }

    // Fallback: Check profiles table
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();

    if (!profileError && profileData && isValidRole(profileData.role)) {
      return profileData.role;
    }
  } catch (err: any) {
    console.warn(`[RoleResolution] Failed to query Supabase profile for ${userId}:`, err.message);
  }

  return 'patient';
}

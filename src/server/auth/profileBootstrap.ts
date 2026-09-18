import { supabaseAdmin } from '../supabaseAdmin';
import { verifySupabaseAccessToken } from './supabaseAuth';
import { UserRole } from './types';

export interface BootstrapProfileParams {
  firstName?: string;
  lastName?: string;
  displayName?: string;
}

/**
 * Bootstraps or retrieves the user's public.profiles row.
 * Invariant: The client CANNOT specify or escalate their role.
 * Standard user signups are ALWAYS created with role = 'patient'.
 */
export async function bootstrapUserProfile(token: string, params?: BootstrapProfileParams) {
  const authUser = await verifySupabaseAccessToken(token);
  if (!authUser) {
    throw new Error('Unauthorized: Invalid or expired Supabase authentication session.');
  }

  const userId = authUser.uid;
  const email = authUser.email || '';

  // Check if profile already exists
  const { data: existingProfile, error: fetchError } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (fetchError) {
    console.error(`[ProfileBootstrap] Error checking existing profile for ${userId}:`, fetchError.message);
  }

  if (existingProfile) {
    return existingProfile;
  }

  // Server-controlled role assignment:
  // If app_metadata.role was assigned server-side (e.g. by admin or test accounts), respect it; otherwise DEFAULT TO 'patient'.
  let assignedRole: UserRole = 'patient';
  if (authUser.supabaseUser?.app_metadata?.role) {
    const appRole = authUser.supabaseUser.app_metadata.role;
    if (['doctor', 'pharmacist', 'admin', 'patient'].includes(appRole)) {
      assignedRole = appRole as UserRole;
    }
  }

  const displayName = params?.displayName ||
    `${params?.firstName || ''} ${params?.lastName || ''}`.trim() ||
    email.split('@')[0] ||
    'New Patient';

  const newProfile = {
    id: userId,
    email,
    display_name: displayName,
    first_name: params?.firstName || null,
    last_name: params?.lastName || null,
    role: assignedRole, // STRICTLY SERVER CONTROLLED, NEVER FROM CLIENT BODY
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data: createdProfile, error: insertError } = await supabaseAdmin
    .from('profiles')
    .insert(newProfile)
    .select()
    .single();

  if (insertError) {
    throw new Error(`Failed to bootstrap user profile: ${insertError.message}`);
  }

  return createdProfile;
}

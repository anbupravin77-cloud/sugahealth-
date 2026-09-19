import { supabaseAdmin } from '../supabaseAdmin';
import { DbProfile, DbStaffProfile } from './types';

export class ProfileRepository {
  async getProfileById(id: string): Promise<DbProfile | null> {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error(`[ProfileRepository] getProfileById failed for ${id}:`, error.message);
      return null;
    }
    return data as DbProfile;
  }

  async getProfileByFirebaseUid(firebaseUid: string): Promise<DbProfile | null> {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('firebase_uid', firebaseUid)
      .maybeSingle();

    if (error) {
      console.error(`[ProfileRepository] getProfileByFirebaseUid failed:`, error.message);
      return null;
    }
    return data as DbProfile;
  }

  async upsertProfile(profile: Partial<DbProfile> & { id: string }): Promise<DbProfile> {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .upsert({
        ...profile,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to upsert profile: ${error.message}`);
    }
    return data as DbProfile;
  }

  async updateProfile(id: string, updates: Partial<DbProfile>): Promise<DbProfile> {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update profile: ${error.message}`);
    }
    return data as DbProfile;
  }

  async getStaffProfileById(id: string): Promise<DbStaffProfile | null> {
    const { data, error } = await supabaseAdmin
      .from('staff_profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error(`[ProfileRepository] getStaffProfileById failed:`, error.message);
      return null;
    }
    return data as DbStaffProfile;
  }

  async getStaffProfileByFirebaseUid(firebaseUid: string): Promise<DbStaffProfile | null> {
    const { data, error } = await supabaseAdmin
      .from('staff_profiles')
      .select('*')
      .eq('firebase_uid', firebaseUid)
      .maybeSingle();

    if (error) {
      console.error(`[ProfileRepository] getStaffProfileByFirebaseUid failed:`, error.message);
      return null;
    }
    return data as DbStaffProfile;
  }

  async listStaffProfiles(filters?: { role?: string; active?: boolean }): Promise<DbStaffProfile[]> {
    let query = supabaseAdmin.from('staff_profiles').select('*').order('created_at', { ascending: false });

    if (filters?.role) {
      query = query.eq('role', filters.role);
    }
    if (filters?.active !== undefined) {
      query = query.eq('active', filters.active);
    }

    const { data, error } = await query;
    if (error) {
      console.error(`[ProfileRepository] listStaffProfiles failed:`, error.message);
      return [];
    }
    return (data || []) as DbStaffProfile[];
  }

  async upsertStaffProfile(staff: DbStaffProfile): Promise<DbStaffProfile> {
    const { data, error } = await supabaseAdmin
      .from('staff_profiles')
      .upsert({
        ...staff,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to upsert staff profile: ${error.message}`);
    }
    return data as DbStaffProfile;
  }

  async updateStaffStatus(id: string, active: boolean): Promise<void> {
    const { error } = await supabaseAdmin
      .from('staff_profiles')
      .update({ active, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to update staff status: ${error.message}`);
    }
  }

  async updateStaffOnboarding(id: string, updates: Partial<DbStaffProfile>): Promise<DbStaffProfile> {
    const { data, error } = await supabaseAdmin
      .from('staff_profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update staff onboarding: ${error.message}`);
    }
    return data as DbStaffProfile;
  }
}

export const profileRepository = new ProfileRepository();

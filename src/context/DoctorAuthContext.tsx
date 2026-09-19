import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { signInWithDoctorCredentials, signInWithGoogle } from '../lib/supabaseAuth';

export interface DoctorProfile {
  id: string;
  name: string;
  title: string;
  credentials: string;
  specialty: string;
  subSpecialty: string;
  licenseNumber: string;
  deaNumber: string;
  npiNumber: string;
  email: string;
  phone: string;
  avatarUrl: string;
  shiftStatus: 'active' | 'break' | 'offline';
  affiliation: string;
  assignedJurisdiction: string[];
  bio: string;
  availabilityHours: string;
}

interface DoctorAuthContextType {
  isAuthenticated: boolean;
  doctor: DoctorProfile | null;
  isLoading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<void>;
  logout: () => void;
  updateShiftStatus: (status: DoctorProfile['shiftStatus']) => void;
}

const DoctorAuthContext = createContext<DoctorAuthContextType | undefined>(undefined);

export function DoctorAuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Verify and sync active Supabase session on mount
  const syncSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // Fetch verified role from server /api/auth/me
        const res = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        if (res.ok) {
          const authData = await res.json();
          if (authData.user?.role === 'doctor' || authData.user?.role === 'admin') {
            setIsAuthenticated(true);
            const staff = authData.profile || {};
            setDoctor({
              id: session.user.id,
              name: staff.display_name || (staff.first_name ? `Dr. ${staff.first_name} ${staff.last_name || ''}`.trim() : (session.user.email?.split('@')[0] || 'Clinician')),
              title: authData.user.role === 'admin' ? 'Medical Director' : 'Attending Telehealth Physician',
              credentials: staff.credentials || undefined,
              specialty: staff.specialties?.[0] || 'General Telehealth',
              subSpecialty: staff.sub_specialty || undefined,
              licenseNumber: staff.license_number || undefined,
              deaNumber: staff.dea_number || undefined,
              npiNumber: staff.npi_number || undefined,
              email: session.user.email || 'Not configured',
              phone: staff.phone_number || undefined,
              avatarUrl: staff.avatar_url || undefined,
              shiftStatus: 'active',
              affiliation: staff.affiliation || 'Suga.Health Telehealth Network',
              assignedJurisdiction: staff.jurisdictions || undefined,
              bio: staff.bio || undefined,
              availabilityHours: staff.availability_hours || undefined,
            });
            setIsLoading(false);
            return;
          }
        }
      }

      setIsAuthenticated(false);
      setDoctor(null);
    } catch (err) {
      console.warn('[DoctorAuth] Error restoring doctor session:', err);
      setIsAuthenticated(false);
      setDoctor(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    syncSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') && session) {
        syncSession();
      } else if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
        setDoctor(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (
    emailInput: string,
    passwordInput: string,
    rememberMe: boolean = false
  ): Promise<{ success: boolean; error?: string }> => {
    const normalizedEmail = emailInput.trim().toLowerCase();
    const cleanPassword = passwordInput.trim();

    if (!normalizedEmail || !cleanPassword) {
      return { success: false, error: 'Please enter both your clinical email and password.' };
    }

    try {
      const result = await signInWithDoctorCredentials({
        email: normalizedEmail,
        password: cleanPassword,
      });

      if (result.success && result.session) {
        await syncSession();
        return { success: true };
      }

      return {
        success: false,
        error: result.error || 'Invalid clinical credentials. Please verify your provider email and password.',
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'An error occurred during doctor authentication.',
      };
    }
  };

  const loginWithGoogle = async () => {
    const redirectTarget = `${window.location.origin}/doctor`;
    await signInWithGoogle(redirectTarget);
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('[DoctorAuth] Error during logout cleanup:', err);
    }
    setIsAuthenticated(false);
    setDoctor(null);
  };

  const updateShiftStatus = (status: DoctorProfile['shiftStatus']) => {
    if (doctor) {
      setDoctor({ ...doctor, shiftStatus: status });
    }
  };

  return (
    <DoctorAuthContext.Provider
      value={{
        isAuthenticated,
        doctor,
        isLoading,
        login,
        loginWithGoogle,
        logout,
        updateShiftStatus,
      }}
    >
      {children}
    </DoctorAuthContext.Provider>
  );
}

export function useDoctorAuth(): DoctorAuthContextType {
  const context = useContext(DoctorAuthContext);
  if (!context) {
    throw new Error('useDoctorAuth must be used within a DoctorAuthProvider');
  }
  return context;
}

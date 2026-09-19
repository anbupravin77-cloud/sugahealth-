import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { DoctorProfile, MOCK_DOCTOR_PROFILE } from '../data/doctorMockData';
import { supabase } from '../lib/supabase';
import { signInWithDoctorCredentials, signInWithGoogle } from '../lib/supabaseAuth';

// Frontend-only demo credentials fallback for offline UI prototyping
export const DEMO_DOCTOR_CREDENTIALS = {
  email: 'doctor.demo@sugahealth.test',
  password: 'DoctorDemo123!',
};

const SESSION_STORAGE_KEY = 'suga_doctor_demo_session';

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

  // Verify and sync active Supabase / Demo session on mount
  const syncSession = async () => {
    try {
      // 1. Check Supabase Auth session first
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // Fetch verified role from server
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
              name: staff.display_name || (staff.first_name ? `Dr. ${staff.first_name} ${staff.last_name || ''}`.trim() : (session.user.email?.split('@')[0] || 'Dr. Sarah Mitchell')),
              title: authData.user.role === 'admin' ? 'Medical Director' : 'Attending Telehealth Physician',
              credentials: 'MD, FACP',
              specialty: 'Internal Medicine & Metabolic Health',
              subSpecialty: 'Telehealth Clinical Evaluation',
              licenseNumber: staff.license_number || 'MD-928410-US',
              deaNumber: 'SD-8492048',
              npiNumber: '1948204928',
              email: session.user.email || 'doctor@suga.health',
              phone: '+1 (555) 394-2019',
              avatarUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=400',
              shiftStatus: 'active',
              affiliation: 'Suga.Health Telehealth Clinical Medical Group',
              assignedJurisdiction: ['CA', 'NY', 'TX', 'FL', 'IL'],
              bio: 'Board-certified clinician specializing in precision metabolic therapies and asynchronous patient care.',
              availabilityHours: '08:00 - 18:00 EST',
            });
            setIsLoading(false);
            return;
          }
        }
      }

      // 2. Check local/session storage demo fallback
      const storedSession = sessionStorage.getItem(SESSION_STORAGE_KEY) || localStorage.getItem(SESSION_STORAGE_KEY);
      if (storedSession) {
        const parsed = JSON.parse(storedSession);
        if (parsed?.authenticated) {
          setIsAuthenticated(true);
          setDoctor({
            ...MOCK_DOCTOR_PROFILE,
            shiftStatus: parsed?.shiftStatus || 'active',
          });
          setIsLoading(false);
          return;
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

    // Listen to Supabase auth state change
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
      // 1. Authenticate against server-side doctor login endpoint
      const result = await signInWithDoctorCredentials({
        email: normalizedEmail,
        password: cleanPassword,
      });

      if (result.success) {
        const sessionData = {
          authenticated: true,
          email: normalizedEmail,
          doctorId: result.user?.id || MOCK_DOCTOR_PROFILE.id,
          shiftStatus: 'active',
          timestamp: new Date().toISOString(),
        };

        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));
        if (rememberMe) {
          localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));
        }

        setIsAuthenticated(true);
        setDoctor({
          ...MOCK_DOCTOR_PROFILE,
          id: result.user?.id || MOCK_DOCTOR_PROFILE.id,
          email: normalizedEmail,
        });
        return { success: true };
      }
    } catch (err: any) {
      console.warn('[DoctorAuth] Server login failed, checking demo fallback:', err.message);
    }

    // 2. Demo fallback credentials
    if (
      normalizedEmail === DEMO_DOCTOR_CREDENTIALS.email.toLowerCase() &&
      cleanPassword === DEMO_DOCTOR_CREDENTIALS.password
    ) {
      const sessionData = {
        authenticated: true,
        email: DEMO_DOCTOR_CREDENTIALS.email,
        doctorId: MOCK_DOCTOR_PROFILE.id,
        shiftStatus: 'active',
        timestamp: new Date().toISOString(),
      };

      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));
      if (rememberMe) {
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));
      }

      setIsAuthenticated(true);
      setDoctor(MOCK_DOCTOR_PROFILE);
      return { success: true };
    }

    return {
      success: false,
      error: 'Invalid clinical credentials. Please verify your provider email and password.',
    };
  };

  const loginWithGoogle = async () => {
    const redirectTarget = `${window.location.origin}/doctor`;
    await signInWithGoogle(redirectTarget);
  };

  const logout = async () => {
    try {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      localStorage.removeItem(SESSION_STORAGE_KEY);
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('[DoctorAuth] Error during logout cleanup:', err);
    }
    setIsAuthenticated(false);
    setDoctor(null);
  };

  const updateShiftStatus = (status: DoctorProfile['shiftStatus']) => {
    if (doctor) {
      const updated = { ...doctor, shiftStatus: status };
      setDoctor(updated);
      try {
        const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          parsed.shiftStatus = status;
          sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(parsed));
        }
      } catch (e) {
        // ignore
      }
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

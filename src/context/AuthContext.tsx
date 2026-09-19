import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { supabase } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';

export type UserRole = 'patient' | 'doctor' | 'pharmacist' | 'admin';

export interface Address {
  recipientName: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phoneNumber?: string;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  phoneNumber: string | null;
  displayName: string | null;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  sex?: 'male' | 'female' | 'other' | 'prefer-not-to-say' | '';
  shippingAddress?: Address;
  role: UserRole;
  createdAt: string;
  updatedAt?: string;
}

export interface StaffProfile {
  uid: string;
  id?: string;
  email: string;
  role: UserRole;
  active: boolean;
  onboardingStatus: 'pending' | 'completed';
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  initials?: string;
  phoneNumber?: string;
  specialties?: string[];
  professionalAddress?: Omit<Address, 'recipientName'>;
  createdAt: string;
  updatedAt: string;
}

export interface UnifiedUser {
  uid: string;
  id: string;
  email: string | null;
  phoneNumber?: string | null;
  displayName: string | null;
  photoURL?: string | null;
  getIdToken: (forceRefresh?: boolean) => Promise<string>;
  [key: string]: any;
}

interface AuthContextType {
  user: UnifiedUser | User | null;
  profile: UserProfile | null;
  staffProfile: StaffProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UnifiedUser | User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [staffProfile, setStaffProfile] = useState<StaffProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const syncSupabaseSession = async (session: Session | null): Promise<boolean> => {
    if (!session?.user) return false;

    try {
      let role: UserRole = 'patient';
      let serverProfile: any = null;

      // 1. Fetch server-authoritative role & profile from /api/auth/me
      try {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.user?.role) {
            role = data.user.role;
          }
          if (data.profile) {
            serverProfile = data.profile;
          }
        }
      } catch (err) {
        console.warn('[AuthContext] /api/auth/me check failed:', err);
      }

      // 2. If no server profile found in Supabase table (e.g. first Google login), bootstrap it
      if (!serverProfile && session.access_token) {
        try {
          const metadata = session.user.user_metadata || {};
          const fullName = metadata.full_name || metadata.name || metadata.displayName || '';
          const parts = fullName.split(' ');
          const fName = metadata.first_name || parts[0] || '';
          const lName = metadata.last_name || (parts.length > 1 ? parts.slice(1).join(' ') : '') || '';

          const bootRes = await fetch('/api/auth/bootstrap-profile', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              firstName: fName,
              lastName: lName,
              displayName: fullName || session.user.email?.split('@')[0] || 'Patient',
            }),
          });
          if (bootRes.ok) {
            const bootData = await bootRes.json();
            if (bootData.profile) {
              serverProfile = bootData.profile;
              if (bootData.profile.role) role = bootData.profile.role;
            }
          }
        } catch (err) {
          console.warn('[AuthContext] Bootstrap profile fallback:', err);
        }
      }

      // Admin verification for designated admin emails
      const normalizedEmail = (session.user.email || '').toLowerCase().trim();
      const isAdmin =
        role === 'admin' ||
        normalizedEmail === 'ramaadhiasha@gmail.com' ||
        normalizedEmail.endsWith('@sugahealth.com') ||
        normalizedEmail.startsWith('admin@');
      if (isAdmin) role = 'admin';

      const uProfile: UserProfile = {
        uid: session.user.id,
        email: session.user.email || null,
        phoneNumber: session.user.phone || serverProfile?.phone_number || null,
        displayName:
          serverProfile?.display_name ||
          session.user.user_metadata?.full_name ||
          session.user.user_metadata?.display_name ||
          session.user.email?.split('@')[0] ||
          'User',
        firstName: serverProfile?.first_name || session.user.user_metadata?.first_name || '',
        lastName: serverProfile?.last_name || session.user.user_metadata?.last_name || '',
        dateOfBirth: serverProfile?.date_of_birth || '',
        sex: (serverProfile?.sex || serverProfile?.gender || '') as any,
        shippingAddress: serverProfile?.shipping_address || undefined,
        role: role,
        createdAt: serverProfile?.created_at || session.user.created_at || new Date().toISOString(),
      };

      const unifiedUser: UnifiedUser = {
        uid: session.user.id,
        id: session.user.id,
        email: session.user.email || null,
        displayName: uProfile.displayName,
        phoneNumber: uProfile.phoneNumber,
        photoURL: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || null,
        getIdToken: async (forceRefresh?: boolean) => {
          if (forceRefresh) {
            const { data } = await supabase.auth.refreshSession();
            if (data?.session?.access_token) return data.session.access_token;
          }
          const { data } = await supabase.auth.getSession();
          return data?.session?.access_token || session.access_token;
        },
      };

      setUser(unifiedUser);
      setProfile(uProfile);

      if (role !== 'patient') {
        setStaffProfile({
          uid: session.user.id,
          email: session.user.email || '',
          role: role,
          active: true,
          onboardingStatus: 'completed',
          firstName: uProfile.firstName,
          lastName: uProfile.lastName,
          createdAt: uProfile.createdAt,
          updatedAt: new Date().toISOString(),
        });
      } else {
        setStaffProfile(null);
      }

      setLoading(false);
      return true;
    } catch (err) {
      console.warn('[AuthContext] syncSupabaseSession error:', err);
      return false;
    }
  };

  const fetchFirebaseProfile = async (uid: string) => {
    try {
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const data = userSnap.data() as UserProfile;
        setProfile(data);

        // Also fetch staff profile if applicable
        if (data.role !== 'patient') {
          const staffRef = doc(db, 'staff_profiles', uid);
          const staffSnap = await getDoc(staffRef);
          if (staffSnap.exists()) {
            setStaffProfile(staffSnap.data() as StaffProfile);
          }
        }
      }
    } catch (err) {
      console.warn('[AuthContext] fetchFirebaseProfile error:', err);
    }
  };

  const refreshProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await syncSupabaseSession(session);
        return;
      }
      if (user?.uid) {
        await fetchFirebaseProfile(user.uid);
      }
    } catch (err) {
      console.warn('[AuthContext] refreshProfile error:', err);
    }
  };

  useEffect(() => {
    let isMounted = true;
    let hasSupabaseSession = false;

    // 1. Check initial Supabase active session (hydrated from local storage or OAuth callback URL)
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return;
      if (session?.user) {
        hasSupabaseSession = true;
        await syncSupabaseSession(session);
      }
    });

    // 2. Listen to Supabase auth state transitions
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      if (session?.user) {
        hasSupabaseSession = true;
        await syncSupabaseSession(session);
      } else if (event === 'SIGNED_OUT') {
        hasSupabaseSession = false;
        if (!auth.currentUser) {
          setUser(null);
          setProfile(null);
          setStaffProfile(null);
          setLoading(false);
        }
      }
    });

    // 3. Listen to Firebase auth state transitions (backward compatibility with existing production data)
    const unsubscribeFirebase = onAuthStateChanged(auth, async (currentUser) => {
      if (!isMounted) return;

      // If active Supabase session already claimed auth, don't overwrite with null
      if (hasSupabaseSession) {
        return;
      }

      // Check one more time if Supabase has session before falling back to Firebase
      try {
        const { data: { session: currentSbSession } } = await supabase.auth.getSession();
        if (currentSbSession?.user) {
          hasSupabaseSession = true;
          await syncSupabaseSession(currentSbSession);
          return;
        }
      } catch (e) {}

      if (currentUser) {
        setUser(currentUser);

        // Fetch or create user profile in Firestore
        try {
          const userRef = doc(db, 'users', currentUser.uid);
          const userSnap = await getDoc(userRef);

          const normalizedEmail = (currentUser.email || '').toLowerCase().trim();
          const isAdmin =
            normalizedEmail === 'ramaadhiasha@gmail.com' ||
            normalizedEmail.endsWith('@sugahealth.com') ||
            normalizedEmail.startsWith('admin@');

          if (userSnap.exists()) {
            const p = userSnap.data() as UserProfile;
            if (isAdmin && p.role !== 'admin') {
              p.role = 'admin';
              setDoc(userRef, { role: 'admin' }, { merge: true }).catch(() => {});
            }
            setProfile(p);

            if (p.role !== 'patient') {
              const staffRef = doc(db, 'staff_profiles', currentUser.uid);
              const staffSnap = await getDoc(staffRef);
              if (staffSnap.exists()) {
                setStaffProfile(staffSnap.data() as StaffProfile);
              }
            }
          } else {
            const newProfile: UserProfile = {
              uid: currentUser.uid,
              email: currentUser.email,
              phoneNumber: currentUser.phoneNumber,
              displayName: currentUser.displayName,
              role: isAdmin ? 'admin' : 'patient',
              createdAt: new Date().toISOString(),
            };
            await setDoc(userRef, newProfile).catch(() => {});
            setProfile(newProfile);
          }
        } catch (fbErr) {
          console.warn('[AuthContext] Firebase profile load warning:', fbErr);
        }
      } else {
        setUser(null);
        setProfile(null);
        setStaffProfile(null);
      }

      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      unsubscribeFirebase();
    };
  }, []);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {}
    try {
      await firebaseSignOut(auth);
    } catch (e) {}
    setUser(null);
    setProfile(null);
    setStaffProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, staffProfile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}


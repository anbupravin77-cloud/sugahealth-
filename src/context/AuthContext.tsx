import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

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
  email: string;
  role: UserRole;
  active: boolean;
  onboardingStatus: 'pending' | 'completed';
  firstName?: string | null;
  lastName?: string | null;
  initials?: string;
  phoneNumber?: string;
  specialties?: string[];
  professionalAddress?: Omit<Address, 'recipientName'>;
  createdAt: string;
  updatedAt: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  staffProfile: StaffProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [staffProfile, setStaffProfile] = useState<StaffProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (uid: string) => {
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
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.uid);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        // Fetch or create user profile
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
        
        const normalizedEmail = (currentUser.email || '').toLowerCase().trim();
        const isAdmin = normalizedEmail === 'ramaadhiasha@gmail.com' || normalizedEmail.endsWith('@sugahealth.com') || normalizedEmail.startsWith('admin@');

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
          // Create new profile with proper role
          const newProfile: UserProfile = {
            uid: currentUser.uid,
            email: currentUser.email,
            phoneNumber: currentUser.phoneNumber,
            displayName: currentUser.displayName,
            role: isAdmin ? 'admin' : 'patient',
            createdAt: new Date().toISOString(),
          };
          await setDoc(userRef, newProfile);
          setProfile(newProfile);
        }
      } else {
        setProfile(null);
        setStaffProfile(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signOut = async () => {
    await firebaseSignOut(auth);
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

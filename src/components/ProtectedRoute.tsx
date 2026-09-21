import { Navigate, Outlet } from 'react-router-dom';
import { useAuth, UserRole } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';
import { isPatientProfileComplete } from '../lib/profile';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
  requireOnboarding?: boolean; // Set to false on the /onboarding route itself
  requireProfileComplete?: boolean;
}

export function ProtectedRoute({ allowedRoles, requireOnboarding = true, requireProfileComplete = true }: ProtectedRouteProps) {
  const { user, profile, staffProfile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-900" />
      </div>
    );
  }

  if (!user || !profile) {
    return <Navigate to="/login" replace />;
  }

  // Staff do not enter patient-only routes.
  if (!allowedRoles && profile.role === 'doctor') return <Navigate to="/doctor" replace />;
  if (!allowedRoles && profile.role === 'admin') return <Navigate to="/admin" replace />;
  if (!allowedRoles && profile.role === 'pharmacist') return <Navigate to="/pharmacist" replace />;

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    if (profile.role === 'doctor') return <Navigate to="/doctor" replace />;
    if (profile.role === 'admin') return <Navigate to="/admin" replace />;
    if (profile.role === 'pharmacist') return <Navigate to="/pharmacist" replace />;
    return <Navigate to="/" replace />;
  }

  if (profile.role === 'patient' && requireProfileComplete && !isPatientProfileComplete(profile)) {
    return <Navigate to="/account/setup" replace />;
  }

  // Force staff to complete onboarding
  if (requireOnboarding && profile.role !== 'patient' && staffProfile?.onboardingStatus === 'pending') {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
}
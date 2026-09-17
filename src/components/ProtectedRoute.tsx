import { Navigate, Outlet } from 'react-router-dom';
import { useAuth, UserRole } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
  requireOnboarding?: boolean; // Set to false on the /onboarding route itself
}

export function ProtectedRoute({ allowedRoles, requireOnboarding = true }: ProtectedRouteProps) {
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

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/" replace />;
  }

  // Force staff to complete onboarding
  if (requireOnboarding && profile.role !== 'patient' && staffProfile?.onboardingStatus === 'pending') {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
}

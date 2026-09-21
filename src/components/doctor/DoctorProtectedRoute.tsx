import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useDoctorAuth } from '../../context/DoctorAuthContext';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export function DoctorProtectedRoute() {
  const { isAuthenticated, isLoading } = useDoctorAuth();
  const { user, profile, loading: authLoading } = useAuth();
  const location = useLocation();

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen bg-stone-900 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-stone-200">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          <p className="text-xs font-medium tracking-wide uppercase text-stone-400">
            Verifying Clinical Session...
          </p>
        </div>
      </div>
    );
  }

  // Keep each signed-in role in its own portal.
  if (user && profile?.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }
  if (user && profile?.role === 'pharmacist') {
    return <Navigate to="/pharmacist" replace />;
  }
  if (user && profile?.role === 'patient') {
    return <Navigate to="/" replace />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/doctor/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
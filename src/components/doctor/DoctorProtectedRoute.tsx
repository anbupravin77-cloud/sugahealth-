import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useDoctorAuth } from '../../context/DoctorAuthContext';
import { Loader2 } from 'lucide-react';

export function DoctorProtectedRoute() {
  const { isAuthenticated, isLoading } = useDoctorAuth();
  const location = useLocation();

  if (isLoading) {
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

  if (!isAuthenticated) {
    return <Navigate to="/doctor/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}

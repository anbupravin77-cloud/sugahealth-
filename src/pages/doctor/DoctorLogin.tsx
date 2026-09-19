import React, { useState, useEffect, FormEvent } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useDoctorAuth, DEMO_DOCTOR_CREDENTIALS } from '../../context/DoctorAuthContext';
import {
  ShieldCheck,
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  Stethoscope,
  KeyRound,
  ArrowRight,
  Info,
} from 'lucide-react';

export default function DoctorLogin() {
  const { isAuthenticated, login, loginWithGoogle, isLoading: authLoading } = useDoctorAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);

  // If already authenticated, redirect to /doctor
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      const destination = (location.state as any)?.from?.pathname || '/doctor';
      navigate(destination, { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate, location]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const result = await login(email, password, rememberMe);
      if (result.success) {
        const destination = (location.state as any)?.from?.pathname || '/doctor';
        navigate(destination, { replace: true });
      } else {
        setErrorMessage(result.error || 'Invalid clinical credentials. Please verify your provider email and password.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'An unexpected error occurred during clinical login.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = () => {
    setEmail(DEMO_DOCTOR_CREDENTIALS.email);
    setPassword(DEMO_DOCTOR_CREDENTIALS.password);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-stone-900 flex flex-col justify-between selection:bg-stone-900 selection:text-white font-sans">
      {/* Top Header */}
      <header className="border-b border-stone-200 bg-white px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2 group">
            <span className="text-lg sm:text-xl font-bold tracking-tight text-stone-950 font-sans">
              SUGA<span className="text-emerald-700">.</span>HEALTH
            </span>
          </Link>
          <div className="h-4 w-px bg-stone-200 hidden sm:block" />
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-2xs font-semibold bg-stone-100 text-stone-700 border border-stone-200">
            <Stethoscope className="w-3 h-3 text-emerald-700" />
            Clinical Provider Portal
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <Link
            to="/login"
            className="text-stone-500 hover:text-stone-900 transition-colors px-2.5 py-1 rounded-lg border border-stone-200 hover:bg-stone-50"
          >
            Patient Sign In &rarr;
          </Link>
        </div>
      </header>

      {/* Main Login Workspace */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-10">
        <div className="w-full max-w-md space-y-6">
          {/* Card Container */}
          <div className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 shadow-xs relative overflow-hidden">
            {/* Header */}
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-stone-100 border border-stone-200 text-stone-700 text-2xs font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                <span>Encrypted Telehealth Workspace</span>
              </div>
              <h1 className="text-2xl font-bold text-stone-900 tracking-tight pt-1 font-sans">
                Doctor & Provider Login
              </h1>
              <p className="text-xs text-stone-500 leading-relaxed">
                Access your clinical queue, review patient asynchronous intakes, and issue verified electronic prescriptions.
              </p>
            </div>

            {/* Error Message Box */}
            {errorMessage && (
              <div
                role="alert"
                className="mt-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in duration-150"
              >
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-semibold text-rose-900">Authentication Rejected</p>
                  <p className="text-rose-800">{errorMessage}</p>
                </div>
              </div>
            )}

            {/* Google OAuth Provider SSO */}
            <div className="mt-5 space-y-3">
              <button
                type="button"
                onClick={() => loginWithGoogle()}
                className="w-full py-2.5 px-4 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-800 font-semibold text-xs transition-colors shadow-2xs flex items-center justify-center gap-2.5 cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Sign in with Google Clinical SSO</span>
              </button>

              <div className="relative flex items-center justify-center">
                <div className="border-t border-stone-200 w-full" />
                <span className="bg-white px-2 text-3xs font-semibold uppercase tracking-wider text-stone-400 absolute">
                  Or provider password
                </span>
              </div>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {/* Email Field */}
              <div className="space-y-1.5">
                <label
                  htmlFor="doctor-email"
                  className="block text-xs font-semibold text-stone-700"
                >
                  Clinical Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="doctor-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="doctor.demo@sugahealth.test"
                    className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-900 placeholder:text-stone-400 focus:bg-white focus:outline-hidden focus:border-stone-500 transition-all font-sans"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="doctor-password"
                    className="block text-xs font-semibold text-stone-700"
                  >
                    Provider Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotPasswordModal(true)}
                    className="text-2xs text-stone-500 hover:text-stone-900 font-medium transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="doctor-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-10 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-900 placeholder:text-stone-400 focus:bg-white focus:outline-hidden focus:border-stone-500 transition-all font-sans"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-stone-700 transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 text-stone-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-stone-300 text-stone-900 focus:ring-stone-900"
                  />
                  <span>Remember this workstation</span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Verifying Clinical Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Enter Clinical Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Demo Quick-Fill Helper */}
            <div className="mt-6 pt-5 border-t border-stone-100">
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-2xs font-semibold uppercase tracking-wider text-stone-500 flex items-center gap-1">
                    <KeyRound className="w-3 h-3 text-emerald-700" />
                    Demo Provider Credentials
                  </span>
                  <button
                    type="button"
                    onClick={handleQuickFill}
                    className="text-2xs font-semibold text-emerald-800 hover:text-emerald-950 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 transition-colors cursor-pointer"
                  >
                    Auto-Fill
                  </button>
                </div>
                <div className="font-mono text-2xs text-stone-600 space-y-0.5">
                  <div>Email: <span className="text-stone-900 font-semibold">{DEMO_DOCTOR_CREDENTIALS.email}</span></div>
                  <div>Pass: <span className="text-stone-900 font-semibold">{DEMO_DOCTOR_CREDENTIALS.password}</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Forgot Password Modal */}
      {showForgotPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center gap-2">
              <Info className="w-5 h-5 text-emerald-700" />
              <h3 className="text-base font-semibold text-stone-900">Credential Recovery</h3>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              Provider credential resets require dual-factor administrative verification through the Suga.Health Medical Credentialing Board. Please use the test credentials provided in the demo helper.
            </p>
            <button
              onClick={() => setShowForgotPasswordModal(false)}
              className="w-full py-2 rounded-lg bg-stone-900 text-white text-xs font-semibold hover:bg-stone-800"
            >
              Understood
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-white px-4 sm:px-8 py-3 text-center text-3xs text-stone-400">
        Suga.Health Clinical Provider Portal • EPCS & HIPAA Security Rules Compliant • Telehealth Network
      </footer>
    </div>
  );
}

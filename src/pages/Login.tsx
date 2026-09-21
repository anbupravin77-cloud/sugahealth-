import { useState, useEffect, FormEvent } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { signInWithGoogle, signInWithEmail } from '../lib/supabaseAuth';
import { useAuth } from '../context/AuthContext';
import { Loader2, Mail, Lock, ShieldCheck, Stethoscope, User, ArrowRight } from 'lucide-react';

const TEST_CREDENTIALS = [
  {
    role: 'Admin',
    email: 'admin123@gmail.com',
    password: '123456admin@!',
    destination: '/admin',
    desc: 'System administration & CMS',
    icon: ShieldCheck,
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
  },
  {
    role: 'Doctor',
    email: 'doctor123@gmail.com',
    password: '123456doctor@!',
    destination: '/doctor',
    desc: 'Clinical workspace & consultations',
    icon: Stethoscope,
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
  {
    role: 'Patient',
    email: 'patient123@gmail.com',
    password: '123456patient@!',
    destination: '/account',
    desc: 'Patient portal & health records',
    icon: User,
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
  },
];

export default function Login() {
  const { user, profile, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // If already authenticated, redirect to appropriate role portal
  useEffect(() => {
    if (!authLoading && user && profile) {
      const from = (location.state as any)?.from?.pathname;
      if (profile.role === 'doctor') {
        navigate(from || '/doctor', { replace: true });
      } else if (profile.role === 'pharmacist') {
        navigate(from || '/pharmacist', { replace: true });
      } else if (profile.role === 'admin') {
        navigate(from || '/admin', { replace: true });
      } else {
        navigate(from || '/account', { replace: true });
      }
    }
  }, [user, profile, authLoading, navigate, location]);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError('');
      await signInWithGoogle(`${window.location.origin}/account`);
    } catch (err: any) {
      console.error('Supabase Google OAuth sign-in error:', err);
      setError(err?.message || 'Failed to sign in with Google. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    try {
      setLoading(true);
      setError('');
      const authData = await signInWithEmail({ email, password });
      
      const session = (authData as any)?.session || (authData as any)?.data?.session;
      const targetFrom = (location.state as any)?.from?.pathname;

      if (session?.access_token) {
        try {
          const res = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
          if (res.ok) {
            const meData = await res.json();
            const role = meData.user?.role || meData.profile?.role;
            if (role === 'admin') {
              navigate(targetFrom || '/admin', { replace: true });
              return;
            } else if (role === 'doctor') {
              navigate(targetFrom || '/doctor', { replace: true });
              return;
            } else if (role === 'pharmacist') {
              navigate(targetFrom || '/pharmacist', { replace: true });
              return;
            } else {
              navigate(targetFrom || '/account', { replace: true });
              return;
            }
          }
        } catch (err) {
          console.warn('Failed to pre-fetch role on login:', err);
        }
      }

      // Default fallback if role resolution is pending
      navigate(targetFrom || '/account', { replace: true });
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (item: typeof TEST_CREDENTIALS[0]) => {
    setEmail(item.email);
    setPassword(item.password);
    setSelectedRole(item.role);
    setError('');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 p-4 font-sans">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 sm:p-8 shadow-sm border border-stone-200">
        <div className="mb-6 text-center">
          <Link to="/" className="inline-block text-xl font-bold tracking-tight text-stone-950 mb-1">
            SUGA<span className="text-emerald-700">.</span>HEALTH
          </Link>
          <h1 className="text-2xl font-bold text-stone-900">Sign In</h1>
          <p className="mt-1 text-xs text-stone-500">Access your account or test role portals</p>
        </div>

        {/* Quick Select Default Test Credentials */}
        <div className="mb-6 rounded-xl bg-stone-50 p-3.5 border border-stone-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-stone-800">Default Test Credentials</span>
            <span className="text-2xs text-stone-500">Click to autofill</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {TEST_CREDENTIALS.map((cred) => {
              const Icon = cred.icon;
              const isSelected = selectedRole === cred.role;
              return (
                <button
                  key={cred.role}
                  type="button"
                  onClick={() => fillCredentials(cred)}
                  className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'border-stone-900 bg-white shadow-xs ring-1 ring-stone-900'
                      : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-stone-900">{cred.role}</span>
                    <Icon className="w-3.5 h-3.5 text-stone-500" />
                  </div>
                  <div className="text-[11px] text-stone-500 truncate">{cred.email.split('@')[0]}</div>
                  <div className="text-3xs text-stone-400 mt-1">Goes to {cred.destination}</div>
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="mb-5 rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
            {error}
          </div>
        )}

        {/* Standard Email & Password Form */}
        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-xs font-semibold text-stone-700">
              Email Address
            </label>
            <div className="relative">
              <input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-stone-200 px-3.5 py-2 text-xs focus:border-stone-900 focus:outline-hidden"
                required
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="password" className="block text-xs font-semibold text-stone-700">
                Password
              </label>
            </div>
            <div className="relative">
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-stone-200 px-3.5 py-2 text-xs focus:border-stone-900 focus:outline-hidden"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-stone-950 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-stone-800 disabled:opacity-50 cursor-pointer shadow-2xs"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sign In'}
            {!loading && <ArrowRight className="h-3.5 w-3.5" />}
          </button>
        </form>

        <div className="mt-5 relative flex items-center justify-center">
          <div className="border-t border-stone-200 w-full" />
          <span className="bg-white px-3 text-3xs font-semibold uppercase tracking-wider text-stone-400 absolute">
            Or continue with
          </span>
        </div>

        <div className="mt-5">
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-xs font-medium text-stone-700 transition-colors hover:bg-stone-50 disabled:opacity-50 cursor-pointer shadow-2xs"
          >
            <Mail className="h-4 w-4 text-stone-500" />
            Sign In with Google
          </button>
        </div>

        <div className="mt-6 pt-4 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
          <Link to="/" className="hover:text-stone-900">
            &larr; Back to Home
          </Link>
          <Link to="/doctor/login" className="hover:text-emerald-700 font-medium">
            Clinical Doctor Portal &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}

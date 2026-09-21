import { FormEvent, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { signInWithEmail, signInWithGoogle, signUpWithEmail } from '../lib/supabaseAuth';
import { useAuth } from '../context/AuthContext';
import { isPatientProfileComplete } from '../lib/profile';
import { ArrowRight, Loader2, Mail } from 'lucide-react';

export default function Login() {
  const { user, profile, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (authLoading || !user || !profile) return;
    if (profile.role === 'admin') return navigate('/admin', { replace: true });
    if (profile.role === 'doctor') return navigate('/doctor', { replace: true });
    if (profile.role === 'pharmacist') return navigate('/pharmacist', { replace: true });
    if (!isPatientProfileComplete(profile)) return navigate('/account/setup', { replace: true });
    const from = (location.state as any)?.from?.pathname;
    navigate(from && from !== '/login' ? from : '/account', { replace: true });
  }, [user, profile, authLoading, navigate, location]);

  const routeFromServerProfile = (meData: any) => {
    const role = meData?.user?.role || meData?.profile?.role || 'patient';
    if (role === 'admin') return '/admin';
    if (role === 'doctor') return '/doctor';
    if (role === 'pharmacist') return '/pharmacist';

    const p = meData?.profile || {};
    const complete = Boolean(p.profile_completed_at) || Boolean(
      p.first_name && p.last_name && p.phone_number && p.date_of_birth && p.sex &&
      Number(p.height_cm) > 0 && Number(p.weight_kg) > 0 && p.shipping_address?.line1 &&
      p.shipping_address?.city && p.shipping_address?.state && /^\d{6}$/.test(p.shipping_address?.postalCode || '')
    );
    if (!complete) return '/account/setup';

    const from = (location.state as any)?.from?.pathname;
    return from && from !== '/login' ? from : '/account';
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError('');
      setMessage('');
      await signInWithGoogle(`${window.location.origin}/login`);
    } catch (err: any) {
      console.error('Supabase Google OAuth sign-in error:', err);
      setError(err?.message || 'Failed to sign in with Google. Please try again.');
      setLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (mode === 'signup') {
        if (!firstName.trim() || !lastName.trim()) throw new Error('Enter your first and last name.');
        if (password.length < 8) throw new Error('Use a password with at least 8 characters.');

        const data = await signUpWithEmail(
          { email, password },
          { firstName: firstName.trim(), lastName: lastName.trim() }
        );

        if (data.session?.access_token) {
          navigate('/account/setup', { replace: true });
        } else {
          setMessage('Account created. Check your email to confirm your address, then sign in to finish your profile.');
          setMode('signin');
          setPassword('');
        }
        return;
      }

      const authData = await signInWithEmail({ email, password });
      const session = authData.session;
      if (!session?.access_token) throw new Error('Sign-in did not return a valid session.');

      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error('Signed in, but your account profile could not be loaded.');
      navigate(routeFromServerProfile(await res.json()), { replace: true });
    } catch (err: any) {
      console.error(err);
      setError(err?.message || (mode === 'signup' ? 'Could not create your account.' : 'Invalid email or password.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 p-4 font-sans">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 sm:p-8 shadow-sm border border-stone-200">
        <div className="mb-6 text-center">
          <Link to="/" className="inline-block text-xl font-bold tracking-tight text-stone-950 mb-1">
            SUGA<span className="text-emerald-700">.</span>HEALTH
          </Link>
          <h1 className="text-2xl font-bold text-stone-900">{mode === 'signin' ? 'Sign In' : 'Create Account'}</h1>
          <p className="mt-1 text-xs text-stone-500">
            {mode === 'signin' ? 'Access your Suga.Health account' : 'Create your patient account, then complete your profile once'}
          </p>
        </div>

        <div className="mb-6 grid grid-cols-2 rounded-xl bg-stone-50 p-1 border border-stone-200">
          <button
            type="button"
            onClick={() => { setMode('signin'); setError(''); setMessage(''); }}
            className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${mode === 'signin' ? 'bg-white text-stone-950 shadow-xs' : 'text-stone-500 hover:text-stone-900'}`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setError(''); setMessage(''); }}
            className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${mode === 'signup' ? 'bg-white text-stone-950 shadow-xs' : 'text-stone-500 hover:text-stone-900'}`}
          >
            New Patient
          </button>
        </div>

        {error && (
          <div className="mb-5 rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
            {error}
          </div>
        )}
        {message && (
          <div className="mb-5 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800 border border-emerald-200">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="first-name" className="mb-1 block text-xs font-semibold text-stone-700">First Name</label>
                <input id="first-name" type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full rounded-lg border border-stone-200 px-3.5 py-2 text-xs focus:border-stone-900 focus:outline-hidden" required />
              </div>
              <div>
                <label htmlFor="last-name" className="mb-1 block text-xs font-semibold text-stone-700">Last Name</label>
                <input id="last-name" type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full rounded-lg border border-stone-200 px-3.5 py-2 text-xs focus:border-stone-900 focus:outline-hidden" required />
              </div>
            </div>
          )}

          <div>
            <label htmlFor="email" className="mb-1 block text-xs font-semibold text-stone-700">Email Address</label>
            <input id="email" type="email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg border border-stone-200 px-3.5 py-2 text-xs focus:border-stone-900 focus:outline-hidden" required />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-xs font-semibold text-stone-700">Password</label>
            <input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-lg border border-stone-200 px-3.5 py-2 text-xs focus:border-stone-900 focus:outline-hidden" required minLength={mode === 'signup' ? 8 : undefined} />
          </div>

          <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-lg bg-stone-950 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-stone-800 disabled:opacity-50 cursor-pointer shadow-2xs">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === 'signin' ? 'Sign In' : 'Create Patient Account'}
            {!loading && <ArrowRight className="h-3.5 w-3.5" />}
          </button>
        </form>

        <div className="mt-5 relative flex items-center justify-center">
          <div className="border-t border-stone-200 w-full" />
          <span className="bg-white px-3 text-3xs font-semibold uppercase tracking-wider text-stone-400 absolute">Or continue with</span>
        </div>

        <div className="mt-5">
          <button type="button" onClick={handleGoogleLogin} disabled={loading} className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-xs font-medium text-stone-700 transition-colors hover:bg-stone-50 disabled:opacity-50 cursor-pointer shadow-2xs">
            <Mail className="h-4 w-4 text-stone-500" />
            Continue with Google
          </button>
        </div>

        <div className="mt-6 pt-4 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
          <Link to="/" className="hover:text-stone-900">&larr; Back to Home</Link>
          <Link to="/doctor/login" className="hover:text-emerald-700 font-medium">Clinical Doctor Portal &rarr;</Link>
        </div>
      </div>
    </div>
  );
}
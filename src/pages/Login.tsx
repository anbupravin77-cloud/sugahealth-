import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithPopup, signInWithPhoneNumber, RecaptchaVerifier, ConfirmationResult } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { signInWithGoogle, signInWithEmail } from '../lib/supabaseAuth';
import { useAuth } from '../context/AuthContext';
import { Loader2, Mail, Phone, Smartphone, Lock } from 'lucide-react';

export default function Login() {
  const { user, profile, loading: authLoading } = useAuth();
  const [method, setMethod] = useState<'options' | 'phone' | 'email'>('options');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // If already authenticated, redirect to appropriate role portal
  useEffect(() => {
    if (!authLoading && user && profile) {
      if (profile.role === 'doctor') {
        navigate('/doctor', { replace: true });
      } else if (profile.role === 'pharmacist') {
        navigate('/pharmacist', { replace: true });
      } else if (profile.role === 'admin') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    }
  }, [user, profile, authLoading, navigate]);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError('');
      // Use Supabase Google OAuth with patient home redirect
      await signInWithGoogle(`${window.location.origin}/`);
    } catch (err: any) {
      console.warn('Supabase Google OAuth fallback to Firebase popup:', err);
      try {
        await signInWithPopup(auth, googleProvider);
        navigate('/');
      } catch (fbErr: any) {
        setError(fbErr.message || 'Failed to sign in with Google');
      }
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
      await signInWithEmail({ email, password });
      navigate('/');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const setupRecaptcha = () => {
    if (!(window as any).recaptchaVerifier) {
      (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
      });
    }
  };

  const handleSendOtp = async (e: FormEvent) => {
    e.preventDefault();
    if (!phoneNumber) return;
    
    try {
      setLoading(true);
      setError('');
      setupRecaptcha();
      const appVerifier = (window as any).recaptchaVerifier;
      const formattedNumber = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
      const confirmation = await signInWithPhoneNumber(auth, formattedNumber, appVerifier);
      setConfirmationResult(confirmation);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to send OTP. Please check the phone number.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: FormEvent) => {
    e.preventDefault();
    if (!otp || !confirmationResult) return;

    try {
      setLoading(true);
      setError('');
      await confirmationResult.confirm(otp);
      navigate('/');
    } catch (err: any) {
      console.error(err);
      setError('Invalid OTP code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm border border-neutral-200">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-neutral-900">Sign In</h1>
          <p className="mt-2 text-sm text-neutral-500">Access your Suga.health account</p>
        </div>

        {error && (
          <div className="mb-6 rounded-md bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {method === 'options' && (
          <div className="space-y-3">
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="flex w-full items-center justify-center gap-3 rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-50 cursor-pointer shadow-2xs"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Mail className="h-5 w-5 text-neutral-600" />}
              Continue with Google
            </button>
            <button
              onClick={() => setMethod('email')}
              disabled={loading}
              className="flex w-full items-center justify-center gap-3 rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-50 cursor-pointer shadow-2xs"
            >
              <Lock className="h-5 w-5 text-neutral-600" />
              Sign In with Email & Password
            </button>
            <button
              onClick={() => setMethod('phone')}
              disabled={loading}
              className="flex w-full items-center justify-center gap-3 rounded-lg bg-neutral-950 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:opacity-50 cursor-pointer shadow-xs"
            >
              <Smartphone className="h-5 w-5" />
              Continue with Phone Number
            </button>

            <div className="pt-4 mt-4 border-t border-neutral-100 text-center">
              <a
                href="/doctor/login"
                className="text-xs text-neutral-500 hover:text-emerald-700 font-medium inline-flex items-center gap-1 transition-colors"
              >
                Healthcare Provider? Sign in to Doctor Portal &rarr;
              </a>
            </div>
          </div>
        )}

        {method === 'email' && (
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-xs font-semibold text-neutral-700">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-neutral-200 px-4 py-2.5 text-sm focus:border-neutral-950 focus:outline-none"
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1.5 block text-xs font-semibold text-neutral-700">
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-neutral-200 px-4 py-2.5 text-sm focus:border-neutral-950 focus:outline-none"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center rounded-lg bg-neutral-950 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:opacity-50 cursor-pointer"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Sign In'}
            </button>
            <button
              type="button"
              onClick={() => setMethod('options')}
              className="w-full text-center text-xs text-neutral-500 hover:text-neutral-900 cursor-pointer"
            >
              Back to all sign-in options
            </button>
          </form>
        )}

        {method === 'phone' && !confirmationResult && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label htmlFor="phone" className="mb-2 block text-sm font-medium text-neutral-700">
                Phone Number (with country code)
              </label>
              <input
                id="phone"
                type="tel"
                placeholder="+1234567890"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full rounded-lg border border-neutral-200 px-4 py-3 text-sm focus:border-neutral-950 focus:outline-none"
                required
              />
            </div>
            <div id="recaptcha-container"></div>
            <button
              type="submit"
              disabled={loading || !phoneNumber}
              className="flex w-full items-center justify-center rounded-lg bg-neutral-950 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Send Code'}
            </button>
            <button
              type="button"
              onClick={() => setMethod('options')}
              className="w-full text-center text-sm text-neutral-500 hover:text-neutral-900"
            >
              Back to all options
            </button>
          </form>
        )}

        {method === 'phone' && confirmationResult && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label htmlFor="otp" className="mb-2 block text-sm font-medium text-neutral-700">
                Verification Code
              </label>
              <input
                id="otp"
                type="text"
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full rounded-lg border border-neutral-200 px-4 py-3 text-sm focus:border-neutral-950 focus:outline-none text-center tracking-[0.2em] font-mono text-lg"
                required
                maxLength={6}
              />
            </div>
            <button
              type="submit"
              disabled={loading || otp.length < 6}
              className="flex w-full items-center justify-center rounded-lg bg-neutral-950 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Verify Code'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

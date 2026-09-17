import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithPopup, signInWithPhoneNumber, RecaptchaVerifier, ConfirmationResult } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { Loader2, Mail, Phone, Smartphone } from 'lucide-react';

export default function Login() {
  const [method, setMethod] = useState<'options' | 'phone'>('options');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError('');
      await signInWithPopup(auth, googleProvider);
      navigate('/');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to sign in with Google');
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
          <div className="space-y-4">
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="flex w-full items-center justify-center gap-3 rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Mail className="h-5 w-5" />}
              Continue with Google
            </button>
            <button
              onClick={() => setMethod('phone')}
              disabled={loading}
              className="flex w-full items-center justify-center gap-3 rounded-lg bg-neutral-950 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:opacity-50"
            >
              <Smartphone className="h-5 w-5" />
              Continue with Phone Number
            </button>
          </div>
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

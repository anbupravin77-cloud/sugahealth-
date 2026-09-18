import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  signUpWithEmail,
  signInWithEmail,
  signOut,
  getSession,
  resetPasswordForEmail,
  signInWithGoogle,
  bootstrapProfile,
  fetchCurrentProfile,
  SupabaseUserProfile,
} from '../lib/supabaseAuth';
import { isAuthTestEnabled } from '../lib/authConfig';
import type { Session, User } from '@supabase/supabase-js';
import {
  Shield,
  Key,
  LogOut,
  UserCheck,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Mail,
  Smartphone,
  Trash2,
  ArrowRight,
  Info,
} from 'lucide-react';

export default function AuthTest() {
  const navigate = useNavigate();
  const enabled = isAuthTestEnabled();

  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<SupabaseUserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [mode, setMode] = useState<'signin' | 'signup'>('signup');
  const [email, setEmail] = useState('test_patient_1@sugahealth.test');
  const [password, setPassword] = useState('Passw0rd!123456');
  const [firstName, setFirstName] = useState('Jane');
  const [lastName, setLastName] = useState('Doe');
  const [actionLoading, setActionLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Security test states
  const [tamperResult, setTamperResult] = useState<string | null>(null);
  const [resetResult, setResetResult] = useState<any>(null);

  // Load active session and profile
  const syncSession = async () => {
    try {
      const activeSession = await getSession();
      setSession(activeSession);
      setUser(activeSession?.user || null);

      if (activeSession?.access_token) {
        const userProfile = await fetchCurrentProfile(activeSession.access_token);
        setProfile(userProfile);
      } else {
        setProfile(null);
      }
    } catch (err: any) {
      console.error('[AuthTest] Sync error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!enabled) {
      navigate('/', { replace: true });
      return;
    }

    syncSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user || null);
      if (newSession?.access_token) {
        const userProfile = await fetchCurrentProfile(newSession.access_token);
        setProfile(userProfile);
      } else {
        setProfile(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [enabled, navigate]);

  if (!enabled) {
    return null;
  }

  // 1. Sign Up Handler
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setStatusMessage(null);

    try {
      const { user: newUser, session: newSession } = await signUpWithEmail(
        { email, password },
        { firstName, lastName }
      );

      let bootstrapped: SupabaseUserProfile | null = null;
      if (newSession?.access_token) {
        bootstrapped = await bootstrapProfile(newSession.access_token, { firstName, lastName });
        setProfile(bootstrapped);
      }

      setStatusMessage({
        type: 'success',
        text: `Sign up completed for ${email}! User ID: ${newUser?.id || 'pending'}. Default role: ${bootstrapped?.role || 'patient'}.`,
      });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Sign up failed.' });
    } finally {
      setActionLoading(false);
      await syncSession();
    }
  };

  // 2. Sign In Handler
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setStatusMessage(null);

    try {
      const { user: signedInUser, session: activeSession } = await signInWithEmail({ email, password });
      if (activeSession?.access_token) {
        const p = await fetchCurrentProfile(activeSession.access_token);
        setProfile(p);
      }
      setStatusMessage({
        type: 'success',
        text: `Authenticated successfully as ${signedInUser.email}! Session token acquired.`,
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Authentication failed. Please check credentials.',
      });
    } finally {
      setActionLoading(false);
      await syncSession();
    }
  };

  // 3. Sign Out Handler
  const handleSignOut = async () => {
    setActionLoading(true);
    try {
      await signOut();
      setSession(null);
      setUser(null);
      setProfile(null);
      setStatusMessage({ type: 'info', text: 'Client session successfully destroyed. User is unauthenticated.' });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // 4. Password Reset
  const handlePasswordReset = async () => {
    if (!email) {
      setStatusMessage({ type: 'error', text: 'Please provide an email address for password reset.' });
      return;
    }
    setActionLoading(true);
    try {
      await resetPasswordForEmail(email);
      setStatusMessage({ type: 'success', text: `Password reset instructions dispatched to ${email}.` });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // 5. Google OAuth Trigger
  const handleGoogleOAuth = async () => {
    setActionLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setStatusMessage({
        type: 'info',
        text: `Google OAuth initiated: ${err.message || 'Provider configuration pending in Supabase Dashboard.'}`,
      });
    } finally {
      setActionLoading(false);
    }
  };

  // 6. Security Test: Role Escalation Tampering Check
  const handleTamperRole = async () => {
    if (!user) {
      setTamperResult('Error: Sign in as a test patient before attempting role escalation.');
      return;
    }

    setTamperResult('Attempting unauthorized role escalation via client SDK: role = "admin"...');
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ role: 'admin' })
        .eq('id', user.id)
        .select();

      if (error) {
        setTamperResult(`BLOCKED BY ROW LEVEL SECURITY: ${error.message} (Code: ${error.code})`);
      } else if (data && data.length > 0 && data[0].role === 'admin') {
        setTamperResult('CRITICAL WARNING: Escalation was NOT blocked. Inspect RLS rules!');
      } else {
        setTamperResult('BLOCKED: 0 rows modified. Server prevented role tampering.');
      }
    } catch (err: any) {
      setTamperResult(`BLOCKED: ${err.message}`);
    }
  };

  // 7. Fresh Reset Test Account
  const handleResetAccount = async (targetEmail: string) => {
    setActionLoading(true);
    setResetResult(null);
    try {
      const res = await fetch('/api/auth/test/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Reset failed with HTTP ${res.status}`);
      }

      setResetResult(data);
      if (user?.email?.toLowerCase() === targetEmail.toLowerCase()) {
        await handleSignOut();
      }
    } catch (err: any) {
      setResetResult({ success: false, error: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // 8. Quick Provision Designated Account
  const handleQuickProvision = async (designatedEmail: string) => {
    setActionLoading(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/auth/test/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: designatedEmail, password: 'Passw0rd!123456' }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Provisioning failed');
      }
      setEmail(designatedEmail);
      setPassword('Passw0rd!123456');
      setStatusMessage({
        type: 'success',
        text: `Provisioned ${designatedEmail} (role: ${data.role}). Ready to sign in.`,
      });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-stone-200 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium mb-3">
                <Shield className="w-3.5 h-3.5" />
                Phase 4 — Supabase Auth Foundation & Testing
              </div>
              <h1 className="text-2xl sm:text-3xl font-serif text-stone-900">
                Supabase Auth Verification Lab
              </h1>
              <p className="text-sm text-stone-600 mt-1">
                Isolated sandbox for validating authentication, session persistence, role bootstrapping, and fresh test-account resets.
              </p>
            </div>
            <div className="text-right">
              <span className="inline-block px-3 py-1 bg-amber-50 text-amber-800 text-xs font-mono rounded-md border border-amber-200">
                PROD MODE: FIREBASE ACTIVE
              </span>
            </div>
          </div>

          <div className="mt-4 p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-600 flex items-start gap-2">
            <Info className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" />
            <div>
              <strong>Safety Isolation:</strong> This test suite runs on Supabase Auth without modifying existing Firebase Auth users or production routing. Real production credentials remain untouched.
            </div>
          </div>
        </div>

        {/* Active Session Card */}
        <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between border-b border-stone-100 pb-4 mb-4">
            <h2 className="text-lg font-medium flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-600" />
              Active Supabase Session State
            </h2>
            <button
              onClick={syncSession}
              disabled={loading}
              className="inline-flex items-center gap-1.5 text-xs text-stone-600 hover:text-stone-900 border border-stone-200 rounded-lg px-2.5 py-1.5 bg-stone-50 hover:bg-stone-100 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Sync Session
            </button>
          </div>

          {user ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                  <div className="text-xs text-stone-500">Authenticated Email</div>
                  <div className="text-sm font-medium text-stone-900 truncate">{user.email}</div>
                </div>
                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                  <div className="text-xs text-stone-500">Verified Role (Server DB)</div>
                  <div className="text-sm font-medium">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                      profile?.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                      profile?.role === 'doctor' ? 'bg-blue-100 text-blue-800' :
                      profile?.role === 'pharmacist' ? 'bg-amber-100 text-amber-800' :
                      'bg-emerald-100 text-emerald-800'
                    }`}>
                      {profile?.role || 'patient (default)'}
                    </span>
                  </div>
                </div>
                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                  <div className="text-xs text-stone-500">User ID (UUID)</div>
                  <div className="text-xs font-mono text-stone-700 truncate">{user.id}</div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <span className="text-xs text-stone-500">
                  Session Token: <code className="bg-stone-100 px-1.5 py-0.5 rounded">{session?.access_token ? `${session.access_token.slice(0, 16)}...` : 'None'}</code>
                </span>
                <button
                  onClick={handleSignOut}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 text-xs font-medium transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out (Test D)
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-stone-500 text-sm">
              <Lock className="w-8 h-8 text-stone-300 mx-auto mb-2" />
              Unauthenticated. No active Supabase session in client memory.
            </div>
          )}
        </div>

        {/* Status Notification */}
        {statusMessage && (
          <div className={`p-4 rounded-xl border flex items-start gap-3 ${
            statusMessage.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
            statusMessage.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
            'bg-blue-50 border-blue-200 text-blue-800'
          }`}>
            {statusMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" /> : <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />}
            <div className="text-sm font-medium">{statusMessage.text}</div>
          </div>
        )}

        {/* Test Suites Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Box 1: Email / Password Authentication */}
          <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-md font-medium text-stone-900 flex items-center gap-2">
                <Key className="w-4 h-4 text-stone-700" />
                Tests A, B, E: Email Authentication
              </h3>
              <div className="flex rounded-lg bg-stone-100 p-0.5 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className={`px-2.5 py-1 rounded-md transition ${mode === 'signup' ? 'bg-white shadow-xs text-stone-900' : 'text-stone-600'}`}
                >
                  Sign Up (A)
                </button>
                <button
                  type="button"
                  onClick={() => setMode('signin')}
                  className={`px-2.5 py-1 rounded-md transition ${mode === 'signin' ? 'bg-white shadow-xs text-stone-900' : 'text-stone-600'}`}
                >
                  Sign In (B)
                </button>
              </div>
            </div>

            <form onSubmit={mode === 'signup' ? handleSignUp : handleSignIn} className="space-y-3">
              {mode === 'signup' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-stone-600 block mb-1">First Name</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={e => setFirstName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-stone-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-stone-600 block mb-1">Last Name</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={e => setLastName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-stone-400"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs text-stone-600 block mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@sugahealth.test"
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-stone-400"
                />
              </div>

              <div>
                <label className="text-xs text-stone-600 block mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-stone-400"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-stone-900 text-white rounded-xl text-xs font-medium hover:bg-stone-800 transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {mode === 'signup' ? 'Sign Up New User (A)' : 'Sign In User (B)'}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={handlePasswordReset}
                  disabled={actionLoading}
                  className="text-xs text-stone-600 hover:text-stone-900 underline"
                >
                  Reset Password (E)
                </button>
              </div>
            </form>

            <div className="pt-3 border-t border-stone-100 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleGoogleOAuth}
                className="flex-1 px-3 py-2 border border-stone-200 rounded-xl text-xs font-medium hover:bg-stone-50 flex items-center justify-center gap-2"
              >
                <Mail className="w-3.5 h-3.5" />
                Google OAuth (H)
              </button>
              <div className="px-3 py-2 bg-stone-100 rounded-xl text-xs text-stone-500 flex items-center gap-1.5" title="SMS Provider pending">
                <Smartphone className="w-3.5 h-3.5" />
                Phone OTP: Pending SMS
              </div>
            </div>
          </div>

          {/* Box 2: Security & Role Tampering (Test F) */}
          <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs space-y-4">
            <div className="border-b border-stone-100 pb-3">
              <h3 className="text-md font-medium text-stone-900 flex items-center gap-2">
                <Shield className="w-4 h-4 text-purple-700" />
                Test F: Role Escalation Tampering Check
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Verifies that an authenticated client cannot grant themselves doctor, pharmacist, or admin privileges.
              </p>
            </div>

            <div className="p-3 bg-stone-50 rounded-xl text-xs text-stone-600 space-y-2">
              <div><strong>Active Role:</strong> {profile?.role || 'Unauthenticated'}</div>
              <div><strong>Action:</strong> Executes <code>supabase.from('profiles').update(&#123; role: 'admin' &#125;)</code> directly from browser client.</div>
            </div>

            <button
              onClick={handleTamperRole}
              disabled={!user || actionLoading}
              className="w-full px-4 py-2.5 rounded-xl border border-purple-200 bg-purple-50 text-purple-800 text-xs font-medium hover:bg-purple-100 transition disabled:opacity-50"
            >
              Simulate Role Escalation Attack (Test F)
            </button>

            {tamperResult && (
              <div className="p-3 rounded-xl bg-stone-900 text-stone-100 font-mono text-xs overflow-x-auto">
                {tamperResult}
              </div>
            )}
          </div>
        </div>

        {/* Box 3: Fresh Test-Account Reset System (Test G) */}
        <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs space-y-4">
          <div className="border-b border-stone-100 pb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-md font-medium text-stone-900 flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-red-600" />
                Test G: Fresh Test-Account Purge & Reset Service
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Safely purges test accounts and relational records. Protected by strict allowlist (<code>@sugahealth.test</code>) and production fail-closed guard.
              </p>
            </div>
            <span className="text-xs font-mono px-2.5 py-1 bg-stone-100 text-stone-700 rounded-md border border-stone-200">
              Scope: @sugahealth.test only
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { email: 'patient@sugahealth.test', role: 'patient', label: 'Patient Test' },
              { email: 'doctor@sugahealth.test', role: 'doctor', label: 'Doctor Test' },
              { email: 'pharmacist@sugahealth.test', role: 'pharmacist', label: 'Pharmacist Test' },
              { email: 'admin@sugahealth.test', role: 'admin', label: 'Admin Test' },
            ].map(acc => (
              <div key={acc.email} className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                <div className="text-xs font-semibold text-stone-800">{acc.label}</div>
                <div className="text-xs font-mono text-stone-500 truncate">{acc.email}</div>
                <div className="flex gap-1.5 pt-1">
                  <button
                    onClick={() => handleQuickProvision(acc.email)}
                    className="flex-1 py-1 px-2 bg-stone-200 hover:bg-stone-300 rounded-lg text-2xs font-medium text-stone-800 transition"
                  >
                    Provision
                  </button>
                  <button
                    onClick={() => handleResetAccount(acc.email)}
                    className="py-1 px-2 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg text-2xs font-medium transition"
                  >
                    Reset (G)
                  </button>
                </div>
              </div>
            ))}
          </div>

          {resetResult && (
            <div className={`p-4 rounded-xl text-xs font-mono border ${
              resetResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-red-50 border-red-200 text-red-900'
            }`}>
              <div className="font-semibold mb-1">Reset Operation Log:</div>
              <pre className="overflow-x-auto whitespace-pre-wrap">{JSON.stringify(resetResult, null, 2)}</pre>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

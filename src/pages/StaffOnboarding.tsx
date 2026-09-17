import { useState, useEffect, FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth, Address } from '../context/AuthContext';
import { Loader2, ArrowRight } from 'lucide-react';

export default function StaffOnboarding() {
  const { user, profile, staffProfile, loading, refreshProfile } = useAuth();
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [initials, setInitials] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [professionalAddress, setProfessionalAddress] = useState<Omit<Address, 'recipientName'>>({
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'United States',
    phoneNumber: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Auto-fill initials when name changes
  useEffect(() => {
    if (firstName && lastName && !initials) {
      setInitials(`${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase());
    }
  }, [firstName, lastName]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-900" />
      </div>
    );
  }

  // Not logged in or patient -> go away
  if (!user || !profile || profile.role === 'patient') {
    return <Navigate to="/" replace />;
  }

  // Already completed -> go to appropriate dashboard
  if (staffProfile?.onboardingStatus === 'completed') {
    return <Navigate to={profile.role === 'admin' ? '/admin' : '/account'} replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setSubmitting(true);
    setError('');

    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/staff/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          firstName,
          lastName,
          initials,
          phoneNumber,
          professionalAddress
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to complete onboarding');
      }

      await refreshProfile();
      // After refresh, the component will re-render and navigate away because onboardingStatus is completed
    } catch (err: any) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 py-12 px-4 sm:px-6 lg:px-8 flex flex-col pt-24">
      <div className="max-w-2xl mx-auto w-full">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black tracking-tight text-neutral-900 uppercase">
            Staff Setup
          </h1>
          <p className="mt-2 text-neutral-500">
            Welcome to Suga.Health. Please complete your professional profile to activate your {profile.role} account.
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-neutral-200">
          
          {error && (
            <div className="mb-6 bg-red-50 text-red-800 p-4 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <h2 className="text-lg font-semibold text-neutral-900 border-b border-neutral-100 pb-2">
              Identity & Contact
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Legal First Name</label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  className="w-full px-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-950"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Legal Last Name</label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  className="w-full px-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-950"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Initials</label>
                <input
                  type="text"
                  required
                  value={initials}
                  onChange={e => setInitials(e.target.value.toUpperCase())}
                  maxLength={3}
                  className="w-full px-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-950"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Professional Phone</label>
                <input
                  type="tel"
                  required
                  value={phoneNumber}
                  onChange={e => setPhoneNumber(e.target.value)}
                  className="w-full px-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-950"
                />
              </div>
            </div>

            <h2 className="text-lg font-semibold text-neutral-900 border-b border-neutral-100 pb-2 mt-8">
              Professional Address
            </h2>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Address Line 1</label>
              <input
                type="text"
                required
                value={professionalAddress.line1}
                onChange={e => setProfessionalAddress({...professionalAddress, line1: e.target.value})}
                className="w-full px-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-950"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">City</label>
                <input
                  type="text"
                  required
                  value={professionalAddress.city}
                  onChange={e => setProfessionalAddress({...professionalAddress, city: e.target.value})}
                  className="w-full px-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-950"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">State</label>
                <input
                  type="text"
                  required
                  value={professionalAddress.state}
                  onChange={e => setProfessionalAddress({...professionalAddress, state: e.target.value})}
                  className="w-full px-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-950"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">ZIP Code</label>
                <input
                  type="text"
                  required
                  value={professionalAddress.postalCode}
                  onChange={e => setProfessionalAddress({...professionalAddress, postalCode: e.target.value})}
                  className="w-full px-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-950"
                />
              </div>
            </div>

            <div className="pt-6 border-t border-neutral-100">
              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 bg-neutral-950 text-white px-6 py-3 rounded-xl font-bold tracking-wide hover:bg-neutral-800 disabled:opacity-50 transition-colors"
              >
                {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                  <>
                    Complete Setup <ArrowRight size={18} />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

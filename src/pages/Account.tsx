import { useState, useEffect, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, Address } from '../context/AuthContext';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { supabase } from '../lib/supabase';
import { Loader2, CheckCircle2, User, MapPin, FileText, ArrowRight, ShoppingBag, Bell, Repeat, Pill } from 'lucide-react';
import { PatientDocumentList } from './PatientDocumentList';
import { OrdersList } from './patient/OrdersList';
import SubscriptionsList from './patient/SubscriptionsList';
import { NotificationPreferences } from './patient/NotificationPreferences';

export default function Account() {
  const { user, profile, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'personal' | 'shipping' | 'consultations' | 'orders' | 'subscriptions' | 'notifications'>('personal');
  
  // Consultations State
  const [consultations, setConsultations] = useState<any[]>([]);
  const [loadingConsultations, setLoadingConsultations] = useState(false);
  
  // Personal Info Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dob, setDob] = useState('');
  const [sex, setSex] = useState<'male' | 'female' | 'other' | 'prefer-not-to-say' | ''>('');
  
  // Shipping Form State
  const [shipping, setShipping] = useState<Address>({
    recipientName: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'United States',
    phoneNumber: ''
  });

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Load existing profile data
  useEffect(() => {
    if (profile) {
      setFirstName(profile.firstName || '');
      setLastName(profile.lastName || '');
      setDob(profile.dateOfBirth || '');
      setSex(profile.sex || '');
      
      if (profile.shippingAddress) {
        setShipping({
          recipientName: profile.shippingAddress.recipientName || '',
          line1: profile.shippingAddress.line1 || '',
          line2: profile.shippingAddress.line2 || '',
          city: profile.shippingAddress.city || '',
          state: profile.shippingAddress.state || '',
          postalCode: profile.shippingAddress.postalCode || '',
          country: profile.shippingAddress.country || 'United States',
          phoneNumber: profile.shippingAddress.phoneNumber || ''
        });
      }
    }
  }, [profile]);

  // Fetch consultations when tab is active
  useEffect(() => {
    if (activeTab === 'consultations') {
      setLoadingConsultations(true);

      const fetchBoth = async () => {
        const results: any[] = [];

        // 1. Fetch Supabase clinical consultations
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            const res = await fetch('/api/clinical/consultations/patient', {
              headers: { 'Authorization': `Bearer ${session.access_token}` },
            });
            if (res.ok) {
              const data = await res.json();
              if (data.consultations) {
                data.consultations.forEach((sc: any) => {
                  results.push({
                    id: sc.id,
                    primaryConcern: sc.primary_concern,
                    status: sc.status,
                    updatedAt: sc.updated_at || sc.created_at,
                    isSupabase: true,
                    selectedOption: sc.selected_medication_option,
                  });
                });
              }
            }
          }
        } catch (err) {
          console.warn('Clinical consultations fetch error:', err);
        }

        // 2. Fetch Firestore consultations (if user exists in firebase)
        if (user) {
          try {
            const q = query(
              collection(db, 'consultations'),
              where('patientId', '==', user.uid)
            );
            const snapshot = await getDocs(q);
            snapshot.docs.forEach((doc) => {
              if (!results.some((r) => r.id === doc.id)) {
                results.push({ id: doc.id, ...doc.data() });
              }
            });
          } catch (err) {
            console.warn('Firestore consultations fetch error:', err);
          }
        }

        results.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
        setConsultations(results);
        setLoadingConsultations(false);
      };

      fetchBoth();
    }
  }, [activeTab, user]);

  const handleSavePersonalInfo = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      
      const token = await user.getIdToken();
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          firstName,
          lastName,
          dateOfBirth: dob,
          sex
        })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save personal information.');
      }
      
      await refreshProfile();
      setSuccess('Personal information saved successfully.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to save personal information.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveShipping = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      
      const token = await user.getIdToken();
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          shippingAddress: shipping
        })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save shipping address.');
      }
      
      await refreshProfile();
      setSuccess('Shipping address saved successfully.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to save shipping address.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-background pt-[90px] min-h-screen">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900">My Account</h1>
          <p className="mt-2 text-sm text-neutral-500">
            Manage your personal information and shipping details.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Sidebar Nav */}
          <div className="md:col-span-1 space-y-2">
            <button
              onClick={() => setActiveTab('personal')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'personal'
                  ? 'bg-neutral-950 text-white'
                  : 'text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              <User size={18} />
              Personal Info
            </button>
            <button
              onClick={() => setActiveTab('shipping')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'shipping'
                  ? 'bg-neutral-950 text-white'
                  : 'text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              <MapPin size={18} />
              Shipping Address
            </button>
            <button
              onClick={() => setActiveTab('consultations')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'consultations'
                  ? 'bg-neutral-950 text-white'
                  : 'text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              <FileText size={18} />
              Consultations
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'orders'
                  ? 'bg-neutral-950 text-white'
                  : 'text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              <ShoppingBag size={18} />
              Orders
            </button>
            <button
              onClick={() => setActiveTab('subscriptions')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'subscriptions'
                  ? 'bg-neutral-950 text-white'
                  : 'text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              <Repeat size={18} />
              Subscriptions
            </button>
            <button
              onClick={() => setActiveTab('notifications')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'notifications'
                  ? 'bg-neutral-950 text-white'
                  : 'text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              <Bell size={18} />
              Notifications
            </button>
          </div>

          {/* Main Content Area */}
          <div className="md:col-span-3">
            <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-neutral-200">
              
              {/* Status Messages */}
              {success && (
                <div className="mb-6 flex items-center gap-2 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800">
                  <CheckCircle2 size={18} className="text-emerald-500" />
                  {success}
                </div>
              )}
              {error && (
                <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-800">
                  {error}
                </div>
              )}

              {/* Consultations Tab */}
              {activeTab === 'consultations' && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-neutral-900">My Consultations</h2>
                    <Link
                      to="/consultation"
                      className="text-xs font-bold uppercase tracking-wider bg-neutral-950 text-white px-4 py-2 rounded-lg hover:bg-neutral-800 transition-colors"
                    >
                      Start New
                    </Link>
                  </div>
                  
                  {loadingConsultations ? (
                    <div className="py-12 flex justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
                    </div>
                  ) : consultations.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-neutral-200 rounded-xl">
                      <FileText size={32} className="mx-auto text-neutral-300 mb-3" />
                      <h3 className="text-sm font-medium text-neutral-900 mb-1">No Consultations Yet</h3>
                      <p className="text-xs text-neutral-500 max-w-sm mx-auto mb-4">
                        Start a new consultation to begin your treatment journey with our clinical team.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {consultations.map((c) => (
                        <div key={c.id} className="border border-neutral-200 rounded-xl p-5 hover:border-neutral-300 transition-colors">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-neutral-900 capitalize">
                                  {c.primaryConcern === 'weight' ? 'Medical Weight Loss' : 
                                   c.primaryConcern === 'hair' ? 'Hair Growth' : 
                                   c.primaryConcern === 'sex' ? 'Sexual Health' : 'General Consultation'}
                                </h3>
                                <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                                  c.status === 'draft' ? 'bg-neutral-100 text-neutral-600' :
                                  c.status === 'submitted' ? 'bg-blue-100 text-blue-700' :
                                  c.status === 'under_review' ? 'bg-amber-100 text-amber-700' :
                                  c.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                                  'bg-neutral-100 text-neutral-600'
                                }`}>
                                  {c.status.replace('_', ' ')}
                                </span>
                              </div>
                              <p className="text-xs text-neutral-500">
                                Last updated {new Date(c.updatedAt).toLocaleDateString()}
                              </p>
                            </div>
                            
                            {c.status === 'draft' ? (
                              <Link 
                                to="/consultation"
                                className="flex items-center gap-1 text-xs font-bold text-neutral-900 hover:text-neutral-600 transition-colors"
                              >
                                Resume <ArrowRight size={14} />
                              </Link>
                            ) : c.status === 'completed' ? (
                              <Link 
                                to="/consultation"
                                className="flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full hover:bg-emerald-100 transition-colors"
                              >
                                <Pill size={13} className="text-emerald-700" />
                                <span>View Prescriptions</span>
                                <ArrowRight size={13} />
                              </Link>
                            ) : (
                              <span className="text-xs text-neutral-400 font-medium">Under Review</span>
                            )}
                          </div>
                          
                          {c.status !== 'draft' && (
                            <PatientDocumentList consultationId={c.id} />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Personal Info Tab */}
              {activeTab === 'personal' && (
                <form onSubmit={handleSavePersonalInfo} className="space-y-6">
                  <h2 className="text-xl font-semibold text-neutral-900 mb-6">Personal Information</h2>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">First Name</label>
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full rounded-lg border border-neutral-200 px-4 py-2.5 text-sm focus:border-neutral-950 focus:outline-none"
                        placeholder="Legal First Name"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">Last Name</label>
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full rounded-lg border border-neutral-200 px-4 py-2.5 text-sm focus:border-neutral-950 focus:outline-none"
                        placeholder="Legal Last Name"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">Email Address</label>
                      <input
                        type="email"
                        value={profile?.email || ''}
                        disabled
                        className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm text-neutral-500 cursor-not-allowed"
                      />
                      <p className="mt-1.5 text-xs text-neutral-400">Used for account sign-in</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">Phone Number</label>
                      <input
                        type="tel"
                        value={profile?.phoneNumber || ''}
                        disabled
                        className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm text-neutral-500 cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">Date of Birth</label>
                      <input
                        type="date"
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                        className="w-full rounded-lg border border-neutral-200 px-4 py-2.5 text-sm focus:border-neutral-950 focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">Sex Assigned at Birth</label>
                      <select
                        value={sex}
                        onChange={(e) => setSex(e.target.value as any)}
                        className="w-full rounded-lg border border-neutral-200 px-4 py-2.5 text-sm focus:border-neutral-950 focus:outline-none bg-white"
                        required
                      >
                        <option value="" disabled>Select</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                        <option value="prefer-not-to-say">Prefer not to say</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex items-center justify-center rounded-full bg-neutral-950 px-6 py-2.5 text-sm font-bold tracking-wide text-white transition-colors hover:bg-neutral-800 disabled:opacity-50"
                    >
                      {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Save Changes'}
                    </button>
                  </div>
                </form>
              )}

              {/* Shipping Address Tab */}
              {activeTab === 'shipping' && (
                <form onSubmit={handleSaveShipping} className="space-y-6">
                  <h2 className="text-xl font-semibold text-neutral-900 mb-6">Shipping Address</h2>
                  
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">Recipient Name</label>
                    <input
                      type="text"
                      value={shipping.recipientName}
                      onChange={(e) => setShipping({ ...shipping, recipientName: e.target.value })}
                      className="w-full rounded-lg border border-neutral-200 px-4 py-2.5 text-sm focus:border-neutral-950 focus:outline-none"
                      placeholder="Full name for delivery"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">Address Line 1</label>
                    <input
                      type="text"
                      value={shipping.line1}
                      onChange={(e) => setShipping({ ...shipping, line1: e.target.value })}
                      className="w-full rounded-lg border border-neutral-200 px-4 py-2.5 text-sm focus:border-neutral-950 focus:outline-none"
                      placeholder="Street address, P.O. box, etc."
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">Address Line 2 <span className="text-neutral-400 font-normal">(Optional)</span></label>
                    <input
                      type="text"
                      value={shipping.line2}
                      onChange={(e) => setShipping({ ...shipping, line2: e.target.value })}
                      className="w-full rounded-lg border border-neutral-200 px-4 py-2.5 text-sm focus:border-neutral-950 focus:outline-none"
                      placeholder="Apartment, suite, unit, building, floor, etc."
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">City</label>
                      <input
                        type="text"
                        value={shipping.city}
                        onChange={(e) => setShipping({ ...shipping, city: e.target.value })}
                        className="w-full rounded-lg border border-neutral-200 px-4 py-2.5 text-sm focus:border-neutral-950 focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">State / Province</label>
                      <input
                        type="text"
                        value={shipping.state}
                        onChange={(e) => setShipping({ ...shipping, state: e.target.value })}
                        className="w-full rounded-lg border border-neutral-200 px-4 py-2.5 text-sm focus:border-neutral-950 focus:outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">ZIP / Postal Code</label>
                      <input
                        type="text"
                        value={shipping.postalCode}
                        onChange={(e) => setShipping({ ...shipping, postalCode: e.target.value })}
                        className="w-full rounded-lg border border-neutral-200 px-4 py-2.5 text-sm focus:border-neutral-950 focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">Country</label>
                      <select
                        value={shipping.country}
                        onChange={(e) => setShipping({ ...shipping, country: e.target.value })}
                        className="w-full rounded-lg border border-neutral-200 px-4 py-2.5 text-sm focus:border-neutral-950 focus:outline-none bg-white"
                        required
                      >
                        <option value="United States">United States</option>
                        {/* Only US for now, extensible later */}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">Contact Phone <span className="text-neutral-400 font-normal">(Optional)</span></label>
                    <input
                      type="tel"
                      value={shipping.phoneNumber}
                      onChange={(e) => setShipping({ ...shipping, phoneNumber: e.target.value })}
                      className="w-full rounded-lg border border-neutral-200 px-4 py-2.5 text-sm focus:border-neutral-950 focus:outline-none"
                      placeholder="For delivery updates"
                    />
                  </div>

                  <div className="pt-4 flex justify-end">
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex items-center justify-center rounded-full bg-neutral-950 px-6 py-2.5 text-sm font-bold tracking-wide text-white transition-colors hover:bg-neutral-800 disabled:opacity-50"
                    >
                      {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Save Address'}
                    </button>
                  </div>
                </form>
              )}

              {/* Orders Tab */}
              {activeTab === 'orders' && (
                <div>
                  <h2 className="text-xl font-semibold text-neutral-900 mb-6">My Orders</h2>
                  <OrdersList />
                </div>
              )}

              
              {/* Subscriptions Tab */}
              {activeTab === 'subscriptions' && (
                <div>
                  <h2 className="text-xl font-semibold text-neutral-900 mb-6">Subscriptions & Treatment Plans</h2>
                  <SubscriptionsList />
                </div>
              )}

              {/* Notifications Tab */}
              {activeTab === 'notifications' && (
                <div>
                  <h2 className="text-xl font-semibold text-neutral-900 mb-6">Notification Preferences</h2>
                  <NotificationPreferences />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

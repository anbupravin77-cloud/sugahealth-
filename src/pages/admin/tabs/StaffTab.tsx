import { useState, useEffect, FormEvent } from 'react';
import { useAuth, StaffProfile } from '../../../context/AuthContext';
import { supabase } from '../../../lib/supabase';
import { Loader2, UserPlus, Shield, CheckCircle2, Mail, Check } from 'lucide-react';

const CLINICAL_SPECIALTY_OPTIONS = [
  'Medical Weight Loss',
  'Hair Regrowth',
  'Sexual Health',
  'Longevity & Performance',
  'Primary / General Medicine'
];

export function StaffTab() {
  const { user } = useAuth();
  const [staff, setStaff] = useState<StaffProfile[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [showCreate, setShowCreate] = useState(false);
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<'doctor' | 'pharmacist' | 'admin'>('doctor');
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [setupLink, setSetupLink] = useState('');

  const getAuthToken = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) return session.access_token;
    } catch {}
    if (user) {
      try {
        return await user.getIdToken();
      } catch {}
    }
    return null;
  };

  const fetchStaff = async () => {
    try {
      const token = await getAuthToken();
      if (!token) return;
      const res = await fetch('/api/admin/staff', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch staff');
      const data = await res.json();
      setStaff(data.staff || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, [user]);

  const toggleSpecialty = (spec: string) => {
    setSelectedSpecialties(prev => 
      prev.includes(spec) ? prev.filter(s => s !== spec) : [...prev, spec]
    );
  };

  const handleCreateStaff = async (e: FormEvent) => {
    e.preventDefault();
    
    setSubmitting(true);
    setError('');
    setSuccess('');
    setSetupLink('');
    
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Authentication session required');

      const res = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          email: email.trim(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          role,
          specialties: role === 'doctor' ? selectedSpecialties : null
        })
      });
      
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to create staff');
      
      setSuccess('Staff account provisioned successfully.');
      setSetupLink(data.setupLink || '');
      
      // Reset form
      setEmail('');
      setFirstName('');
      setLastName('');
      setSelectedSpecialties([]);
      setShowCreate(false);
      
      fetchStaff();
    } catch (err: any) {
      setError(err.message || 'Failed to provision staff account');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (uid: string, currentActive: boolean) => {
    try {
      const token = await getAuthToken();
      if (!token) return;
      const res = await fetch(`/api/admin/staff/${uid}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ active: !currentActive })
      });
      if (!res.ok) throw new Error('Failed to update status');
      fetchStaff();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-neutral-900">Staff Management</h2>
          <p className="text-sm text-neutral-500 mt-1">Provision and manage internal staff accounts.</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 bg-neutral-950 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-neutral-800 transition-colors"
        >
          <UserPlus size={16} />
          {showCreate ? 'Cancel' : 'Provision Staff'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-800 p-4 rounded-lg text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 text-emerald-800 p-4 rounded-lg text-sm border border-emerald-100">
          <div className="flex items-center gap-2 font-bold mb-2">
            <CheckCircle2 size={18} className="text-emerald-500" />
            {success}
          </div>
          {setupLink && (
            <div className="mt-2 bg-white p-3 rounded border border-emerald-200">
              <p className="text-xs text-neutral-500 mb-1 font-semibold uppercase tracking-wider">Secure Access Link:</p>
              <div className="flex items-center gap-2">
                <code className="text-xs break-all bg-neutral-50 px-2 py-1 rounded border border-neutral-100 flex-1">
                  {setupLink}
                </code>
                <button
                  onClick={() => navigator.clipboard.writeText(setupLink)}
                  className="shrink-0 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 px-3 py-1 rounded text-xs font-medium"
                >
                  Copy
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {showCreate && (
        <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-6">
          <h3 className="font-semibold text-neutral-900 mb-4">Provision New Staff Account</h3>
          <form onSubmit={handleCreateStaff} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">First Name</label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  placeholder="e.g. Priya"
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-neutral-950 bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">Last Name</label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  placeholder="e.g. Sharma"
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-neutral-950 bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="doctor@suga.health"
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-neutral-950 bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">Role</label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value as any)}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-neutral-950 bg-white"
                >
                  <option value="doctor">Doctor</option>
                  <option value="pharmacist">Pharmacist</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            
            {role === 'doctor' && (
              <div className="pt-2">
                <label className="block text-xs font-medium text-neutral-700 mb-2">
                  Clinical Specialties (Select all that apply)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-white p-3 rounded-lg border border-neutral-200">
                  {CLINICAL_SPECIALTY_OPTIONS.map((spec) => {
                    const isSelected = selectedSpecialties.includes(spec);
                    return (
                      <button
                        key={spec}
                        type="button"
                        onClick={() => toggleSpecialty(spec)}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium text-left transition-colors ${
                          isSelected 
                            ? 'bg-neutral-900 text-white' 
                            : 'bg-neutral-50 text-neutral-700 hover:bg-neutral-100 border border-neutral-200'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-white border-white text-neutral-900' : 'border-neutral-300 bg-white'
                        }`}>
                          {isSelected && <Check size={12} strokeWidth={3} />}
                        </div>
                        <span>{spec}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center justify-center bg-neutral-950 text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-neutral-800 disabled:opacity-50 min-w-[140px]"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Provision Account'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-medium">
              <tr>
                <th className="px-6 py-4">Staff Member</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Onboarding</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {staff.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-neutral-500">
                    No staff provisioned yet.
                  </td>
                </tr>
              ) : (
                staff.map((s) => (
                  <tr key={s.uid || s.id} className="hover:bg-neutral-50/50">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-neutral-900">
                        {s.displayName || (s.firstName || s.lastName ? `${s.firstName || ''} ${s.lastName || ''}`.trim() : 'Staff Member')}
                      </div>
                      <div className="text-xs text-neutral-500 flex items-center gap-1 mt-0.5">
                        <Mail size={12} /> {s.email}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <Shield size={14} className={s.role === 'admin' ? 'text-purple-500' : 'text-neutral-400'} />
                        <span className="capitalize font-medium">{s.role}</span>
                      </div>
                      {s.specialties && s.specialties.length > 0 && (
                        <div className="text-[10px] text-neutral-500 mt-1 max-w-xs truncate" title={s.specialties.join(', ')}>
                          {s.specialties.join(', ')}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        s.active ? 'bg-emerald-100 text-emerald-700' : 'bg-neutral-200 text-neutral-700'
                      }`}>
                        {s.active ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {s.onboardingStatus === 'completed' ? (
                        <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                          <CheckCircle2 size={14} /> Completed
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-xs text-amber-600 font-medium">
                          <Loader2 size={14} /> Pending Setup
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => toggleStatus(s.uid || s.id, s.active)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-md ${
                          s.active 
                            ? 'text-red-600 hover:bg-red-50' 
                            : 'text-emerald-600 hover:bg-emerald-50'
                        }`}
                      >
                        {s.active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

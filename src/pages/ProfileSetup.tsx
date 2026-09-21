import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Loader2, MapPin, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { normalizeIndianPhone } from '../lib/phone';
import { isPatientProfileComplete } from '../lib/profile';
import { supabase } from '../lib/supabase';

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh',
  'Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha',
  'Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
  'Andaman and Nicobar Islands','Chandigarh','Dadra and Nagar Haveli and Daman and Diu','Delhi','Jammu and Kashmir',
  'Ladakh','Lakshadweep','Puducherry'
];

export default function ProfileSetup() {
  const { profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    firstName: '', lastName: '', phone: '', dateOfBirth: '', sex: '', heightCm: '', weightKg: '',
    line1: '', line2: '', city: 'Madurai', state: 'Tamil Nadu', postalCode: '',
  });

  useEffect(() => {
    if (!profile) return;
    const a = profile.shippingAddress;
    setForm({
      firstName: profile.firstName || '',
      lastName: profile.lastName || '',
      phone: profile.phoneNumber || '',
      dateOfBirth: profile.dateOfBirth || '',
      sex: profile.sex || '',
      heightCm: profile.heightCm ? String(profile.heightCm) : '',
      weightKg: profile.weightKg ? String(profile.weightKg) : '',
      line1: a?.line1 || '',
      line2: a?.line2 || '',
      city: a?.city || 'Madurai',
      state: a?.state || 'Tamil Nadu',
      postalCode: a?.postalCode || '',
    });
  }, [profile]);

  const update = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const { normalized, isValid } = normalizeIndianPhone(form.phone);
    if (!isValid || !normalized) return setError('Enter a valid 10-digit Indian mobile number.');
    if (!/^\d{6}$/.test(form.postalCode)) return setError('Enter a valid 6-digit Indian PIN code.');
    const heightCm = Number(form.heightCm);
    const weightKg = Number(form.weightKg);
    if (heightCm < 80 || heightCm > 250) return setError('Enter a valid height in centimetres.');
    if (weightKg < 20 || weightKg > 400) return setError('Enter a valid weight in kilograms.');

    try {
      setSaving(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Your session has expired. Please sign in again.');
      const recipientName = `${form.firstName.trim()} ${form.lastName.trim()}`.trim();
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          firstName: form.firstName.trim(), lastName: form.lastName.trim(), phone: normalized,
          dateOfBirth: form.dateOfBirth, sex: form.sex, heightCm, weightKg, completeProfile: true,
          shippingAddress: {
            recipientName, line1: form.line1.trim(), line2: form.line2.trim(), city: form.city.trim(),
            state: form.state, postalCode: form.postalCode, country: 'India', phoneNumber: normalized,
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.details || 'Could not save your profile.');
      await refreshProfile();
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(err?.message || 'Could not save your profile.');
    } finally {
      setSaving(false);
    }
  };

  if (profile && isPatientProfileComplete(profile)) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-neutral-200 rounded-2xl p-8 text-center">
          <h1 className="text-xl font-bold text-neutral-950">Your profile is ready</h1>
          <p className="text-sm text-neutral-500 mt-2">Your personal and delivery details are already saved.</p>
          <button onClick={() => navigate('/')} className="mt-6 px-5 py-2.5 rounded-full bg-neutral-950 text-white text-sm font-semibold">Continue to Suga.Health</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-neutral-950">
      <header className="bg-white border-b border-neutral-200 px-5 sm:px-8 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div><div className="font-black tracking-tighter text-xl">SUGA<span className="text-neutral-400">.</span>HEALTH</div><div className="text-[10px] tracking-widest text-neutral-500">PROFILE SETUP</div></div>
          <span className="text-xs text-neutral-500">Serving Madurai, Tamil Nadu</span>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
        <div className="mb-7">
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-500"><UserRound size={15}/>First-time setup</span>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mt-2">Complete your profile</h1>
          <p className="text-sm text-neutral-600 mt-2 max-w-2xl">Add your personal and delivery details once. We’ll reuse them during future consultations so you do not have to enter the same information again.</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-white border border-neutral-200 rounded-3xl p-5 sm:p-8 space-y-7">
          {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          <section>
            <h2 className="font-bold flex items-center gap-2"><UserRound size={18}/>Personal information</h2>
            <div className="grid sm:grid-cols-2 gap-4 mt-4">
              <Field label="First name" value={form.firstName} onChange={v => update('firstName', v)} required />
              <Field label="Last name" value={form.lastName} onChange={v => update('lastName', v)} required />
              <Field label="Mobile number" value={form.phone} onChange={v => update('phone', v)} placeholder="9876543210" required />
              <Field label="Date of birth" value={form.dateOfBirth} onChange={v => update('dateOfBirth', v)} type="date" required />
              <label className="text-xs font-semibold text-neutral-700">Gender<select value={form.sex} onChange={e => update('sex', e.target.value)} required className="mt-1.5 w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm bg-white"><option value="">Select</option><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option><option value="prefer-not-to-say">Prefer not to say</option></select></label>
              <Field label="Height (cm)" value={form.heightCm} onChange={v => update('heightCm', v)} type="number" min="80" max="250" required />
              <Field label="Weight (kg)" value={form.weightKg} onChange={v => update('weightKg', v)} type="number" min="20" max="400" required />
            </div>
          </section>
          <section className="border-t border-neutral-100 pt-6">
            <h2 className="font-bold flex items-center gap-2"><MapPin size={18}/>Delivery address</h2>
            <p className="text-xs text-neutral-500 mt-1">Used only when a treatment needs delivery.</p>
            <div className="grid sm:grid-cols-2 gap-4 mt-4">
              <div className="sm:col-span-2"><Field label="Address line 1" value={form.line1} onChange={v => update('line1', v)} required /></div>
              <div className="sm:col-span-2"><Field label="Address line 2 (optional)" value={form.line2} onChange={v => update('line2', v)} /></div>
              <Field label="City" value={form.city} onChange={v => update('city', v)} required />
              <label className="text-xs font-semibold text-neutral-700">State / Union Territory<select value={form.state} onChange={e => update('state', e.target.value)} required className="mt-1.5 w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm bg-white">{INDIAN_STATES.map(s => <option key={s}>{s}</option>)}</select></label>
              <Field label="PIN code" value={form.postalCode} onChange={v => update('postalCode', v.replace(/\D/g,'').slice(0,6))} inputMode="numeric" maxLength={6} required />
              <Field label="Country" value="India" onChange={() => {}} disabled />
            </div>
          </section>
          <button disabled={saving} className="w-full rounded-full bg-neutral-950 hover:bg-neutral-800 text-white py-3.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60">{saving ? <Loader2 size={17} className="animate-spin"/> : <>Save profile and continue <ArrowRight size={17}/></>}</button>
        </form>
      </main>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', ...props }: any) {
  return <label className="text-xs font-semibold text-neutral-700">{label}<input type={type} value={value} onChange={e => onChange(e.target.value)} className="mt-1.5 w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm focus:border-neutral-950 focus:outline-none disabled:bg-neutral-50" {...props}/></label>;
}
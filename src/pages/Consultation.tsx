import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { cn } from '../lib/utils';
import { ChevronLeft, ArrowRight, CheckCircle2, Lock, ArrowLeft, Loader2, Check, AlertCircle, Save, ShieldCheck, Pill, CreditCard, Info } from 'lucide-react';
import { Skeleton } from '../components/ui/Skeleton';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

interface MedicationOption {
  id: string;
  name: string;
  strength: string;
  dosageForm: string;
  priceInr: number;
  description: string;
  isRecommended?: boolean;
}

export default function Consultation() {
  const { user } = useAuth();
  const [draftId, setDraftId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzingStage, setAnalyzingStage] = useState(0);
  const totalSteps = 6;
  const shouldReduceMotion = useReducedMotion();

  // Doctor review / approval state
  const [approvedConsultation, setApprovedConsultation] = useState<any | null>(null);
  const [selectedMedOption, setSelectedMedOption] = useState<MedicationOption | null>(null);
  const [isSelectingOption, setIsSelectingOption] = useState(false);
  const [pharmacyStatus, setPharmacyStatus] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    primaryConcern: 'weight',
    fullName: '',
    email: '',
    phone: '',
    height: '',
    heightUnit: 'cm' as 'inches' | 'cm',
    weight: '',
    weightUnit: 'kg' as 'lbs' | 'kg',
    sex: '' as 'male' | 'female' | 'other' | '',
    conditions: [] as string[],
    medicalHistory: '',
    medications: '',
    allergies: '',
    consentTruth: false,
    consentTelehealth: false,
    consentPrivacy: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch token helper
  const getAccessToken = async (): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) return session.access_token;
    if (user && typeof (user as any).getIdToken === 'function') {
      return (user as any).getIdToken();
    }
    return null;
  };

  // Auto-load draft or active consultation on mount
  useEffect(() => {
    async function loadConsultationData() {
      const token = await getAccessToken();
      if (!token) return;

      try {
        const res = await fetch('/api/clinical/consultations/draft', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
          const data = await res.json();
          if (data.draft) {
            setDraftId(data.draft.id);
            if (data.draft.responses) {
              setFormData((prev) => ({
                ...prev,
                ...data.draft.responses,
                primaryConcern: data.draft.primary_concern || prev.primaryConcern,
              }));
            }
          }
        }
      } catch (err) {
        console.warn('Draft load warning:', err);
      }
    }

    loadConsultationData();
  }, [user]);

  const saveDraft = async (dataToSave = formData) => {
    const token = await getAccessToken();
    if (!token) return;

    setIsSaving(true);
    try {
      const res = await fetch('/api/clinical/consultations/draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          draftId: draftId || undefined,
          primaryConcern: dataToSave.primaryConcern,
          responses: dataToSave,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.draftId) {
          setDraftId(data.draftId);
        }
        setSaveSuccess('Draft saved');
        setTimeout(() => setSaveSuccess(''), 2000);
      }
    } catch (err) {
      console.warn('Failed to save draft:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const nextStep = () => {
    if (step === 1) {
      if (!formData.primaryConcern) {
        setErrors({ primaryConcern: 'Please select a primary concern to continue.' });
        return;
      }
      setErrors({});
      setStep(2);
      saveDraft();
    } else if (step === 2) {
      const newErrors: Record<string, string> = {};
      if (!formData.fullName.trim()) newErrors.fullName = 'Full legal name is required';
      if (!formData.email.trim() || !formData.email.includes('@')) newErrors.email = 'Valid email address is required';
      if (!formData.phone.trim()) newErrors.phone = 'Phone number is required for clinician communications';
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }
      setErrors({});
      setStep(3);
      saveDraft();
    } else if (step === 3) {
      const newErrors: Record<string, string> = {};
      if (!formData.height) newErrors.height = 'Height is required for accurate medical dosing';
      if (!formData.weight) newErrors.weight = 'Weight is required for accurate medical dosing';
      if (!formData.sex) newErrors.sex = 'Biological sex is required';
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }
      setErrors({});
      setStep(4);
      saveDraft();
    } else if (step === 4) {
      if (formData.conditions.length === 0) {
        setErrors({ conditions: 'Please select applicable conditions or "None of the above"' });
        return;
      }
      setErrors({});
      setStep(5);
      saveDraft();
    } else if (step === 5) {
      setErrors({});
      setStep(6);
      saveDraft();
    }
  };

  const prevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    if (!formData.consentTruth || !formData.consentTelehealth || !formData.consentPrivacy) {
      setErrors({ consent: 'All clinical consent and truthfulness statements must be acknowledged.' });
      return;
    }

    setErrors({});
    setIsAnalyzing(true);
    setAnalyzingStage(0);

    try {
      const token = await getAccessToken();
      if (!token) {
        throw new Error('Please sign in to submit your consultation.');
      }

      // 1. Ensure draft is saved in Supabase
      const saveRes = await fetch('/api/clinical/consultations/draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          draftId: draftId || undefined,
          primaryConcern: formData.primaryConcern,
          responses: formData,
        }),
      });

      const saveData = await saveRes.json();
      const finalDraftId = saveData.draftId || draftId;

      if (!finalDraftId) {
        throw new Error('Unable to prepare consultation record.');
      }

      // 2. Submit consultation to clinical workflow (assigns doctor & notifies)
      const submitRes = await fetch(`/api/clinical/consultations/${finalDraftId}/submit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!submitRes.ok) {
        const errorData = await submitRes.json();
        throw new Error(errorData.error || 'Submission failed');
      }

      setTimeout(() => setAnalyzingStage(1), 500);
      setTimeout(() => setAnalyzingStage(2), 1000);
      setTimeout(() => {
        setIsAnalyzing(false);
        setSubmitted(true);
      }, 1600);
    } catch (err: any) {
      console.error('Submission failed:', err);
      setErrors({ consent: err.message || 'Failed to submit consultation. Please try again.' });
      setIsAnalyzing(false);
    }
  };

  const handleSelectOption = async (option: MedicationOption) => {
    if (!draftId) return;
    setIsSelectingOption(true);
    try {
      const token = await getAccessToken();
      const res = await fetch(`/api/clinical/consultations/${draftId}/select-option`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ selectedOption: option }),
      });

      if (res.ok) {
        setSelectedMedOption(option);
        setPharmacyStatus('ready_for_pharmacy');
      }
    } catch (err) {
      console.error('Error selecting option:', err);
    } finally {
      setIsSelectingOption(false);
    }
  };

  const toggleCondition = (cond: string) => {
    setErrors((prev) => {
      const updated = { ...prev };
      delete updated.conditions;
      return updated;
    });

    if (cond === 'None of the above') {
      setFormData((prev) => ({
        ...prev,
        conditions: prev.conditions.includes('None of the above') ? [] : ['None of the above'],
      }));
      return;
    }

    setFormData((prev) => {
      const filtered = prev.conditions.filter((c) => c !== 'None of the above');
      if (filtered.includes(cond)) {
        return { ...prev, conditions: filtered.filter((c) => c !== cond) };
      } else {
        return { ...prev, conditions: [...filtered, cond] };
      }
    });
  };

  const primaryOptions = [
    { id: 'weight', title: 'Medical Weight Loss', desc: 'GLP-1 therapy (Semaglutide / Tirzepatide)' },
    { id: 'hair', title: 'Hair Growth & Density', desc: 'DHT blockers and microvascular stimulators' },
    { id: 'sex', title: 'Sexual Health & Vitality', desc: 'Discreet, clinician-prescribed ED and stamina options' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-neutral-900 selection:text-white">
      {/* Top Header */}
      <header className="border-b border-neutral-200/80 bg-white py-3.5 sm:py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center sticky top-0 z-10">
        <Link to="/" className="flex flex-col items-start select-none">
          <span className="font-sans text-xl tracking-tighter uppercase font-black text-neutral-950 leading-none">
            SUGA<span className="text-neutral-400">.</span>HEALTH
          </span>
          <span className="brand-tagline text-neutral-500 mt-0.5">
            live naturally
          </span>
        </Link>
        <div className="flex items-center gap-4">
          {!submitted && !approvedConsultation && (
            <button
              onClick={() => saveDraft()}
              disabled={isSaving}
              className="text-xs font-bold uppercase tracking-wider text-neutral-600 hover:text-neutral-950 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {saveSuccess || 'Save Draft'}
            </button>
          )}
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-bold text-neutral-700 bg-neutral-100 py-1.5 px-3.5 rounded-full border border-neutral-200">
            <Lock size={13} className="text-neutral-900" />
            <span>Private & Secure</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow flex items-center justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-2xl">
          {/* Approved Consultation & Prescription Options View */}
          {approvedConsultation && (
            <div className="bg-white rounded-3xl border border-neutral-200 p-6 sm:p-10 shadow-xs space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
                <div className="space-y-1">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-2xs font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                    Doctor Approved & Verified
                  </span>
                  <h2 className="text-2xl font-bold text-neutral-950">Clinical Treatment Plan</h2>
                </div>
                {pharmacyStatus === 'ready_for_pharmacy' && (
                  <span className="px-3 py-1 bg-stone-900 text-white rounded-full text-xs font-semibold">
                    Ready for Pharmacy
                  </span>
                )}
              </div>

              {/* Clinician Message */}
              {approvedConsultation.customClinicianMessage && (
                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 text-xs text-stone-700 leading-relaxed space-y-1">
                  <span className="font-semibold text-stone-950 block">Physician Clinical Note:</span>
                  <p>{approvedConsultation.customClinicianMessage}</p>
                </div>
              )}

              {/* Medication Options Selection */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">
                  Available Medication Formulations
                </h3>
                <p className="text-xs text-neutral-500">
                  Select one preferred formulation from your approved treatment plan to prepare for pharmacy dispatch:
                </p>

                <div className="grid grid-cols-1 gap-3 pt-2">
                  {(approvedConsultation.medicationOptions?.options || []).map((opt: MedicationOption) => {
                    const isSelected = selectedMedOption?.id === opt.id || approvedConsultation.selectedOption?.id === opt.id;
                    return (
                      <div
                        key={opt.id}
                        onClick={() => handleSelectOption(opt)}
                        className={cn(
                          'p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between',
                          isSelected
                            ? 'border-stone-900 bg-stone-50/90 ring-1 ring-stone-900'
                            : 'border-neutral-200 bg-white hover:border-neutral-400'
                        )}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-neutral-950">{opt.name}</span>
                            <span className="text-2xs font-semibold px-2 py-0.5 rounded bg-neutral-100 text-neutral-700 border border-neutral-200">
                              {opt.strength}
                            </span>
                            {opt.isRecommended && (
                              <span className="text-3xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                                Doctor Preferred
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-neutral-500">{opt.description}</p>
                        </div>
                        <div className="text-right pl-4 shrink-0">
                          <span className="text-base font-bold text-neutral-950 block font-mono">
                            ₹{opt.priceInr.toLocaleString('en-IN')}
                          </span>
                          <span className="text-3xs text-neutral-400">30-day supply</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Proceed to Payment Action Button */}
              <div className="pt-4 border-t border-neutral-100 flex flex-col sm:flex-row gap-3 items-center justify-between">
                <Link
                  to="/account"
                  className="text-xs font-semibold text-neutral-600 hover:text-neutral-950 transition-colors"
                >
                  &larr; Back to Account Dashboard
                </Link>

                <button
                  type="button"
                  onClick={() => setShowPaymentModal(true)}
                  disabled={!selectedMedOption && !approvedConsultation.selectedOption}
                  className="w-full sm:w-auto px-6 py-3 bg-neutral-950 hover:bg-neutral-800 text-white text-xs font-bold uppercase tracking-wider rounded-full transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Proceed to Payment</span>
                </button>
              </div>
            </div>
          )}

          {/* Standard Intake Stepper */}
          {!approvedConsultation && (
            <div className="space-y-6">
              {!submitted && !isAnalyzing ? (
                <div className="bg-white rounded-3xl border border-neutral-200 p-6 sm:p-10 shadow-xs">
                  {step === 1 && (
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-2xl font-bold text-neutral-950">Select your primary clinical focus</h2>
                        <p className="text-xs text-neutral-500 mt-1">Our licensed physician board specializes in precision telehealth treatments.</p>
                      </div>
                      <div className="space-y-3">
                        {primaryOptions.map((opt) => (
                          <div
                            key={opt.id}
                            onClick={() => setFormData({ ...formData, primaryConcern: opt.id })}
                            className={cn(
                              'p-4 rounded-2xl border transition-all cursor-pointer',
                              formData.primaryConcern === opt.id
                                ? 'border-neutral-950 bg-neutral-50/80 ring-1 ring-neutral-950'
                                : 'border-neutral-200 hover:border-neutral-400'
                            )}
                          >
                            <span className="text-sm font-bold text-neutral-950 block">{opt.title}</span>
                            <span className="text-xs text-neutral-500">{opt.desc}</span>
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={nextStep}
                        className="w-full py-3.5 bg-neutral-950 hover:bg-neutral-800 text-white text-xs font-bold uppercase tracking-wider rounded-full transition-colors flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <span>Continue</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {step === 2 && (
                    <div className="space-y-5">
                      <div>
                        <h2 className="text-2xl font-bold text-neutral-950">Personal & Contact Details</h2>
                        <p className="text-xs text-neutral-500 mt-1">Required for legal clinical chart verification.</p>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-semibold text-neutral-700 mb-1">Full Legal Name</label>
                          <input
                            type="text"
                            placeholder="Jane Doe"
                            value={formData.fullName}
                            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                            className="w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-sm focus:border-neutral-950 focus:outline-none"
                          />
                          {errors.fullName && <p className="text-2xs text-rose-600 mt-1">{errors.fullName}</p>}
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-neutral-700 mb-1">Email Address</label>
                          <input
                            type="email"
                            placeholder="jane@example.com"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-sm focus:border-neutral-950 focus:outline-none"
                          />
                          {errors.email && <p className="text-2xs text-rose-600 mt-1">{errors.email}</p>}
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-neutral-700 mb-1">Phone Number</label>
                          <input
                            type="tel"
                            placeholder="+91 98765 43210"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className="w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-sm focus:border-neutral-950 focus:outline-none"
                          />
                          {errors.phone && <p className="text-2xs text-rose-600 mt-1">{errors.phone}</p>}
                        </div>
                      </div>

                      <div className="flex gap-3 pt-2">
                        <button
                          type="button"
                          onClick={prevStep}
                          className="px-6 py-3 border border-neutral-200 rounded-full text-xs font-bold uppercase tracking-wider hover:bg-neutral-50"
                        >
                          Back
                        </button>
                        <button
                          type="button"
                          onClick={nextStep}
                          className="flex-1 py-3 bg-neutral-950 hover:bg-neutral-800 text-white text-xs font-bold uppercase tracking-wider rounded-full transition-colors flex items-center justify-center gap-2"
                        >
                          <span>Continue</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {step === 3 && (
                    <div className="space-y-5">
                      <div>
                        <h2 className="text-2xl font-bold text-neutral-950">Patient Biometrics</h2>
                        <p className="text-xs text-neutral-500 mt-1">Calculates body mass index & appropriate dosage thresholds.</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-neutral-700 mb-1">Height (cm)</label>
                          <input
                            type="number"
                            placeholder="172"
                            value={formData.height}
                            onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                            className="w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-sm focus:border-neutral-950 focus:outline-none"
                          />
                          {errors.height && <p className="text-2xs text-rose-600 mt-1">{errors.height}</p>}
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-neutral-700 mb-1">Weight (kg)</label>
                          <input
                            type="number"
                            placeholder="70"
                            value={formData.weight}
                            onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                            className="w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-sm focus:border-neutral-950 focus:outline-none"
                          />
                          {errors.weight && <p className="text-2xs text-rose-600 mt-1">{errors.weight}</p>}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-neutral-700 mb-1">Biological Sex</label>
                        <div className="grid grid-cols-3 gap-3">
                          {['female', 'male', 'other'].map((sex) => (
                            <button
                              key={sex}
                              type="button"
                              onClick={() => setFormData({ ...formData, sex: sex as any })}
                              className={cn(
                                'py-2.5 rounded-xl border text-xs font-semibold capitalize transition-all cursor-pointer',
                                formData.sex === sex
                                  ? 'border-neutral-950 bg-neutral-950 text-white'
                                  : 'border-neutral-200 text-neutral-700 hover:bg-neutral-50'
                              )}
                            >
                              {sex}
                            </button>
                          ))}
                        </div>
                        {errors.sex && <p className="text-2xs text-rose-600 mt-1">{errors.sex}</p>}
                      </div>

                      <div className="flex gap-3 pt-2">
                        <button
                          type="button"
                          onClick={prevStep}
                          className="px-6 py-3 border border-neutral-200 rounded-full text-xs font-bold uppercase tracking-wider hover:bg-neutral-50"
                        >
                          Back
                        </button>
                        <button
                          type="button"
                          onClick={nextStep}
                          className="flex-1 py-3 bg-neutral-950 hover:bg-neutral-800 text-white text-xs font-bold uppercase tracking-wider rounded-full transition-colors flex items-center justify-center gap-2"
                        >
                          <span>Continue</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {step === 4 && (
                    <div className="space-y-5">
                      <div>
                        <h2 className="text-2xl font-bold text-neutral-950">Medical History & Screening</h2>
                        <p className="text-xs text-neutral-500 mt-1">Select any current or past medical conditions.</p>
                      </div>

                      <div className="space-y-2">
                        {[
                          'Hypertension (High Blood Pressure)',
                          'Type 2 Diabetes / Prediabetes',
                          'Thyroid Disease or Family History of MTC',
                          'Cardiovascular or Kidney Conditions',
                          'Currently Pregnant or Breastfeeding',
                          'None of the above',
                        ].map((c) => (
                          <div
                            key={c}
                            onClick={() => toggleCondition(c)}
                            className={cn(
                              'p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between text-xs',
                              formData.conditions.includes(c)
                                ? 'border-neutral-950 bg-neutral-50 text-neutral-950 font-semibold'
                                : 'border-neutral-200 text-neutral-700 hover:bg-neutral-50'
                            )}
                          >
                            <span>{c}</span>
                            {formData.conditions.includes(c) && <Check className="w-4 h-4 text-neutral-950" />}
                          </div>
                        ))}
                      </div>
                      {errors.conditions && <p className="text-2xs text-rose-600">{errors.conditions}</p>}

                      <div className="flex gap-3 pt-2">
                        <button
                          type="button"
                          onClick={prevStep}
                          className="px-6 py-3 border border-neutral-200 rounded-full text-xs font-bold uppercase tracking-wider hover:bg-neutral-50"
                        >
                          Back
                        </button>
                        <button
                          type="button"
                          onClick={nextStep}
                          className="flex-1 py-3 bg-neutral-950 hover:bg-neutral-800 text-white text-xs font-bold uppercase tracking-wider rounded-full transition-colors flex items-center justify-center gap-2"
                        >
                          <span>Continue</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {step === 5 && (
                    <div className="space-y-5">
                      <div>
                        <h2 className="text-2xl font-bold text-neutral-950">Current Medications & Allergies</h2>
                        <p className="text-xs text-neutral-500 mt-1">Prevents harmful prescription drug interactions.</p>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-semibold text-neutral-700 mb-1">Current Medications (or 'None')</label>
                          <textarea
                            rows={3}
                            placeholder="List all prescription drugs, supplements, or write None"
                            value={formData.medications}
                            onChange={(e) => setFormData({ ...formData, medications: e.target.value })}
                            className="w-full rounded-xl border border-neutral-200 p-3 text-xs focus:border-neutral-950 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-neutral-700 mb-1">Known Drug Allergies (or 'None')</label>
                          <textarea
                            rows={3}
                            placeholder="List any medication allergies or write None"
                            value={formData.allergies}
                            onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                            className="w-full rounded-xl border border-neutral-200 p-3 text-xs focus:border-neutral-950 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex gap-3 pt-2">
                        <button
                          type="button"
                          onClick={prevStep}
                          className="px-6 py-3 border border-neutral-200 rounded-full text-xs font-bold uppercase tracking-wider hover:bg-neutral-50"
                        >
                          Back
                        </button>
                        <button
                          type="button"
                          onClick={nextStep}
                          className="flex-1 py-3 bg-neutral-950 hover:bg-neutral-800 text-white text-xs font-bold uppercase tracking-wider rounded-full transition-colors flex items-center justify-center gap-2"
                        >
                          <span>Review & Sign</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {step === 6 && (
                    <div className="space-y-5">
                      <div>
                        <h2 className="text-2xl font-bold text-neutral-950">Review & Telehealth Consent</h2>
                        <p className="text-xs text-neutral-500 mt-1">Review clinical terms before submitting for physician evaluation.</p>
                      </div>

                      <div className="space-y-3">
                        <label className="flex items-start gap-3 p-3.5 rounded-xl border border-neutral-200 bg-neutral-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.consentTruth}
                            onChange={(e) => setFormData({ ...formData, consentTruth: e.target.checked })}
                            className="mt-0.5 rounded text-neutral-950 focus:ring-neutral-950"
                          />
                          <span className="text-xs text-neutral-700">
                            <strong>Truthfulness:</strong> I confirm that all health information provided is accurate and complete.
                          </span>
                        </label>

                        <label className="flex items-start gap-3 p-3.5 rounded-xl border border-neutral-200 bg-neutral-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.consentTelehealth}
                            onChange={(e) => setFormData({ ...formData, consentTelehealth: e.target.checked })}
                            className="mt-0.5 rounded text-neutral-950 focus:ring-neutral-950"
                          />
                          <span className="text-xs text-neutral-700">
                            <strong>Telehealth Evaluation:</strong> I consent to receive asynchronous clinical evaluation by a licensed physician.
                          </span>
                        </label>

                        <label className="flex items-start gap-3 p-3.5 rounded-xl border border-neutral-200 bg-neutral-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.consentPrivacy}
                            onChange={(e) => setFormData({ ...formData, consentPrivacy: e.target.checked })}
                            className="mt-0.5 rounded text-neutral-950 focus:ring-neutral-950"
                          />
                          <span className="text-xs text-neutral-700">
                            <strong>Medical Privacy:</strong> I acknowledge that my health records are encrypted and protected under healthcare confidentiality regulations.
                          </span>
                        </label>
                      </div>

                      {errors.consent && (
                        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>{errors.consent}</span>
                        </div>
                      )}

                      <div className="flex gap-3 pt-2">
                        <button
                          type="button"
                          onClick={prevStep}
                          className="px-6 py-3 border border-neutral-200 rounded-full text-xs font-bold uppercase tracking-wider hover:bg-neutral-50"
                        >
                          Back
                        </button>
                        <button
                          type="button"
                          onClick={handleSubmit}
                          className="flex-1 py-3.5 bg-neutral-950 hover:bg-neutral-800 text-white text-xs font-bold uppercase tracking-wider rounded-full transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Submit for Doctor Review</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : isAnalyzing ? (
                /* Analyzing skeleton */
                <div className="bg-white p-8 rounded-3xl border border-neutral-200 space-y-6">
                  <div className="flex items-center gap-3 border-b border-neutral-100 pb-4">
                    <Loader2 className="w-5 h-5 animate-spin text-neutral-950" />
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-neutral-950 block">
                        Submitting Clinical Intake
                      </span>
                      <span className="text-2xs text-neutral-500">
                        {analyzingStage === 0 && 'Securing clinical health chart in database...'}
                        {analyzingStage === 1 && 'Assigning state-licensed telehealth physician...'}
                        {analyzingStage === 2 && 'Creating doctor clinical review task & notification...'}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-3 pt-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-12 w-full rounded-xl" />
                    <Skeleton className="h-12 w-full rounded-xl" />
                  </div>
                </div>
              ) : (
                /* Success Screen */
                <div className="bg-white p-8 sm:p-10 rounded-3xl border border-neutral-200 text-center space-y-6">
                  <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-800 flex items-center justify-center mx-auto border border-emerald-200">
                    <CheckCircle2 className="w-8 h-8 text-emerald-700" />
                  </div>
                  <div className="space-y-2">
                    <span className="text-2xs font-bold uppercase tracking-widest text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                      Intake Received & Assigned
                    </span>
                    <h2 className="text-2xl font-bold text-neutral-950">Your chart is in physician review</h2>
                    <p className="text-xs text-neutral-600 max-w-md mx-auto leading-relaxed">
                      A licensed physician has been notified and is reviewing your health records. You will receive an in-app notification and email once your clinical evaluation is approved.
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 max-w-md mx-auto text-left text-xs space-y-2">
                    <div className="flex justify-between border-b border-neutral-200/60 pb-1.5">
                      <span className="text-neutral-500">Patient:</span>
                      <span className="font-semibold text-neutral-900">{formData.fullName || 'Verified Patient'}</span>
                    </div>
                    <div className="flex justify-between border-b border-neutral-200/60 pb-1.5">
                      <span className="text-neutral-500">Status:</span>
                      <span className="font-semibold text-neutral-900">Physician Review Queue</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Expected Response:</span>
                      <span className="font-semibold text-neutral-900">&lt; 24 Hours</span>
                    </div>
                  </div>
                  <Link
                    to="/account"
                    className="inline-flex items-center justify-center bg-neutral-950 text-white px-8 py-3 rounded-full text-xs font-bold uppercase tracking-wider hover:bg-neutral-800 transition-colors"
                  >
                    Go to My Account
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Payment Phase Placeholder Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mx-auto text-stone-900">
              <Info className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-neutral-950">Payment Integration</h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Payment integration will be enabled in a later phase. Your prescription choice has been safely recorded and your consultation is marked <strong>Ready for Pharmacy</strong>.
              </p>
            </div>
            <button
              onClick={() => setShowPaymentModal(false)}
              className="w-full py-3 bg-neutral-950 text-white rounded-full text-xs font-bold uppercase tracking-wider hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              Understood
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

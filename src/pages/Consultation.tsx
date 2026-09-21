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
  const { user, profile } = useAuth();
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
  const [explicitError, setExplicitError] = useState<string | null>(null);
  const [selectionError, setSelectionError] = useState<string | null>(null);

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
    sex: '' as 'male' | 'female' | 'other' | 'prefer-not-to-say' | '',
    conditions: [] as string[],
    medicalHistory: '',
    medications: '',
    allergies: '',
    consentTruth: false,
    consentTelehealth: false,
    consentPrivacy: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reuse verified profile details so patients do not repeatedly enter the same information.
  useEffect(() => {
    if (!profile) return;
    setFormData(prev => ({
      ...prev,
      fullName: `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || profile.displayName || prev.fullName,
      email: profile.email || prev.email,
      phone: profile.phoneNumber || prev.phone,
      height: profile.heightCm ? String(profile.heightCm) : prev.height,
      weight: profile.weightKg ? String(profile.weightKg) : prev.weight,
      sex: (profile.sex || prev.sex) as any,
      heightUnit: 'cm',
      weightUnit: 'kg',
    }));
  }, [profile]);

  // Fetch token helper - strictly requires canonical Supabase access token for clinical endpoints
  const getAccessToken = async (): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  };

  // Auto-load draft, active consultation, or deep-linked completed consultation
  useEffect(() => {
    async function loadConsultationData() {
      const token = await getAccessToken();
      if (!token) return;

      try {
        const headers = { 'Authorization': `Bearer ${token}` };
        const urlParams = new URLSearchParams(window.location.search);
        const urlId = urlParams.get('id');

        if (urlId) {
          const res = await fetch(`/api/clinical/consultations/${urlId}`, { headers });
          if (res.ok) {
            const data = await res.json();
            const c = data.consultation;
            if (c) {
              setDraftId(c.id);
              if (c.status === 'completed') {
                setApprovedConsultation(data);
                if (data.selectedOption) {
                  setSelectedMedOption(data.selectedOption);
                }
                setPharmacyStatus(data.selectionStatus || (data.selectedOption ? 'selected_pending_payment' : null));
                return;
              } else if (c.status === 'submitted' || c.status === 'under_review' || c.status === 'assigned') {
                setSubmitted(true);
                return;
              }
            }
          } else if (res.status === 403) {
            setExplicitError('403 Forbidden: You are not authorized to view this consultation record.');
            return;
          } else if (res.status === 404) {
            setExplicitError('404 Not Found: The requested consultation record was not found.');
            return;
          } else {
            const errJson = await res.json().catch(() => ({}));
            setExplicitError(`${res.status} Error: ${errJson.error || 'Failed to load requested consultation.'}`);
            return;
          }
        }

        // Fetch patient consultations list
        const listRes = await fetch('/api/clinical/consultations/patient', { headers });
        let consults: any[] = [];
        if (listRes.ok) {
          const listData = await listRes.json();
          consults = listData.consultations || [];
        }

        const viewPlanParam = urlParams.get('viewPlan') === 'true';

        // 1. If viewPlan === true, load latest completed treatment plan
        if (viewPlanParam) {
          const completedCons = consults.find((c: any) => c.status === 'completed');
          if (completedCons) {
            const detailRes = await fetch(`/api/clinical/consultations/${completedCons.id}`, { headers });
            if (detailRes.ok) {
              const data = await detailRes.json();
              setApprovedConsultation(data);
              setDraftId(completedCons.id);
              if (data.selectedOption) {
                setSelectedMedOption(data.selectedOption);
              }
              setPharmacyStatus(data.selectionStatus || (data.selectedOption ? 'selected_pending_payment' : null));
              return;
            }
          }
        }

        // 2. Priority: Active draft
        const draftCons = consults.find((c: any) => c.status === 'draft');
        if (draftCons) {
          setDraftId(draftCons.id);
          if (draftCons.responses) {
            setFormData((prev) => ({
              ...prev,
              ...draftCons.responses,
              primaryConcern: draftCons.primary_concern || prev.primaryConcern,
            }));
          }
          return;
        }

        // 3. Priority: Active submitted/assigned/under_review
        const activeCons = consults.find((c: any) => c.status === 'submitted' || c.status === 'under_review' || c.status === 'assigned');
        if (activeCons) {
          setSubmitted(true);
          setDraftId(activeCons.id);
          return;
        }

        // 4. Fallback: Draft endpoint check
        const draftRes = await fetch('/api/clinical/consultations/draft', { headers });
        if (draftRes.ok) {
          const data = await draftRes.json();
          if (data.draft) {
            setDraftId(data.draft.id);
            if (data.draft.responses) {
              setFormData((prev) => ({
                ...prev,
                ...data.draft.responses,
                primaryConcern: data.draft.primary_concern || prev.primaryConcern,
              }));
            }
            return;
          }
        }
      } catch (err) {
        console.warn('Consultation load warning:', err);
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
    setSelectionError(null);
    try {
      const token = await getAccessToken();
      const res = await fetch(`/api/clinical/consultations/${draftId}/select-option`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ prescriptionItemId: option.id }),
      });

      if (res.ok) {
        setSelectedMedOption(option);
        setPharmacyStatus('selected_pending_payment');

        // Re-fetch canonical consultation detail
        const detailRes = await fetch(`/api/clinical/consultations/${draftId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (detailRes.ok) {
          const updatedData = await detailRes.json();
          setApprovedConsultation(updatedData);
          if (updatedData.selectedOption) {
            setSelectedMedOption(updatedData.selectedOption);
          }
        }
      } else {
        const errData = await res.json().catch(() => ({ error: 'Failed to select medication option' }));
        setSelectionError(errData.error || 'Failed to select medication option');
      }
    } catch (err: any) {
      console.error('Error selecting option:', err);
      setSelectionError(err.message || 'Network error selecting option');
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
          {/* Explicit Error View */}
          {explicitError && (
            <div className="bg-white rounded-3xl border border-red-200 p-8 shadow-xs text-center space-y-4">
              <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
              <h2 className="text-lg font-bold text-stone-900">Consultation Access Error</h2>
              <p className="text-xs text-stone-600 max-w-md mx-auto">{explicitError}</p>
              <Link
                to="/account"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-900 text-white text-xs font-medium hover:bg-stone-800 transition-colors"
              >
                &larr; Return to Patient Portal
              </Link>
            </div>
          )}

          {/* Approved Consultation & Prescription Options View */}
          {!explicitError && approvedConsultation && (
            <div className="bg-white rounded-3xl border border-neutral-200 p-6 sm:p-10 shadow-xs space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
                <div className="space-y-1">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-2xs font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                    Doctor Approved & Verified
                  </span>
                  <h2 className="text-2xl font-bold text-neutral-950">Clinical Treatment Plan</h2>
                </div>
                {(approvedConsultation.selectedOption || selectedMedOption) && (
                  <span className="px-3 py-1 bg-stone-100 text-stone-900 border border-stone-300 rounded-full text-xs font-semibold">
                    Selection saved — payment required
                  </span>
                )}
              </div>

              {/* Clinician Message */}
              {(approvedConsultation.medicationOptions?.customClinicianMessage || approvedConsultation.customClinicianMessage) && (
                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 text-xs text-stone-700 leading-relaxed space-y-1">
                  <span className="font-semibold text-stone-950 block">Physician Clinical Note:</span>
                  <p>{approvedConsultation.medicationOptions?.customClinicianMessage || approvedConsultation.customClinicianMessage}</p>
                </div>
              )}

              {/* Selection Error Banner */}
              {selectionError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <span>{selectionError}</span>
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
                  {[...(approvedConsultation.medicationOptions?.options || [])]
                    .sort((a: MedicationOption, b: MedicationOption) => (b.priceInr || 0) - (a.priceInr || 0))
                    .map((opt: MedicationOption) => {
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
                        <p className="text-xs text-neutral-500 mt-1">Choose the care area you want help with. We’ll route your consultation to a doctor who works in that area.</p>
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
                        <p className="text-xs text-neutral-500 mt-1">These details come from your saved profile. You do not need to enter them again.</p><Link to="/account" className="inline-block text-xs font-semibold text-neutral-900 underline underline-offset-4 mt-2">Edit profile details</Link>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-semibold text-neutral-700 mb-1">Full Legal Name</label>
                          <input
                            type="text"
                            placeholder="Jane Doe"
                            value={formData.fullName}
                            readOnly
                            className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm text-neutral-700"
                          />
                          {errors.fullName && <p className="text-2xs text-rose-600 mt-1">{errors.fullName}</p>}
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-neutral-700 mb-1">Email Address</label>
                          <input
                            type="email"
                            placeholder="jane@example.com"
                            value={formData.email}
                            readOnly
                            className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm text-neutral-700"
                          />
                          {errors.email && <p className="text-2xs text-rose-600 mt-1">{errors.email}</p>}
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-neutral-700 mb-1">Phone Number</label>
                          <input
                            type="tel"
                            placeholder="+91 98765 43210"
                            value={formData.phone}
                            readOnly
                            className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm text-neutral-700"
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
                        <p className="text-xs text-neutral-500 mt-1">These measurements come from your saved profile and are included in the consultation automatically.</p><Link to="/account" className="inline-block text-xs font-semibold text-neutral-900 underline underline-offset-4 mt-2">Edit profile details</Link>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-neutral-700 mb-1">Height (cm)</label>
                          <input
                            type="number"
                            placeholder="172"
                            value={formData.height}
                            readOnly
                            className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm text-neutral-700"
                          />
                          {errors.height && <p className="text-2xs text-rose-600 mt-1">{errors.height}</p>}
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-neutral-700 mb-1">Weight (kg)</label>
                          <input
                            type="number"
                            placeholder="70"
                            value={formData.weight}
                            readOnly
                            className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm text-neutral-700"
                          />
                          {errors.weight && <p className="text-2xs text-rose-600 mt-1">{errors.weight}</p>}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-neutral-700 mb-1">Biological Sex</label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {['female', 'male', 'other', 'prefer-not-to-say'].map((sex) => (
                            <button
                              key={sex}
                              type="button"
                              disabled
                              className={cn(
                                'py-2.5 rounded-xl border text-xs font-semibold capitalize transition-all cursor-default disabled:opacity-100',
                                formData.sex === sex
                                  ? 'border-neutral-950 bg-neutral-950 text-white'
                                  : 'border-neutral-200 text-neutral-700 hover:bg-neutral-50'
                              )}
                            >
                              {sex === 'prefer-not-to-say' ? 'Prefer not to say' : sex}
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
                        <p className="text-xs text-neutral-500 mt-1">Review the information before submitting it for doctor review.</p>
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
                            <strong>Telehealth Evaluation:</strong> I consent to receive an asynchronous telehealth evaluation from a doctor on the Suga.Health clinical team.
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
                        Submitting Consultation
                      </span>
                      <span className="text-2xs text-neutral-500">
                        {analyzingStage === 0 && 'Saving your consultation securely...'}
                        {analyzingStage === 1 && 'Routing your consultation to the right doctor...'}
                        {analyzingStage === 2 && 'Notifying the assigned doctor...'}
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
                      Consultation Submitted
                    </span>
                    <h2 className="text-2xl font-bold text-neutral-950">Your doctor will review it soon</h2>
                    <p className="text-xs text-neutral-600 max-w-md mx-auto leading-relaxed">
                      Your consultation has been sent to the clinical team. You’ll see an update here when the doctor completes the review.
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 max-w-md mx-auto text-left text-xs space-y-2">
                    <div className="flex justify-between border-b border-neutral-200/60 pb-1.5">
                      <span className="text-neutral-500">Patient:</span>
                      <span className="font-semibold text-neutral-900">{formData.fullName || 'Verified Patient'}</span>
                    </div>
                    <div className="flex justify-between border-b border-neutral-200/60 pb-1.5">
                      <span className="text-neutral-500">Status:</span>
                      <span className="font-semibold text-neutral-900">Doctor review</span>
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
            <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mx-auto text-stone-900">              <Info className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-neutral-950">Payment Integration</h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Payment integration will be enabled in a later phase.
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
import { useState, useEffect, useRef } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { cn } from '../lib/utils';
import { ChevronLeft, ArrowRight, CheckCircle2, Lock, ArrowLeft, Loader2, Check, AlertCircle, Save } from 'lucide-react';
import { Skeleton } from '../components/ui/Skeleton';
import { useAuth } from '../context/AuthContext';
import { collection, doc, getDocs, query, where, limit, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

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

  // Form State
  const [formData, setFormData] = useState({
    primaryConcern: 'weight',
    fullName: '',
    email: '',
    phone: '',
    height: '',
    heightUnit: 'inches' as 'inches' | 'cm',
    weight: '',
    weightUnit: 'lbs' as 'lbs' | 'kg',
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

  // Auto-load draft on mount
  useEffect(() => {
    async function loadDraft() {
      if (!user) return;
      const q = query(
        collection(db, 'consultations'),
        where('patientId', '==', user.uid),
        where('status', '==', 'draft'),
        limit(1)
      );
      try {
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const docSnap = querySnapshot.docs[0];
          setDraftId(docSnap.id);
          const data = docSnap.data();
          if (data.responses) {
            setFormData({
              ...formData,
              ...data.responses,
              primaryConcern: data.primaryConcern || 'weight'
            });
          }
        }
      } catch (err) {
        console.error("Error loading draft", err);
      }
    }
    loadDraft();
  }, [user]);

  const saveDraft = async (dataToSave = formData) => {
    if (!user) return;
    setIsSaving(true);
    try {
      const payload = {
        patientId: user.uid,
        status: 'draft',
        primaryConcern: dataToSave.primaryConcern,
        responses: dataToSave,
        schemaVersion: 1,
        updatedAt: new Date().toISOString(),
      };
      
      if (draftId) {
        const docRef = doc(db, 'consultations', draftId);
        await updateDoc(docRef, payload);
      } else {
        const newDocRef = doc(collection(db, 'consultations'));
        await setDoc(newDocRef, {
          ...payload,
          createdAt: new Date().toISOString(),
        });
        setDraftId(newDocRef.id);
      }
      setSaveSuccess('Draft saved');
      setTimeout(() => setSaveSuccess(''), 2000);
    } catch (err) {
      console.error("Failed to save draft", err);
    } finally {
      setIsSaving(false);
    }
  };

  const nextStep = () => {
    // Validate current step before proceeding
    if (step === 1) {
      if (!formData.primaryConcern) {
        setErrors({ primaryConcern: 'Please select a primary concern to continue.' });
        return;
      }
      setErrors({});
      setStep(2);
      saveDraft();
    } else if (step === 2) {
      const stepErrors: Record<string, string> = {};
      if (!formData.fullName.trim()) {
        stepErrors.fullName = 'Full legal name is required.';
      }
      if (!formData.email.trim()) {
        stepErrors.email = 'Email address is required.';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
        stepErrors.email = 'Please enter a valid email address.';
      }
      if (!formData.phone.trim()) {
        stepErrors.phone = 'Phone number is required for prescription alerts.';
      } else if (formData.phone.replace(/\D/g, '').length < 10) {
        stepErrors.phone = 'Please enter a valid 10-digit phone number.';
      }

      if (Object.keys(stepErrors).length > 0) {
        setErrors(stepErrors);
        return;
      }
      setErrors({});
      setStep(3);
      saveDraft();
    } else if (step === 3) {
      const stepErrors: Record<string, string> = {};
      if (!formData.height.trim()) {
        stepErrors.height = 'Height is required for BMI and dosing calculation.';
      }
      if (!formData.weight.trim()) {
        stepErrors.weight = 'Weight is required for clinical dosing.';
      }
      if (!formData.sex) {
        stepErrors.sex = 'Please select biological sex (required for clinical protocol accuracy).';
      }

      if (Object.keys(stepErrors).length > 0) {
        setErrors(stepErrors);
        return;
      }
      setErrors({});
      setStep(4);
      saveDraft();
    } else if (step === 4) {
      if (formData.conditions.length === 0 && !formData.medicalHistory.trim()) {
        setErrors({ conditions: 'Please select applicable conditions or choose "None of the above".' });
        return;
      }
      setErrors({});
      setStep(5);
      saveDraft();
    } else if (step === 5) {
      setErrors({});
      setStep(6);
      saveDraft();
    } else {
      setStep(Math.min(totalSteps, step + 1));
      saveDraft();
    }
  };

  const prevStep = () => {
    setErrors({});
    setStep(Math.max(1, step - 1));
    saveDraft();
  };

  const handleSubmit = async () => {
    if (!formData.consentTruth || !formData.consentTelehealth || !formData.consentPrivacy) {
      setErrors({ consent: 'You must review and accept all clinical consent terms to proceed.' });
      return;
    }

    if (!user) return;
    
    setErrors({});
    setIsAnalyzing(true);
    
    try {
      // First save the final consent state to the draft
      await saveDraft(formData);
      
      if (!draftId) {
        throw new Error("No draft found to submit");
      }

      // Then call the trusted backend assignment endpoint
      const token = await user.getIdToken();
      const res = await fetch(`/api/consultations/${draftId}/submit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Submission failed");
      }
      
      setTimeout(() => setAnalyzingStage(1), 600);
      setTimeout(() => setAnalyzingStage(2), 1200);
      setTimeout(() => {
        setIsAnalyzing(false);
        setSubmitted(true);
      }, 1900);
    } catch (err) {
      console.error("Submission failed", err);
      setErrors({ consent: 'Failed to submit consultation. Please try again.' });
      setIsAnalyzing(false);
    }
  };

  const toggleCondition = (cond: string) => {
    setErrors(prev => {
      const updated = { ...prev };
      delete updated.conditions;
      return updated;
    });

    if (cond === 'None of the above') {
      setFormData(prev => ({
        ...prev,
        conditions: prev.conditions.includes('None of the above') ? [] : ['None of the above'],
      }));
      return;
    }

    setFormData(prev => {
      const filtered = prev.conditions.filter(c => c !== 'None of the above');
      if (filtered.includes(cond)) {
        return { ...prev, conditions: filtered.filter(c => c !== cond) };
      } else {
        return { ...prev, conditions: [...filtered, cond] };
      }
    });
  };

  const pageVariants = {
    initial: { opacity: 0, x: shouldReduceMotion ? 0 : 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: shouldReduceMotion ? 0 : -20 }
  };

  const pageTransition = { duration: 0.35, ease: [0.16, 1, 0.3, 1] };

  const primaryOptions = [
    { id: 'weight', title: 'Medical Weight Loss', desc: 'GLP-1 therapy (Semaglutide / Tirzepatide)' },
    { id: 'hair', title: 'Hair Growth & Density', desc: 'DHT blockers and microvascular stimulators' },
    { id: 'sex', title: 'Sexual Health & Vitality', desc: 'Discreet, clinician-prescribed ED and stamina options' }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-neutral-900 selection:text-white">
      {/* Top Bar with Brand & Tagline - Clean and Private */}
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
          {!submitted && (
            <button
              onClick={() => {
                saveDraft();
              }}
              disabled={isSaving}
              className="text-xs font-bold uppercase tracking-wider text-neutral-600 hover:text-neutral-950 transition-colors flex items-center gap-1.5"
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

      <main className="flex-grow flex flex-col">
        {/* Progress bar */}
        {!submitted && (
          <div className="w-full bg-neutral-200 h-1">
            <div 
              className="bg-neutral-950 h-full transition-all duration-500 ease-out" 
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>
        )}

        <div className="flex-grow flex items-center justify-center py-8 sm:py-12 md:py-16 px-4 sm:px-6">
          <div className="w-full max-w-2xl">
            
            {!submitted ? (
              <>
                <div className="mb-6 sm:mb-8 h-8 flex items-center justify-between">
                  {step > 1 ? (
                    <button 
                      onClick={prevStep}
                      className="flex items-center text-xs font-bold tracking-wider uppercase text-neutral-500 hover:text-neutral-950 transition-colors group cursor-pointer"
                    >
                      <ChevronLeft size={16} className="mr-1 group-hover:-translate-x-1 transition-transform" />
                      Back
                    </button>
                  ) : (
                    <Link
                      to="/"
                      className="inline-flex items-center text-xs font-bold tracking-wider uppercase text-neutral-600 hover:text-neutral-950 transition-colors group"
                    >
                      <ArrowLeft size={15} className="mr-1.5 group-hover:-translate-x-1 transition-transform" />
                      Return to Home
                    </Link>
                  )}
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                    Step {step} of {totalSteps}
                  </span>
                </div>

                <AnimatePresence mode="wait">
                  {/* Step 1: Primary Concern with Home button & selectable cards */}
                  {step === 1 && (
                    <motion.div
                      key="step1"
                      variants={pageVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      transition={pageTransition}
                      className="bg-white p-6 sm:p-8 md:p-10 rounded-2xl sm:rounded-3xl border border-neutral-200/90 hover:border-neutral-950 transition-colors"
                    >
                      <span className="text-xs font-bold tracking-widest text-neutral-500 uppercase block mb-2">
                        Primary Concern
                      </span>
                      <h1 className="font-sans text-3xl sm:text-4xl font-extrabold text-neutral-950 mb-3 tracking-tight">
                        What brings you in today?
                      </h1>
                      <p className="text-neutral-600 text-sm sm:text-base mb-6 sm:mb-8">
                        Select one clinical focus. Your physician will review your complete health chart.
                      </p>
                      
                      <div className="space-y-3.5 mb-6">
                        {primaryOptions.map((opt) => {
                          const isSelected = formData.primaryConcern === opt.id;
                          return (
                            <button 
                              key={opt.id}
                              type="button"
                              onClick={() => {
                                setFormData(prev => ({ ...prev, primaryConcern: opt.id as any }));
                                setErrors({});
                              }}
                              className={cn(
                                "w-full flex items-center justify-between text-left p-5 sm:p-6 rounded-2xl border transition-all cursor-pointer",
                                isSelected
                                  ? "border-neutral-950 bg-neutral-100/90 shadow-xs"
                                  : "border-neutral-200/90 bg-neutral-50/50 hover:bg-neutral-100 hover:border-neutral-400"
                              )}
                            >
                              <div>
                                <span className={cn(
                                  "font-sans text-lg font-bold block mb-1",
                                  isSelected ? "text-neutral-950" : "text-neutral-900"
                                )}>
                                  {opt.title}
                                </span>
                                <span className="text-xs sm:text-sm text-neutral-500">{opt.desc}</span>
                              </div>
                              <div className={cn(
                                "w-6 h-6 rounded-full flex items-center justify-center border shrink-0 ml-4 transition-colors",
                                isSelected
                                  ? "bg-neutral-950 border-neutral-950 text-white"
                                  : "border-neutral-300 bg-white text-transparent"
                              )}>
                                <Check size={14} strokeWidth={3} />
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {errors.primaryConcern && (
                        <p className="text-xs font-semibold text-red-600 mb-4 flex items-center gap-1.5">
                          <AlertCircle size={14} /> {errors.primaryConcern}
                        </p>
                      )}

                      <button
                        type="button"
                        onClick={nextStep}
                        className="w-full flex items-center justify-center bg-neutral-950 border border-neutral-950 py-4 rounded-full text-xs font-bold uppercase tracking-wider text-white hover:bg-neutral-800 transition-colors cursor-pointer"
                      >
                        <span>Continue to Personal Details</span>
                        <ArrowRight size={16} className="ml-2" />
                      </button>
                    </motion.div>
                  )}

                  {/* Step 2: Personal Information with strict validation */}
                  {step === 2 && (
                    <motion.div
                      key="step2"
                      variants={pageVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      transition={pageTransition}
                      className="bg-white p-6 sm:p-8 md:p-10 rounded-2xl sm:rounded-3xl border border-neutral-200/90 hover:border-neutral-950 transition-colors"
                    >
                      <span className="text-xs font-bold tracking-widest text-neutral-500 uppercase block mb-2">
                        Personal Information
                      </span>
                      <h1 className="font-sans text-3xl sm:text-4xl font-extrabold text-neutral-950 mb-3 tracking-tight">
                        A little about you
                      </h1>
                      <p className="text-neutral-600 text-sm sm:text-base mb-6 sm:mb-8">
                        Your doctor tailors your treatment and prescription protocol based on your identity and records.
                      </p>
                      
                      <div className="space-y-5">
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2">
                            Full Legal Name <span className="text-red-600">*</span>
                          </label>
                          <input 
                            type="text" 
                            value={formData.fullName}
                            onChange={(e) => {
                              setFormData(prev => ({ ...prev, fullName: e.target.value }));
                              if (errors.fullName) setErrors(prev => ({ ...prev, fullName: '' }));
                            }}
                            className={cn(
                              "w-full rounded-xl border bg-white px-4 py-3 focus:outline-none text-sm text-neutral-950 transition-colors",
                              errors.fullName 
                                ? "border-red-500 focus:ring-2 focus:ring-red-400" 
                                : "border-neutral-300 focus:ring-2 focus:ring-neutral-950"
                            )}
                            placeholder="e.g. Alex Morgan" 
                          />
                          {errors.fullName && (
                            <p className="text-xs font-medium text-red-600 mt-1.5 flex items-center gap-1">
                              <AlertCircle size={13} /> {errors.fullName}
                            </p>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2">
                              Email Address <span className="text-red-600">*</span>
                            </label>
                            <input 
                              type="email" 
                              value={formData.email}
                              onChange={(e) => {
                                setFormData(prev => ({ ...prev, email: e.target.value }));
                                if (errors.email) setErrors(prev => ({ ...prev, email: '' }));
                              }}
                              className={cn(
                                "w-full rounded-xl border bg-white px-4 py-3 focus:outline-none text-sm text-neutral-950 transition-colors",
                                errors.email 
                                ? "border-red-500 focus:ring-2 focus:ring-red-400" 
                                : "border-neutral-300 focus:ring-2 focus:ring-neutral-950"
                              )}
                              placeholder="Where your plan is sent" 
                            />
                            {errors.email && (
                              <p className="text-xs font-medium text-red-600 mt-1.5 flex items-center gap-1">
                                <AlertCircle size={13} /> {errors.email}
                              </p>
                            )}
                          </div>
                          <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2">
                              Phone Number <span className="text-red-600">*</span>
                            </label>
                            <input 
                              type="tel" 
                              value={formData.phone}
                              onChange={(e) => {
                                setFormData(prev => ({ ...prev, phone: e.target.value }));
                                if (errors.phone) setErrors(prev => ({ ...prev, phone: '' }));
                              }}
                              className={cn(
                                "w-full rounded-xl border bg-white px-4 py-3 focus:outline-none text-sm text-neutral-950 transition-colors",
                                errors.phone 
                                ? "border-red-500 focus:ring-2 focus:ring-red-400" 
                                : "border-neutral-300 focus:ring-2 focus:ring-neutral-950"
                              )}
                              placeholder="(555) 000-0000" 
                            />
                            {errors.phone && (
                              <p className="text-xs font-medium text-red-600 mt-1.5 flex items-center gap-1">
                                <AlertCircle size={13} /> {errors.phone}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <button 
                          type="button"
                          onClick={nextStep}
                          className="mt-6 w-full flex items-center justify-center bg-neutral-950 border border-neutral-950 py-4 rounded-full text-xs font-bold uppercase tracking-wider text-white hover:bg-neutral-800 transition-colors cursor-pointer"
                        >
                          <span>Continue to Health Metrics</span>
                          <ArrowRight size={16} className="ml-2" />
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* Step 3: Physical Biometrics with Male, Female, Other buttons and input validation */}
                  {step === 3 && (
                    <motion.div
                      key="step3"
                      variants={pageVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      transition={pageTransition}
                      className="bg-white p-6 sm:p-8 md:p-10 rounded-2xl sm:rounded-3xl border border-neutral-200/90 hover:border-neutral-950 transition-colors"
                    >
                      <span className="text-xs font-bold tracking-widest text-neutral-500 uppercase block mb-2">
                        Physical Biometrics
                      </span>
                      <h1 className="font-sans text-3xl sm:text-4xl font-extrabold text-neutral-950 mb-3 tracking-tight">
                        Height, Weight & Sex
                      </h1>
                      <p className="text-neutral-600 text-sm sm:text-base mb-6 sm:mb-8">
                        Required for accurate BMI and safe clinical starting dosages prescribed by our physicians.
                      </p>
                      
                      <div className="space-y-5">
                        {/* Biometrics Inputs with Unit Selectors (Inches/CM, LBS/KG) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                          {/* Height Card */}
                          <div className="bg-neutral-50/70 border border-neutral-200/90 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
                            <div>
                              <div className="flex items-center justify-between mb-2.5">
                                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-800">
                                  Height <span className="text-red-600">*</span>
                                </label>
                                <span className="text-[11px] text-neutral-500 font-medium">Select Unit</span>
                              </div>

                              {/* Unit Selection Buttons (like sex selection) */}
                              <div className="grid grid-cols-2 gap-2 mb-3.5">
                                {(['inches', 'cm'] as const).map((unit) => {
                                  const isSelected = formData.heightUnit === unit;
                                  const label = unit === 'inches' ? 'Inches' : 'CM';
                                  return (
                                    <button
                                      key={unit}
                                      type="button"
                                      onClick={() => {
                                        setFormData(prev => ({ ...prev, heightUnit: unit }));
                                      }}
                                      className={cn(
                                        "py-2 px-3 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                                        isSelected
                                          ? "bg-neutral-950 text-white border-neutral-950 shadow-xs"
                                          : "bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-100 hover:border-neutral-400"
                                      )}
                                    >
                                      {isSelected && <Check size={13} strokeWidth={3} />}
                                      <span>{label}</span>
                                    </button>
                                  );
                                })}
                              </div>

                              {/* Height Input */}
                              <div className="relative">
                                <input 
                                  type="text" 
                                  value={formData.height}
                                  onChange={(e) => {
                                    setFormData(prev => ({ ...prev, height: e.target.value }));
                                    if (errors.height) setErrors(prev => ({ ...prev, height: '' }));
                                  }}
                                  className={cn(
                                    "w-full rounded-xl border bg-white px-4 py-3 pr-12 focus:outline-none text-sm text-neutral-950 transition-colors font-medium",
                                    errors.height 
                                      ? "border-red-500 focus:ring-2 focus:ring-red-400" 
                                      : "border-neutral-300 focus:ring-2 focus:ring-neutral-950"
                                  )}
                                  placeholder={formData.heightUnit === 'inches' ? "e.g. 5'10\" or 70" : "e.g. 178"} 
                                />
                                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400 pointer-events-none uppercase">
                                  {formData.heightUnit === 'inches' ? 'IN' : 'CM'}
                                </span>
                              </div>
                            </div>

                            {errors.height && (
                              <p className="text-xs font-medium text-red-600 mt-2 flex items-center gap-1">
                                <AlertCircle size={13} /> {errors.height}
                              </p>
                            )}
                          </div>

                          {/* Weight Card */}
                          <div className="bg-neutral-50/70 border border-neutral-200/90 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
                            <div>
                              <div className="flex items-center justify-between mb-2.5">
                                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-800">
                                  Weight <span className="text-red-600">*</span>
                                </label>
                                <span className="text-[11px] text-neutral-500 font-medium">Select Unit</span>
                              </div>

                              {/* Unit Selection Buttons (like sex selection) */}
                              <div className="grid grid-cols-2 gap-2 mb-3.5">
                                {(['lbs', 'kg'] as const).map((unit) => {
                                  const isSelected = formData.weightUnit === unit;
                                  const label = unit === 'lbs' ? 'LBS' : 'KG';
                                  return (
                                    <button
                                      key={unit}
                                      type="button"
                                      onClick={() => {
                                        setFormData(prev => ({ ...prev, weightUnit: unit }));
                                      }}
                                      className={cn(
                                        "py-2 px-3 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                                        isSelected
                                          ? "bg-neutral-950 text-white border-neutral-950 shadow-xs"
                                          : "bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-100 hover:border-neutral-400"
                                      )}
                                    >
                                      {isSelected && <Check size={13} strokeWidth={3} />}
                                      <span>{label}</span>
                                    </button>
                                  );
                                })}
                              </div>

                              {/* Weight Input */}
                              <div className="relative">
                                <input 
                                  type="text" 
                                  value={formData.weight}
                                  onChange={(e) => {
                                    setFormData(prev => ({ ...prev, weight: e.target.value }));
                                    if (errors.weight) setErrors(prev => ({ ...prev, weight: '' }));
                                  }}
                                  className={cn(
                                    "w-full rounded-xl border bg-white px-4 py-3 pr-12 focus:outline-none text-sm text-neutral-950 transition-colors font-medium",
                                    errors.weight 
                                      ? "border-red-500 focus:ring-2 focus:ring-red-400" 
                                      : "border-neutral-300 focus:ring-2 focus:ring-neutral-950"
                                  )}
                                  placeholder={formData.weightUnit === 'lbs' ? "e.g. 185" : "e.g. 84"} 
                                />
                                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400 pointer-events-none uppercase">
                                  {formData.weightUnit === 'lbs' ? 'LBS' : 'KG'}
                                </span>
                              </div>
                            </div>

                            {errors.weight && (
                              <p className="text-xs font-medium text-red-600 mt-2 flex items-center gap-1">
                                <AlertCircle size={13} /> {errors.weight}
                              </p>
                            )}
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700">
                              Biological Sex at Birth <span className="text-red-600">*</span>
                            </label>
                            <span className="text-[11px] text-neutral-500">Required for clinical dosing</span>
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            {(['male', 'female', 'other'] as const).map((genderOption) => {
                              const isSelected = formData.sex === genderOption;
                              const label = genderOption === 'male' ? 'Male' : genderOption === 'female' ? 'Female' : 'Other';
                              return (
                                <button
                                  key={genderOption}
                                  type="button"
                                  onClick={() => {
                                    setFormData(prev => ({ ...prev, sex: genderOption }));
                                    if (errors.sex) setErrors(prev => ({ ...prev, sex: '' }));
                                  }}
                                  className={cn(
                                    "py-3 px-4 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                                    isSelected
                                      ? "bg-neutral-950 text-white border-neutral-950 shadow-xs"
                                      : "bg-white text-neutral-800 border-neutral-300 hover:bg-neutral-100 hover:border-neutral-400"
                                  )}
                                >
                                  {isSelected && <Check size={14} strokeWidth={3} />}
                                  <span>{label}</span>
                                </button>
                              );
                            })}
                          </div>
                          {errors.sex && (
                            <p className="text-xs font-medium text-red-600 mt-2 flex items-center gap-1">
                              <AlertCircle size={13} /> {errors.sex}
                            </p>
                          )}
                        </div>
                        
                        <button 
                          type="button"
                          onClick={nextStep}
                          className="mt-6 w-full flex items-center justify-center bg-neutral-950 border border-neutral-950 py-4 rounded-full text-xs font-bold uppercase tracking-wider text-white hover:bg-neutral-800 transition-colors cursor-pointer"
                        >
                          <span>Continue to Medical History</span>
                          <ArrowRight size={16} className="ml-2" />
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* Step 4: Medical History & Conditions */}
                  {step === 4 && (
                    <motion.div
                      key="step4"
                      variants={pageVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      transition={pageTransition}
                      className="bg-white p-6 sm:p-8 md:p-10 rounded-2xl sm:rounded-3xl border border-neutral-200/90 hover:border-neutral-950 transition-colors"
                    >
                      <span className="text-xs font-bold tracking-widest text-neutral-500 uppercase block mb-2">
                        Safety Clearance
                      </span>
                      <h1 className="font-sans text-3xl sm:text-4xl font-extrabold text-neutral-950 mb-3 tracking-tight">
                        Medical History
                      </h1>
                      <p className="text-neutral-600 text-sm sm:text-base mb-6 sm:mb-8">
                        The more accurate your answers, the safer your customized protocol.
                      </p>
                      
                      <div className="space-y-6">
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-3">
                            Check all that apply to you or your family: <span className="text-red-600">*</span>
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {['Diabetes', 'Heart Disease', 'High Blood Pressure', 'Thyroid Disorder', 'Kidney Disease', 'None of the above'].map(condition => {
                              const isChecked = formData.conditions.includes(condition);
                              return (
                                <button
                                  type="button"
                                  key={condition}
                                  onClick={() => toggleCondition(condition)}
                                  className={cn(
                                    "flex items-center justify-between p-3.5 rounded-xl border text-xs font-medium transition-all text-left cursor-pointer",
                                    isChecked
                                      ? "border-neutral-950 bg-neutral-100 font-bold text-neutral-950"
                                      : "border-neutral-200 bg-neutral-50/70 text-neutral-800 hover:bg-neutral-100"
                                  )}
                                >
                                  <span>{condition}</span>
                                  <div className={cn(
                                    "w-4 h-4 rounded border flex items-center justify-center shrink-0 ml-2 transition-colors",
                                    isChecked ? "bg-neutral-950 border-neutral-950 text-white" : "border-neutral-300 bg-white text-transparent"
                                  )}>
                                    <Check size={11} strokeWidth={3} />
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                          {errors.conditions && (
                            <p className="text-xs font-medium text-red-600 mt-2 flex items-center gap-1">
                              <AlertCircle size={13} /> {errors.conditions}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2">
                            Other Known Medical Conditions (Optional)
                          </label>
                          <textarea 
                            value={formData.medicalHistory}
                            onChange={(e) => setFormData(prev => ({ ...prev, medicalHistory: e.target.value }))}
                            className="w-full rounded-xl border border-neutral-300 bg-white p-4 focus:outline-none focus:ring-2 focus:ring-neutral-950 text-sm text-neutral-950 resize-none h-24" 
                            placeholder="List any diagnosed conditions (e.g. asthma, sleep apnea, or write 'None')" 
                          />
                        </div>
                        
                        <button 
                          type="button"
                          onClick={nextStep}
                          className="mt-6 w-full flex items-center justify-center bg-neutral-950 border border-neutral-950 py-4 rounded-full text-xs font-bold uppercase tracking-wider text-white hover:bg-neutral-800 transition-colors cursor-pointer"
                        >
                          <span>Continue to Current Medications</span>
                          <ArrowRight size={16} className="ml-2" />
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* Step 5: Current Medications & Allergies */}
                  {step === 5 && (
                    <motion.div
                      key="step5"
                      variants={pageVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      transition={pageTransition}
                      className="bg-white p-6 sm:p-8 md:p-10 rounded-2xl sm:rounded-3xl border border-neutral-200/90 hover:border-neutral-950 transition-colors"
                    >
                      <span className="text-xs font-bold tracking-widest text-neutral-500 uppercase block mb-2">
                        Interaction Check
                      </span>
                      <h1 className="font-sans text-3xl sm:text-4xl font-extrabold text-neutral-950 mb-3 tracking-tight">
                        Current Medications & Allergies
                      </h1>
                      <p className="text-neutral-600 text-sm sm:text-base mb-6 sm:mb-8">
                        Include daily prescriptions, over-the-counter medicines, or dietary supplements to avoid contraindications.
                      </p>
                      
                      <div className="space-y-5">
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2">
                            Active Medications
                          </label>
                          <textarea 
                            value={formData.medications}
                            onChange={(e) => setFormData(prev => ({ ...prev, medications: e.target.value }))}
                            className="w-full rounded-xl border border-neutral-300 bg-white p-4 focus:outline-none focus:ring-2 focus:ring-neutral-950 text-sm text-neutral-950 resize-none h-24" 
                            placeholder="List any medications you currently take daily or occasionally (or write 'None')" 
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2">
                            Known Drug or Food Allergies
                          </label>
                          <textarea 
                            value={formData.allergies}
                            onChange={(e) => setFormData(prev => ({ ...prev, allergies: e.target.value }))}
                            className="w-full rounded-xl border border-neutral-300 bg-white p-4 focus:outline-none focus:ring-2 focus:ring-neutral-950 text-sm text-neutral-950 resize-none h-20" 
                            placeholder="List any known drug reactions (or write 'No known allergies')" 
                          />
                        </div>
                        
                        <button 
                          type="button"
                          onClick={nextStep}
                          className="mt-6 w-full flex items-center justify-center bg-neutral-950 border border-neutral-950 py-4 rounded-full text-xs font-bold uppercase tracking-wider text-white hover:bg-neutral-800 transition-colors cursor-pointer"
                        >
                          <span>Review & Confirm</span>
                          <ArrowRight size={16} className="ml-2" />
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* Step 6: Confirm Clinical Consent */}
                  {step === 6 && (
                    <motion.div
                      key="step6"
                      variants={pageVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      transition={pageTransition}
                      className="bg-white p-6 sm:p-8 md:p-10 rounded-2xl sm:rounded-3xl border border-neutral-200/90 hover:border-neutral-950 transition-colors"
                    >
                      <span className="text-xs font-bold tracking-widest text-neutral-500 uppercase block mb-2">
                        Final Step
                      </span>
                      <h1 className="font-sans text-3xl sm:text-4xl font-extrabold text-neutral-950 mb-3 tracking-tight">
                        Confirm Clinical Consent
                      </h1>
                      <p className="text-neutral-600 text-sm sm:text-base mb-6 sm:mb-8">
                        Review the clinical terms. Once submitted, your chart will be reviewed by a licensed doctor within 24 hours.
                      </p>
                      
                      <div className="space-y-4 mb-6 sm:mb-8">
                        <label className="flex items-start gap-3 p-4 rounded-2xl border border-neutral-200 bg-neutral-50 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={formData.consentTruth}
                            onChange={(e) => setFormData(prev => ({ ...prev, consentTruth: e.target.checked }))}
                            className="mt-1 w-4 h-4 rounded text-neutral-950 focus:ring-neutral-950 cursor-pointer" 
                          />
                          <span className="text-xs text-neutral-700 leading-relaxed">
                            <strong className="text-neutral-950 block mb-0.5">Truthfulness of Health Data</strong>
                            I confirm that all medical history and information provided is accurate and truthful.
                          </span>
                        </label>
                        <label className="flex items-start gap-3 p-4 rounded-2xl border border-neutral-200 bg-neutral-50 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={formData.consentTelehealth}
                            onChange={(e) => setFormData(prev => ({ ...prev, consentTelehealth: e.target.checked }))}
                            className="mt-1 w-4 h-4 rounded text-neutral-950 focus:ring-neutral-950 cursor-pointer" 
                          />
                          <span className="text-xs text-neutral-700 leading-relaxed">
                            <strong className="text-neutral-950 block mb-0.5">Telehealth Medical Consent</strong>
                            I consent to receive telehealth clinical evaluations and treatment from a US-licensed healthcare provider.
                          </span>
                        </label>
                        <label className="flex items-start gap-3 p-4 rounded-2xl border border-neutral-200 bg-neutral-50 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={formData.consentPrivacy}
                            onChange={(e) => setFormData(prev => ({ ...prev, consentPrivacy: e.target.checked }))}
                            className="mt-1 w-4 h-4 rounded text-neutral-950 focus:ring-neutral-950 cursor-pointer" 
                          />
                          <span className="text-xs text-neutral-700 leading-relaxed">
                            <strong className="text-neutral-950 block mb-0.5">Confidentiality & Data Protection</strong>
                            I acknowledge that my health records are strictly confidential and securely protected under federal medical privacy regulations.
                          </span>
                        </label>
                      </div>

                      {errors.consent && (
                        <p className="text-xs font-medium text-red-600 mb-4 flex items-center gap-1">
                          <AlertCircle size={14} /> {errors.consent}
                        </p>
                      )}
                      
                      <button 
                        type="button"
                        onClick={handleSubmit}
                        className="w-full flex items-center justify-center bg-neutral-950 border border-neutral-950 py-4 rounded-full text-xs font-bold uppercase tracking-wider text-white hover:bg-neutral-800 transition-colors cursor-pointer"
                      >
                        <CheckCircle2 size={18} className="mr-2" />
                        Submit for Doctor Review
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            ) : isAnalyzing ? (
              /* Monochromatic Skeleton Analyzing Screen */
              <motion.div
                key="analyzing-skeleton"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="bg-white p-6 sm:p-10 md:p-12 rounded-2xl sm:rounded-3xl border border-neutral-200/90 shadow-none space-y-6"
              >
                <div className="flex items-center justify-between border-b border-neutral-200/80 pb-4">
                  <div className="flex items-center gap-3">
                    <Loader2 size={20} className="animate-spin text-neutral-950" />
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-neutral-950 block">
                        Compiling Clinical Intake
                      </span>
                      <span className="text-[11px] text-neutral-500">
                        {analyzingStage === 0 && "Securing clinical health chart..."}
                        {analyzingStage === 1 && "Cross-referencing FDA formulary contraindications..."}
                        {analyzingStage === 2 && "Connecting with state-licensed medical board physician..."}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-neutral-400">
                    {analyzingStage === 0 ? "35%" : analyzingStage === 1 ? "75%" : "98%"}
                  </span>
                </div>

                {/* Monochromatic Skeleton Shimmer Rows */}
                <div className="space-y-4 pt-2">
                  <div className="flex items-center gap-4">
                    <Skeleton className="w-12 h-12 rounded-full shrink-0" />
                    <div className="space-y-2 flex-grow">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-neutral-50/90 border border-neutral-200/70 space-y-3">
                    <div className="flex justify-between items-center">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-4 w-16 rounded-full" />
                    </div>
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-4/5" />
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="p-3.5 rounded-xl border border-neutral-200/60 space-y-2">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-5 w-24" />
                    </div>
                    <div className="p-3.5 rounded-xl border border-neutral-200/60 space-y-2">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-5 w-28" />
                    </div>
                  </div>

                  <div className="pt-2">
                    <Skeleton className="h-11 w-full rounded-full" />
                  </div>
                </div>
              </motion.div>
            ) : (
              /* Success Submission Screen with personalized chart recap */
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white p-6 sm:p-10 md:p-12 rounded-2xl sm:rounded-3xl border border-neutral-200/90 text-center"
              >
                <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-950 mx-auto mb-6">
                  <CheckCircle2 size={32} />
                </div>
                <span className="text-xs font-bold uppercase tracking-widest text-neutral-500 block mb-2">
                  Intake Received
                </span>
                <h2 className="font-sans text-3xl font-extrabold text-neutral-950 tracking-tight mb-2">
                  {formData.fullName ? `${formData.fullName}, your chart is in review.` : 'Your medical intake is in review.'}
                </h2>
                <p className="text-neutral-600 text-sm sm:text-base leading-relaxed max-w-md mx-auto mb-6 sm:mb-8">
                  A licensed US physician is reviewing your health records. Confirmation will be sent to <strong className="text-neutral-900">{formData.email || 'your email'}</strong> within 24 hours.
                </p>
                <div className="p-5 rounded-2xl bg-neutral-50 border border-neutral-200/80 max-w-md mx-auto mb-6 sm:mb-8 text-xs text-neutral-700 text-left space-y-2.5">
                  <div className="flex justify-between pb-1.5 border-b border-neutral-200/50">
                    <span className="font-medium text-neutral-600">Clinical Focus:</span>
                    <span className="font-bold text-neutral-950">
                      {formData.primaryConcern === 'weight' ? 'Medical Weight Loss (GLP-1)' : formData.primaryConcern === 'hair' ? 'Hair Growth & Density' : 'Sexual Health'}
                    </span>
                  </div>
                  {formData.height && formData.weight && (
                    <div className="flex justify-between pb-1.5 border-b border-neutral-200/50">
                      <span className="font-medium text-neutral-600">Patient Biometrics:</span>
                      <span className="font-bold text-neutral-950">
                        {formData.height} {formData.heightUnit === 'inches' ? 'in' : 'cm'} • {formData.weight} {formData.weightUnit === 'lbs' ? 'lbs' : 'kg'}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between pb-1.5 border-b border-neutral-200/50">
                    <span className="font-medium text-neutral-600">Status:</span>
                    <span className="font-bold text-neutral-950">Under Clinician Review</span>
                  </div>
                  <div className="flex justify-between pb-1.5 border-b border-neutral-200/50">
                    <span className="font-medium text-neutral-600">Turnaround:</span>
                    <span>&lt; 24 Hours</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-neutral-600">Delivery:</span>
                    <span>Free 2-Day Discreet Packaging</span>
                  </div>
                </div>
                <Link
                  to="/account"
                  className="inline-flex items-center justify-center bg-neutral-950 border border-neutral-950 text-white px-8 py-3.5 rounded-full text-xs font-bold uppercase tracking-wider hover:bg-neutral-800 transition-colors"
                >
                  <ArrowLeft size={16} className="mr-2" />
                  Go to My Account
                </Link>
              </motion.div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}

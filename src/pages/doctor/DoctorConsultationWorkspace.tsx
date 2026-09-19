import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { StatusBadge } from '../../components/doctor/common/StatusBadge';
import { PriorityIndicator } from '../../components/doctor/common/PriorityIndicator';
import { useDoctorAuth } from '../../context/DoctorAuthContext';
import { supabase } from '../../lib/supabase';
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Lock,
  Save,
  Activity,
  ShieldCheck,
  Stethoscope,
  Info,
  Clock,
  Pill,
  Check,
  Plus,
  Trash2,
  FileText,
  User,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface MedicationOptionItem {
  id: string;
  name: string;
  strength: string;
  dosageForm: string;
  priceInr: number;
  description: string;
  isRecommended?: boolean;
}

export default function DoctorConsultationWorkspace() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { doctor } = useDoctorAuth();

  // Consultation state (loaded from live backend)
  const [loading, setLoading] = useState(true);
  const [consultationData, setConsultationData] = useState<any | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notificationBanner, setNotificationBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Clinical SOAP & Assessment State
  const [subjective, setSubjective] = useState('');
  const [objective, setObjective] = useState('');
  const [assessment, setAssessment] = useState('');
  const [plan, setPlan] = useState('');
  const [customClinicianMessage, setCustomClinicianMessage] = useState('');

  // Medication Options Builder
  const [medicationOptions, setMedicationOptions] = useState<MedicationOptionItem[]>([]);

  // Sign & Approve Dialog State
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [attestationChecked, setAttestationChecked] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);

  // Helper to fetch Supabase token
  const getDoctorToken = async (): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  };

  const loadConsultation = async () => {
    if (!id) {
      setLoadError('No consultation ID specified.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);

    try {
      const token = await getDoctorToken();
      if (!token) {
        setLoadError('Doctor authentication required. Please sign in.');
        setLoading(false);
        return;
      }

      const res = await fetch(`/api/clinical/consultations/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setConsultationData(data);
        if (data.medicationOptions?.options?.length > 0) {
          setMedicationOptions(data.medicationOptions.options);
        }
        if (data.medicationOptions?.customClinicianMessage) {
          setCustomClinicianMessage(data.medicationOptions.customClinicianMessage);
        }
        if (data.clinicalNotes?.length > 0) {
          const latest = data.clinicalNotes[0];
          setSubjective(latest.subjective || '');
          setObjective(latest.objective || '');
          setAssessment(latest.assessment || latest.content || '');
          setPlan(latest.plan || '');
        } else {
          setSubjective('');
          setObjective('');
          setAssessment('');
          setPlan('');
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        setLoadError(errData.error || 'Failed to load clinical consultation record.');
      }
    } catch (err: any) {
      console.error('Backend consultation load error:', err);
      setLoadError(err.message || 'An unexpected error occurred while loading the consultation.');
    } finally {
      setLoading(false);
    }
  };

  // Load consultation details on mount
  useEffect(() => {
    loadConsultation();
  }, [id]);

  const handleClaimConsultation = async () => {
    setIsClaiming(true);
    try {
      const token = await getDoctorToken();
      const res = await fetch(`/api/clinical/consultations/${id}/claim`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to claim consultation');
      }

      await loadConsultation();
      setNotificationBanner({
        type: 'success',
        message: 'Consultation claimed successfully. Full clinical record is now unlocked.',
      });
    } catch (err: any) {
      setNotificationBanner({
        type: 'error',
        message: err.message || 'Failed to claim consultation.',
      });
    } finally {
      setIsClaiming(false);
    }
  };

  const handleSaveNotes = async () => {
    setIsSavingNotes(true);
    const targetId = consultationData?.consultation?.id;

    try {
      const token = await getDoctorToken();
      if (token && targetId && !consultationData.isMock) {
        // Save clinical note
        const resNote = await fetch(`/api/clinical/consultations/${targetId}/notes`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            subjective,
            objective,
            assessment,
            plan,
          }),
        });

        if (!resNote.ok) {
          const errData = await resNote.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to save clinical note');
        }

        // Save prescription options
        const resRx = await fetch(`/api/clinical/consultations/${targetId}/prescription`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            directions: plan,
            medicationOptions,
            customClinicianMessage,
          }),
        });

        if (!resRx.ok) {
          const errData = await resRx.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to save prescription options');
        }
      }

      setNotificationBanner({
        type: 'success',
        message: 'Clinical assessment and prescription options saved successfully.',
      });
      setTimeout(() => setNotificationBanner(null), 4000);
    } catch (err: any) {
      setNotificationBanner({
        type: 'error',
        message: err.message || 'Failed to save clinical notes.',
      });
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleApproveAndSign = async () => {
    if (!attestationChecked) return;

    setIsApproving(true);
    const targetId = consultationData?.consultation?.id;

    try {
      const token = await getDoctorToken();

      if (token && targetId && !consultationData.isMock) {
        // Save clinical notes first
        const resNote = await fetch(`/api/clinical/consultations/${targetId}/notes`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            subjective,
            objective,
            assessment,
            plan,
          }),
        });

        if (!resNote.ok) {
          const errData = await resNote.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to save clinical notes prior to approval');
        }

        // Save prescription options
        const resRx = await fetch(`/api/clinical/consultations/${targetId}/prescription`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            directions: plan,
            medicationOptions,
            customClinicianMessage,
          }),
        });

        if (!resRx.ok) {
          const errData = await resRx.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to save prescription options prior to approval');
        }

        // Approve consultation
        const res = await fetch(`/api/clinical/consultations/${targetId}/approve`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            clinicianAttestation: true,
            treatmentSummary: assessment,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to approve consultation');
        }
      }

      setConsultationData((prev: any) => ({
        ...prev,
        consultation: {
          ...prev.consultation,
          status: 'completed',
        },
      }));

      setShowApprovalModal(false);
      setNotificationBanner({
        type: 'success',
        message: 'Consultation approved and patient notification dispatched.',
      });
    } catch (err: any) {
      console.error('Approval failed:', err);
      setNotificationBanner({
        type: 'error',
        message: err.message || 'Failed to approve consultation.',
      });
    } finally {
      setIsApproving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16 text-stone-500 gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-stone-900" />
        <span className="text-xs font-semibold">Loading clinical workspace...</span>
      </div>
    );
  }

  if (loadError || !consultationData) {
    return (
      <div className="p-8 max-w-xl mx-auto my-12 bg-white rounded-xl border border-stone-200 shadow-sm text-center">
        <AlertCircle className="w-10 h-10 text-amber-600 mx-auto mb-3" />
        <h2 className="text-base font-bold text-stone-900 mb-1">Consultation Unavailable</h2>
        <p className="text-xs text-stone-600 mb-6">{loadError || 'The requested clinical consultation could not be found or you do not have permission to view it.'}</p>
        <Link
          to="/doctor/work-queue"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Work Queue</span>
        </Link>
      </div>
    );
  }

  const c = consultationData?.consultation || {};
  const responses = c?.responses || {};
  const patient = consultationData?.patient || {};
  const isCompleted = c.status === 'completed';

  // Calculate BMI (Height in cm, Weight in kg)
  const rawHeight = Number(responses.height);
  const rawWeight = Number(responses.weight);
  const heightCm = !isNaN(rawHeight) && rawHeight > 0 ? rawHeight : null;
  const weightKg = !isNaN(rawWeight) && rawWeight > 0 ? rawWeight : null;

  let bmiDisplay = 'Not available';
  if (heightCm && weightKg) {
    const bmiVal = weightKg / Math.pow(heightCm / 100, 2);
    if (!isNaN(bmiVal) && isFinite(bmiVal) && bmiVal > 0) {
      bmiDisplay = bmiVal.toFixed(1);
    }
  }

  const handleAddMedicationOption = () => {
    const newOpt: MedicationOptionItem = {
      id: `opt_${Date.now()}`,
      name: '',
      strength: '',
      dosageForm: 'Oral / Injection',
      priceInr: 0,
      description: '',
      isRecommended: medicationOptions.length === 0,
    };
    setMedicationOptions((prev) => [...prev, newOpt]);
  };

  const handleRemoveMedicationOption = (index: number) => {
    setMedicationOptions((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* 1. Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200">
        <div className="flex items-center gap-3">
          <Link
            to="/doctor/work-queue"
            className="p-1.5 rounded-lg border border-stone-200 hover:bg-stone-100 text-stone-600 transition-colors cursor-pointer"
            title="Return to Work Queue"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-stone-900 font-sans tracking-tight">
                Consultation Review: {responses.fullName || patient.display_name || 'Patient Chart'}
              </h1>
              <span className="font-mono text-2xs px-2 py-0.5 rounded bg-stone-100 text-stone-600 border border-stone-200">
                ID: {c.id?.slice(0, 8)}
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Clinical Category: <span className="font-semibold text-stone-800 capitalize">{c.primary_concern || 'Weight Management'}</span> • Asynchronous Intake
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <StatusBadge status={isCompleted ? 'completed' : (c.status || 'in_review')} />

          {consultationData.isTriageOnly ? (
            <button
              type="button"
              onClick={handleClaimConsultation}
              disabled={isClaiming}
              className="px-4 py-2 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold flex items-center gap-2 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
            >
              {isClaiming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Stethoscope className="w-3.5 h-3.5 text-emerald-400" />}
              <span>Claim Consultation</span>
            </button>
          ) : !isCompleted ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSaveNotes}
                disabled={isSavingNotes}
                className="px-3 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSavingNotes ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Save Notes</span>
              </button>

              <button
                type="button"
                onClick={() => setShowApprovalModal(true)}
                className="px-4 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Sign & Approve</span>
              </button>
            </div>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-2xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
              Clinical Review Complete
            </span>
          )}
        </div>
      </div>

      {/* Triage Claim Notice */}
      {consultationData.isTriageOnly && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900">
          <div className="flex items-start sm:items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <p className="font-bold">Unassigned Consultation (Triage Mode)</p>
              <p className="text-2xs text-amber-800">
                You are viewing preliminary triage metadata. Claim this consultation to assign it to yourself and unlock the full medical record, SOAP charting, and prescription options.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClaimConsultation}
            disabled={isClaiming}
            className="px-4 py-2 rounded-xl bg-amber-900 hover:bg-amber-950 text-white text-xs font-bold shrink-0 flex items-center justify-center gap-1.5 transition-colors"
          >
            {isClaiming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Stethoscope className="w-3.5 h-3.5" />}
            <span>Claim Case Now</span>
          </button>
        </div>
      )}

      {/* Notification Toast */}
      {notificationBanner && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs animate-in fade-in duration-200 ${
            notificationBanner.type === 'success'
              ? 'bg-emerald-950 text-emerald-100 border-emerald-800'
              : 'bg-rose-950 text-rose-100 border-rose-800'
          }`}
        >
          <div className="flex items-center gap-2 font-medium">
            {notificationBanner.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400" />
            )}
            <span>{notificationBanner.message}</span>
          </div>
          <button
            onClick={() => setNotificationBanner(null)}
            className="text-2xs text-stone-300 hover:text-white"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 2. Two-Column Clinical Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Patient History, Biometrics, Responses & SOAP */}
        <div className="lg:col-span-2 space-y-6">
          {/* SECTION A: Patient Overview & Vitals */}
          <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
              <span className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-stone-500" />
                Patient Overview & Biometrics
              </span>
              <span className="text-2xs text-stone-400">Intake Record</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/70">
                <span className="text-3xs font-semibold uppercase text-stone-400 block">Biological Sex</span>
                <span className="text-xs font-bold text-stone-900 capitalize">{responses.sex || patient.sex || 'Not provided'}</span>
              </div>
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/70">
                <span className="text-3xs font-semibold uppercase text-stone-400 block">Height</span>
                <span className="text-xs font-bold text-stone-900">{heightCm ? `${heightCm} cm` : 'Not available'}</span>
              </div>
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/70">
                <span className="text-3xs font-semibold uppercase text-stone-400 block">Weight</span>
                <span className="text-xs font-bold text-stone-900">{weightKg ? `${weightKg} kg` : 'Not available'}</span>
              </div>
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/70">
                <span className="text-3xs font-semibold uppercase text-stone-400 block">Calculated BMI</span>
                <span className="text-xs font-bold text-stone-900">{bmiDisplay}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/70 space-y-1">
                <span className="text-3xs font-semibold uppercase text-stone-400 block">Reported Medical Conditions</span>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {(Array.isArray(responses.conditions) && responses.conditions.length > 0 ? responses.conditions : ['None declared']).map(
                    (c: string) => (
                      <span key={c} className="text-2xs font-semibold px-2 py-0.5 rounded bg-white text-stone-700 border border-stone-200">
                        {c}
                      </span>
                    )
                  )}
                </div>
              </div>

              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/70 space-y-1">
                <span className="text-3xs font-semibold uppercase text-stone-400 block">Current Medications & Allergies</span>
                <p className="text-2xs text-stone-700 font-medium">
                  <strong>Meds:</strong> {responses.medications || 'None reported'}
                </p>
                <p className="text-2xs text-stone-700 font-medium">
                  <strong>Allergies:</strong> {responses.allergies || 'NKDA (No known drug allergies)'}
                </p>
              </div>
            </div>
          </div>

          {/* SECTION B: Clinical SOAP Notes Editor */}
          <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
              <span className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-stone-500" />
                Clinician SOAP Assessment
              </span>
              <span className="text-2xs text-stone-400">Encrypted Chart Entry</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-2xs font-bold uppercase tracking-wider text-stone-600 mb-1">
                  Subjective (Chief Complaint & Patient Report)
                </label>
                <textarea
                  rows={2}
                  value={subjective}
                  onChange={(e) => setSubjective(e.target.value)}
                  disabled={isCompleted}
                  className="w-full rounded-xl border border-stone-200 p-2.5 text-xs text-stone-900 focus:border-stone-900 focus:outline-none disabled:bg-stone-50"
                />
              </div>

              <div>
                <label className="block text-2xs font-bold uppercase tracking-wider text-stone-600 mb-1">
                  Objective (Vitals, Lab Values & Biometrics)
                </label>
                <textarea
                  rows={2}
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  disabled={isCompleted}
                  className="w-full rounded-xl border border-stone-200 p-2.5 text-xs text-stone-900 focus:border-stone-900 focus:outline-none disabled:bg-stone-50"
                />
              </div>

              <div>
                <label className="block text-2xs font-bold uppercase tracking-wider text-stone-600 mb-1">
                  Assessment (Clinical Impression & Eligibility)
                </label>
                <textarea
                  rows={2}
                  value={assessment}
                  onChange={(e) => setAssessment(e.target.value)}
                  disabled={isCompleted}
                  className="w-full rounded-xl border border-stone-200 p-2.5 text-xs text-stone-900 focus:border-stone-900 focus:outline-none disabled:bg-stone-50"
                />
              </div>

              <div>
                <label className="block text-2xs font-bold uppercase tracking-wider text-stone-600 mb-1">
                  Plan & Prescribing Directions
                </label>
                <textarea
                  rows={2}
                  value={plan}
                  onChange={(e) => setPlan(e.target.value)}
                  disabled={isCompleted}
                  className="w-full rounded-xl border border-stone-200 p-2.5 text-xs text-stone-900 focus:border-stone-900 focus:outline-none disabled:bg-stone-50"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): Treatment Plan & Medication Options Builder */}
        <div className="space-y-6">
          <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
              <span className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
                <Pill className="w-3.5 h-3.5 text-stone-500" />
                Medication Options Builder
              </span>
              <span className="text-2xs text-stone-400">Options 1–3</span>
            </div>

            <p className="text-2xs text-stone-500 leading-relaxed">
              Define the clinical options offered to the patient. Patients will choose exactly one formulation upon reviewing your approval.
            </p>

            {/* Custom Clinician Message */}
            <div className="space-y-1.5">
              <label className="block text-2xs font-bold uppercase tracking-wider text-stone-600">
                Clinician Message to Patient
              </label>
              <textarea
                rows={3}
                value={customClinicianMessage}
                onChange={(e) => setCustomClinicianMessage(e.target.value)}
                disabled={isCompleted}
                className="w-full rounded-xl border border-stone-200 p-2.5 text-xs text-stone-900 focus:border-stone-900 focus:outline-none disabled:bg-stone-50"
                placeholder="Enter personalized guidance for the patient..."
              />
            </div>

            {/* Structured Options List */}
            <div className="space-y-3 pt-1">
              {medicationOptions.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-stone-300 text-center space-y-2 my-2">
                  <p className="text-xs font-semibold text-stone-600">No medication options added yet.</p>
                  <p className="text-2xs text-stone-400">Add custom formulations or protocol options for patient evaluation.</p>
                </div>
              ) : (
                medicationOptions.map((opt, index) => (
                  <div
                    key={opt.id}
                    className="p-3.5 rounded-xl border border-stone-200 bg-stone-50/70 space-y-2 relative"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-2xs font-bold uppercase tracking-wider text-stone-800">
                        Option {index + 1} {opt.isRecommended && '• (Recommended)'}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-stone-900 font-mono">
                          ₹{opt.priceInr.toLocaleString('en-IN')}
                        </span>
                        {!isCompleted && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMedicationOption(index)}
                            className="p-1 rounded text-stone-400 hover:text-rose-600 transition-colors"
                            title="Remove option"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <input
                      type="text"
                      value={opt.name}
                      disabled={isCompleted}
                      onChange={(e) => {
                        const updated = [...medicationOptions];
                        updated[index].name = e.target.value;
                        setMedicationOptions(updated);
                      }}
                      className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-stone-900 focus:outline-none"
                      placeholder="Medication Name"
                    />

                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={opt.strength}
                        disabled={isCompleted}
                        onChange={(e) => {
                          const updated = [...medicationOptions];
                          updated[index].strength = e.target.value;
                          setMedicationOptions(updated);
                        }}
                        className="rounded-lg border border-stone-200 bg-white px-2 py-1 text-2xs text-stone-800"
                        placeholder="Strength (e.g. 0.25mg)"
                      />
                      <input
                        type="number"
                        value={opt.priceInr}
                        disabled={isCompleted}
                        onChange={(e) => {
                          const updated = [...medicationOptions];
                          updated[index].priceInr = Number(e.target.value) || 0;
                          setMedicationOptions(updated);
                        }}
                        className="rounded-lg border border-stone-200 bg-white px-2 py-1 text-2xs text-stone-800"
                        placeholder="Price in INR"
                      />
                    </div>

                    <input
                      type="text"
                      value={opt.description}
                      disabled={isCompleted}
                      onChange={(e) => {
                        const updated = [...medicationOptions];
                        updated[index].description = e.target.value;
                        setMedicationOptions(updated);
                      }}
                      className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-2xs text-stone-600"
                      placeholder="Brief clinical description"
                    />
                  </div>
                ))
              )}

              {!isCompleted && (
                <button
                  type="button"
                  onClick={handleAddMedicationOption}
                  className="w-full py-2 px-3 rounded-xl border border-dashed border-stone-300 hover:border-stone-400 text-stone-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Medication Option</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Sign & Approve Dialog Modal */}
      {showApprovalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-2xl space-y-5">
            <div className="flex items-center gap-2.5 border-b border-stone-100 pb-3">
              <ShieldCheck className="w-6 h-6 text-emerald-700" />
              <div>
                <h3 className="text-base font-bold text-stone-900 font-sans">
                  Clinical Approval & Attestation
                </h3>
                <p className="text-2xs text-stone-500">
                  Verify prescription parameters before approving and dispatching patient notification.
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs bg-stone-50 p-4 rounded-2xl border border-stone-200">
              <div className="flex justify-between border-b border-stone-200/60 pb-1.5">
                <span className="text-stone-500">Patient Name:</span>
                <span className="font-bold text-stone-900">{responses.fullName || patient.display_name}</span>
              </div>
              <div className="flex justify-between border-b border-stone-200/60 pb-1.5">
                <span className="text-stone-500">Prescribing Clinician:</span>
                <span className="font-bold text-stone-900">{doctor?.name || 'Attending Physician'}</span>
              </div>
              <div className="flex justify-between border-b border-stone-200/60 pb-1.5">
                <span className="text-stone-500">Treatment Options Prepared:</span>
                <span className="font-bold text-stone-900">{medicationOptions.length} Formulations</span>
              </div>
              <div className="space-y-1 pt-1">
                <span className="text-stone-500 block">Attestation Status:</span>
                <span className="text-2xs font-mono bg-stone-200/80 px-2 py-1 rounded text-stone-800 block">
                  Clinician attestation recorded. Digital signature integration pending.
                </span>
              </div>
            </div>

            {/* Clinician Attestation Checkbox */}
            <label className="flex items-start gap-3 p-3.5 rounded-xl border border-stone-200 bg-stone-50 cursor-pointer">
              <input
                type="checkbox"
                checked={attestationChecked}
                onChange={(e) => setAttestationChecked(e.target.checked)}
                className="mt-0.5 rounded border-stone-300 text-stone-900 focus:ring-stone-900"
              />
              <span className="text-xs text-stone-700 leading-relaxed">
                <strong>Clinician Legal Attestation:</strong> I attest that I have reviewed the patient's intake, medical history, and biometrics. I certify the patient is clinically eligible for the formulated treatment options.
              </span>
            </label>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowApprovalModal(false)}
                className="px-5 py-2.5 rounded-xl border border-stone-200 text-stone-600 text-xs font-semibold hover:bg-stone-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApproveAndSign}
                disabled={!attestationChecked || isApproving}
                className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-xs"
              >
                {isApproving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Approving & Dispatching...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm & Approve Consultation</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

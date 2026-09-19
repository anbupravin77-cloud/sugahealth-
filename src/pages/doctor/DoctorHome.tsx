import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDoctorAuth } from '../../context/DoctorAuthContext';
import { StatusBadge } from '../../components/doctor/common/StatusBadge';
import { PriorityIndicator } from '../../components/doctor/common/PriorityIndicator';
import { supabase } from '../../lib/supabase';
import {
  AlertCircle,
  ArrowRight,
  Clock,
  MessageSquare,
  Users,
  ClipboardList,
  Activity,
  Calendar,
  CheckCircle2,
  Stethoscope,
  ChevronRight,
  ShieldAlert,
  Loader2,
} from 'lucide-react';

export default function DoctorHome() {
  const { doctor } = useDoctorAuth();
  const [loading, setLoading] = useState(true);
  const [consultations, setConsultations] = useState<any[]>([]);

  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const fetchLiveWorklist = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        const res = await fetch('/api/clinical/doctor/consultations', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.consultations) {
            setConsultations(data.consultations);
          }
        }
      }
    } catch (err) {
      console.warn('DoctorHome live fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveWorklist();
  }, []);

  const mappedConsultations = consultations.map((c) => {
    const responses = c.responses || {};
    const categoryName =
      c.primary_concern === 'weight'
        ? 'GLP-1 Weight Management'
        : c.primary_concern === 'hair'
        ? 'Hair Regrowth'
        : c.primary_concern === 'sex'
        ? "Men's Sexual Wellness"
        : c.primary_concern || 'Telehealth Intake';

    return {
      id: c.id,
      mrn: `MRN-${c.id.slice(0, 6).toUpperCase()}`,
      patientName: responses.fullName || 'Patient',
      patientId: c.patient_id,
      patientAge: responses.age || 'N/A',
      patientGender: responses.sex ? responses.sex.charAt(0).toUpperCase() + responses.sex.slice(1) : 'N/A',
      patientState: responses.shippingAddress?.state || 'N/A',
      category: categoryName,
      requestedMedication: responses.requestedMedication || responses.medicationPreference || (c.primary_concern === 'weight' ? 'GLP-1 Weight Management' : 'Telehealth Intake'),
      reasonForReview: responses.conditions?.join(', ') || 'Asynchronous clinical evaluation',
      triagePriority: 'normal' as const,
      status: c.status === 'completed' ? 'completed' : c.status === 'under_review' ? 'in_review' : 'pending_review',
      submittedAt: c.submitted_at || c.created_at,
      waitTimeFormatted: 'Recent',
    };
  });

  const pendingConsultations = mappedConsultations.filter(
    (c) => c.status === 'pending_review' || c.status === 'in_review'
  );
  const urgentItems = pendingConsultations.filter((c) => (c as any).triagePriority === 'urgent');

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      {/* 1. Welcome & Shift Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-stone-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1">
            <Calendar className="w-3.5 h-3.5 text-emerald-700" />
            <span>{todayFormatted}</span>
            <span className="text-stone-300">•</span>
            <span className="text-emerald-800 font-medium">Telehealth Clinic Active</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 font-sans">
            Good morning, {doctor?.name || 'Clinician'}
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            {doctor?.specialty || 'General Telehealth Specialist'} • {doctor?.assignedJurisdiction?.join(', ') || 'Pan-India'}
          </p>
        </div>

        {/* Action Button to jump straight to next pending triage */}
        {pendingConsultations.length > 0 && (
          <Link
            to={`/doctor/consultations/${pendingConsultations[0].id}`}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-stone-900 text-white hover:bg-stone-800 text-xs sm:text-sm font-medium transition-colors shadow-xs group"
          >
            <Activity className="w-4 h-4 text-emerald-400" />
            <span>Review Next Patient ({pendingConsultations[0].patientName})</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        )}
      </div>

      {/* 2. Restrained Clinical Summary Strip (Non-intrusive) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3.5 bg-white border border-stone-200 rounded-xl shadow-2xs">
          <span className="text-3xs uppercase tracking-wider text-stone-400 font-semibold block">
            Total Consultations
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold text-stone-900 font-sans">
              {mappedConsultations.length}
            </span>
            <span className="text-3xs text-stone-500">In directory</span>
          </div>
        </div>

        <div className="p-3.5 bg-white border border-stone-200 rounded-xl shadow-2xs">
          <span className="text-3xs uppercase tracking-wider text-amber-700 font-semibold block">
            Awaiting Review
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold text-amber-900 font-sans">
              {pendingConsultations.length}
            </span>
            <span className="text-3xs text-amber-700">Intakes pending</span>
          </div>
        </div>

        <div className="p-3.5 bg-white border border-stone-200 rounded-xl shadow-2xs">
          <span className="text-3xs uppercase tracking-wider text-emerald-700 font-semibold block">
            Completed / Signed
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold text-emerald-900 font-sans">
              {mappedConsultations.filter(c => c.status === 'completed').length}
            </span>
            <span className="text-3xs text-emerald-700">Finalized</span>
          </div>
        </div>

        <div className="p-3.5 bg-white border border-stone-200 rounded-xl shadow-2xs">
          <span className="text-3xs uppercase tracking-wider text-stone-500 font-semibold block">
            Active Status
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-base font-bold text-stone-900 font-sans">
              Live Ready
            </span>
            <span className="text-3xs text-stone-500">Sync active</span>
          </div>
        </div>
      </div>

      {/* 3. Section: Main Work Queue */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-stone-700" />
            <h2 className="text-base font-semibold text-stone-900 font-sans">
              Awaiting Clinical Review
            </h2>
            <span className="px-2 py-0.5 rounded-full text-2xs font-medium bg-stone-100 text-stone-700 border border-stone-200">
              {pendingConsultations.length} Pending
            </span>
          </div>
          <Link
            to="/doctor/work-queue"
            className="text-xs font-medium text-stone-600 hover:text-stone-900 flex items-center gap-1"
          >
            <span>View full queue</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="p-8 bg-white border border-stone-200 rounded-xl flex items-center justify-center gap-2 text-stone-500 text-xs">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Loading pending consultations...</span>
          </div>
        ) : pendingConsultations.length === 0 ? (
          <div className="p-12 bg-white border border-stone-200 rounded-xl text-center text-xs text-stone-400">
            No consultations currently awaiting clinical review.
          </div>
        ) : (
          <div className="bg-white border border-stone-200 rounded-xl divide-y divide-stone-100 shadow-2xs overflow-hidden">
            {pendingConsultations.map((consultation) => (
              <div
                key={consultation.id}
                className="p-4 hover:bg-stone-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-stone-900 text-sm">
                      {consultation.patientName}
                    </span>
                    <span className="text-2xs text-stone-400 font-mono">
                      {consultation.patientAge}yo {consultation.patientGender} • {consultation.patientState}
                    </span>
                    <PriorityIndicator priority={consultation.triagePriority} />
                  </div>

                  <p className="text-xs text-stone-700 font-medium">
                    {consultation.requestedMedication}
                  </p>
                  <p className="text-2xs text-stone-500 line-clamp-1">
                    {consultation.reasonForReview}
                  </p>
                </div>

                <div className="flex items-center gap-3 sm:flex-col sm:items-end justify-between shrink-0">
                  <span className="text-3xs text-stone-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {consultation.waitTimeFormatted}
                  </span>
                  <Link
                    to={`/doctor/consultations/${consultation.id}`}
                    className="px-3.5 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium transition-colors shadow-2xs"
                  >
                    Review
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

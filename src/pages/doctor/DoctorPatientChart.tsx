import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PatientHeader, Patient } from '../../components/doctor/common/PatientHeader';
import { StatusBadge } from '../../components/doctor/common/StatusBadge';
import { PriorityIndicator } from '../../components/doctor/common/PriorityIndicator';
import { supabase } from '../../lib/supabase';
import {
  Activity,
  FileSpreadsheet,
  FileText,
  MessageSquare,
  Clock,
  ArrowLeft,
  AlertTriangle,
  Send,
  ShieldCheck,
  Stethoscope,
  Loader2,
} from 'lucide-react';

export default function DoctorPatientChart() {
  const { id } = useParams<{ id: string }>();
  const [liveConsultationDetails, setLiveConsultationDetails] = useState<any>(null);
  const [allConsultations, setAllConsultations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<
    'overview' | 'consultations' | 'medications' | 'labs' | 'messages' | 'timeline'
  >('overview');

  const [newReplyText, setNewReplyText] = useState('');
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [canonicalMessages, setCanonicalMessages] = useState<any[]>([]);
  const [isSendingMsg, setIsSendingMsg] = useState(false);

  const consultation = liveConsultationDetails?.consultation;
  const responses = consultation?.responses || {};
  const patientProfile = liveConsultationDetails?.patient || {};
  const doctorProfile = liveConsultationDetails?.doctor || {};
  const prescription = liveConsultationDetails?.prescription;
  const prescriptionItems = prescription?.items || [];
  const clinicalNotes = liveConsultationDetails?.clinicalNotes || [];

  // Fetch doctor patient record on mount
  useEffect(() => {
    async function loadDoctorPatientRecord() {
      if (!id) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          setLoading(false);
          return;
        }

        const headers = { 'Authorization': `Bearer ${session.access_token}` };

        // Fetch via authorized doctor patient endpoint
        const patientRes = await fetch(`/api/clinical/doctor/patients/${id}`, { headers });
        if (patientRes.ok) {
          const data = await patientRes.json();
          if (data?.consultation) {
            setLiveConsultationDetails(data);
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.error('Error loading doctor patient record:', err);
      }
      setLiveConsultationDetails(null);
      setLoading(false);
    }

    loadDoctorPatientRecord();
  }, [id]);

  // Fetch or resolve canonical thread when consultation details load
  useEffect(() => {
    async function fetchThreadAndMessages() {
      if (!consultation?.id) return;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;

        const headers = { 'Authorization': `Bearer ${session.access_token}` };

        const threadRes = await fetch(`/api/messages/consultations/${consultation.id}/thread`, { headers });
        if (threadRes.ok) {
          const { thread } = await threadRes.json();
          if (thread?.id) {
            setActiveThreadId(thread.id);
            const msgRes = await fetch(`/api/messages/threads/${thread.id}/messages`, { headers });
            if (msgRes.ok) {
              const { messages } = await msgRes.json();
              setCanonicalMessages(messages || []);
            }
          }
        }
      } catch (err) {
        console.warn('Error fetching thread or messages:', err);
      }
    }
    fetchThreadAndMessages();
  }, [consultation?.id]);

  // Units calculations: Height (cm), Weight (kg), BMI
  const heightCm = responses.height ? Number(responses.height) : null;
  const weightKg = responses.weight ? Number(responses.weight) : null;
  let computedBmi = 'Not available';
  if (weightKg && heightCm && heightCm > 0) {
    computedBmi = (weightKg / ((heightCm / 100) ** 2)).toFixed(1);
  } else if (responses.bmi) {
    computedBmi = String(responses.bmi);
  }

  // Patient object for PatientHeader
  let patient: Patient | null = null;
  if (consultation) {
    const fullName = responses.fullName ||
      (patientProfile.first_name ? `${patientProfile.first_name} ${patientProfile.last_name || ''}`.trim() : 'Patient Record');
    
    const allergiesList = Array.isArray(responses.allergies)
      ? responses.allergies
      : (responses.allergies ? [responses.allergies] : []);

    patient = {
      id: consultation.patient_id || id || 'pt-record',
      mrn: `MRN-${consultation.id?.slice(0, 6).toUpperCase()}`,
      name: fullName,
      email: patientProfile.email || 'N/A',
      phone: responses.phone || patientProfile.phone_number || 'N/A',
      dob: responses.dob || 'Not documented',
      age: responses.age || 'N/A',
      gender: responses.sex === 'female' ? 'Female' : responses.sex === 'male' ? 'Male' : (responses.sex || 'Other'),
      careStatus: (consultation.status === 'completed') ? 'active_care' : 'awaiting_review',
      careCategory: consultation.primary_concern === 'hair' ? 'Hair Regrowth' : consultation.primary_concern === 'sex' ? "Men's Sexual Wellness" : 'GLP-1 Weight Management',
      primaryConcern: consultation.primary_concern === 'weight' ? 'GLP-1 Weight Management' : 'Telehealth Intake',
      city: responses.shippingAddress?.city || 'Not documented',
      state: responses.shippingAddress?.state || 'Not documented',
      allergies: allergiesList,
    };
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReplyText.trim() || isSendingMsg || !consultation?.id) return;

    setIsSendingMsg(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      };

      let threadId = activeThreadId;

      if (!threadId) {
        const createRes = await fetch(`/api/messages/consultations/${consultation.id}/thread`, {
          method: 'POST',
          headers,
        });
        if (createRes.ok) {
          const { threadId: newTId } = await createRes.json();
          threadId = newTId;
          setActiveThreadId(newTId);
        } else {
          const errJson = await createRes.json().catch(() => ({}));
          alert(errJson.error || 'Failed to initiate conversation thread.');
          setIsSendingMsg(false);
          return;
        }
      }

      const sendRes = await fetch(`/api/messages/threads/${threadId}/send`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ text: newReplyText.trim() }),
      });

      if (sendRes.ok) {
        setNewReplyText('');
        const msgRes = await fetch(`/api/messages/threads/${threadId}/messages`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` },
        });
        if (msgRes.ok) {
          const { messages } = await msgRes.json();
          setCanonicalMessages(messages || []);
        }
      } else {
        const errJson = await sendRes.json().catch(() => ({}));
        alert(errJson.error || 'Failed to send message.');
      }
    } catch (err) {
      console.warn('Error sending message:', err);
    } finally {
      setIsSendingMsg(false);
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-stone-600" />
        <p className="text-xs text-stone-500 font-medium">Loading clinical patient record...</p>
      </div>
    );
  }

  if (!patient || !consultation) {
    return (
      <div className="p-12 text-center max-w-md mx-auto space-y-4">
        <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
        <h2 className="text-lg font-semibold text-stone-900 font-sans">No patient record available</h2>
        <p className="text-xs text-stone-500">
          No live consultation or medical intake record found matching ID: <span className="font-mono">{id}</span>.
        </p>
        <Link
          to="/doctor/work-queue"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-stone-900 text-white text-xs font-medium hover:bg-stone-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Work Queue</span>
        </Link>
      </div>
    );
  }

  const allergiesList = Array.isArray(responses.allergies)
    ? responses.allergies
    : (responses.allergies ? [responses.allergies] : []);

  const medicalConditions = Array.isArray(responses.conditions)
    ? responses.conditions
    : (responses.conditions ? [responses.conditions] : (responses.medicalHistory ? [responses.medicalHistory] : []));

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Back Navigation Bar */}
      <div className="flex items-center justify-between">
        <Link
          to="/doctor/patients"
          className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-900 font-medium transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Patients Directory</span>
        </Link>
        <span className="text-2xs font-mono text-stone-400">
          Chart MRN: {patient.mrn} • Status: {consultation.status}
        </span>
      </div>

      {/* 1. Persistent Clinical Patient Header */}
      <PatientHeader
        patient={patient}
        activeConsultationId={consultation.id}
      />

      {/* 2. Navigation Tabs */}
      <div className="border-b border-stone-200">
        <nav className="flex space-x-1 sm:space-x-4 overflow-x-auto text-xs font-medium">
          {[
            { id: 'overview', label: 'Overview', icon: Activity },
            { id: 'consultations', label: 'Consultations', icon: FileText, count: 1 },
            { id: 'medications', label: 'Medications', icon: FileSpreadsheet, count: prescriptionItems.length },
            { id: 'labs', label: 'Labs & Documents', icon: FileText, count: 0 },
            { id: 'messages', label: 'Messages', icon: MessageSquare, count: canonicalMessages.length },
            { id: 'timeline', label: 'Timeline', icon: Clock },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-3 px-3 border-b-2 whitespace-nowrap transition-colors ${
                  isActive
                    ? 'border-stone-900 text-stone-900 font-semibold'
                    : 'border-transparent text-stone-500 hover:text-stone-800 hover:border-stone-300'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-stone-900' : 'text-stone-400'}`} />
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-3xs ${
                      isActive ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* 3. Tab Content Panels */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Top Row: Vitals & Key Clinical History */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Telemetry & Vitals */}
            <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                <span className="text-xs font-semibold text-stone-900 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-stone-500" />
                  Telemetry & Vitals
                </span>
                <span className="text-3xs text-stone-400">Intake Record</span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between p-2 bg-stone-50 rounded-lg">
                  <span className="text-stone-500 text-2xs uppercase">Height</span>
                  <span className="font-bold text-stone-900 font-mono text-sm">
                    {heightCm ? `${heightCm} cm` : 'Not available'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2 bg-stone-50 rounded-lg">
                  <span className="text-stone-500 text-2xs uppercase">Weight</span>
                  <span className="font-bold text-stone-900 font-mono text-sm">
                    {weightKg ? `${weightKg} kg` : 'Not available'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2 bg-stone-50 rounded-lg">
                  <span className="text-stone-500 text-2xs uppercase">Body Mass Index (BMI)</span>
                  <span className="font-bold text-stone-900 font-mono text-sm">
                    {computedBmi !== 'Not available' ? `${computedBmi} kg/m²` : 'Not available'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2 bg-stone-50 rounded-lg">
                  <span className="text-stone-500 text-2xs uppercase">Blood Pressure</span>
                  <span className="font-bold text-stone-900 font-mono text-sm">
                    {responses.bloodPressure || 'Not documented'}
                  </span>
                </div>
              </div>
            </div>

            {/* Medical History */}
            <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                <span className="text-xs font-semibold text-stone-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-stone-500" />
                  Medical History
                </span>
                <span className="text-3xs text-stone-400 font-mono">{medicalConditions.length} Conditions</span>
              </div>

              {medicalConditions.length === 0 ? (
                <p className="text-xs text-stone-400 py-3">No prior medical conditions documented.</p>
              ) : (
                <ul className="space-y-2 text-xs text-stone-700">
                  {medicalConditions.map((item: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2 p-1.5 bg-stone-50/70 rounded">
                      <span className="text-stone-400 font-bold">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Current Treatment Regimen */}
            <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                <span className="text-xs font-semibold text-stone-900 flex items-center gap-1.5">
                  <Stethoscope className="w-3.5 h-3.5 text-stone-500" />
                  Current Treatment Regimen
                </span>
                <StatusBadge status={consultation.status} size="sm" />
              </div>

              <div className="space-y-2 text-xs">
                {clinicalNotes.length > 0 ? (
                  <p className="text-stone-700 leading-relaxed bg-stone-50 p-2.5 rounded-lg border border-stone-100">
                    {clinicalNotes[0].plan_text || clinicalNotes[0].assessment_text || 'Clinical note documented.'}
                  </p>
                ) : (
                  <p className="text-xs text-stone-400 py-2">No records documented.</p>
                )}

                <Link
                  to={`/doctor/consultations/${consultation.id}`}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-stone-900 text-white font-medium hover:bg-stone-800 transition-colors shadow-2xs text-xs"
                >
                  <span>Open Consultation Workspace</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Active Medications & Diagnostic Panels */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Medications */}
            <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                <span className="text-xs font-semibold text-stone-900 flex items-center gap-1.5">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-stone-500" />
                  Offered Medications ({prescriptionItems.length})
                </span>
                <Link to={`/doctor/consultations/${consultation.id}`} className="text-2xs text-stone-500 hover:text-stone-900 font-medium">
                  Workspace
                </Link>
              </div>

              {prescriptionItems.length === 0 ? (
                <p className="text-xs text-stone-400 py-3">No active prescriptions documented.</p>
              ) : (
                <div className="divide-y divide-stone-100">
                  {prescriptionItems.map((med: any) => (
                    <div key={med.id} className="py-2.5 flex items-start justify-between gap-3 text-xs">
                      <div>
                        <span className="font-semibold text-stone-900">{med.medication_name} {med.strength}</span>
                        <p className="text-2xs text-stone-500 mt-0.5">{med.instructions || med.dosage_instructions}</p>
                        <span className="text-3xs text-stone-400">Form: {med.dosage_form || 'N/A'}</span>
                      </div>
                      <span className="font-mono font-semibold text-stone-800">
                        {med.unit_price ? `₹${med.unit_price}` : '₹0'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Diagnostic Panels */}
            <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                <span className="text-xs font-semibold text-stone-900 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-stone-500" />
                  Diagnostic Reports & Panels
                </span>
                <span className="text-3xs text-stone-400">Electronic Feed</span>
              </div>

              <p className="text-xs text-stone-400 py-3">No records documented.</p>
            </div>
          </div>
        </div>
      )}

      {/* Consultations Tab */}
      {activeTab === 'consultations' && (
        <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <h3 className="text-sm font-semibold text-stone-900">Consultation Records</h3>
            <span className="text-xs text-stone-500">Telehealth Intakes</span>
          </div>

          <div className="p-4 border border-stone-200 rounded-xl bg-stone-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-stone-900 text-sm">
                  {consultation.primary_concern || 'Telehealth Consultation'}
                </span>
                <StatusBadge status={consultation.status} />
              </div>
              <p className="text-2xs text-stone-400">
                Submitted: {consultation.submitted_at?.slice(0, 10) || consultation.created_at?.slice(0, 10)}
              </p>
            </div>

            <Link
              to={`/doctor/consultations/${consultation.id}`}
              className="px-4 py-2 rounded-lg bg-stone-900 text-white text-xs font-semibold hover:bg-stone-800 transition-colors shrink-0 text-center"
            >
              Open Review Workspace &rarr;
            </Link>
          </div>
        </div>
      )}

      {/* Medications Tab */}
      {activeTab === 'medications' && (
        <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <h3 className="text-sm font-semibold text-stone-900">Prescription Ledger</h3>
            <Link
              to={`/doctor/consultations/${consultation.id}`}
              className="px-3 py-1 rounded-lg bg-stone-900 text-white text-xs font-medium"
            >
              Manage in Workspace
            </Link>
          </div>

          {prescriptionItems.length === 0 ? (
            <p className="text-xs text-stone-500 py-4 text-center">No records documented.</p>
          ) : (
            <div className="divide-y divide-stone-100">
              {prescriptionItems.map((med: any) => (
                <div key={med.id} className="py-3.5 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-stone-900">{med.medication_name} {med.strength}</span>
                    <span className="font-mono text-stone-700">{med.unit_price ? `₹${med.unit_price}` : ''}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-stone-50 text-2xs text-stone-600">
                    <p>Form: {med.dosage_form || 'N/A'}</p>
                    <p>Instructions: {med.instructions || med.dosage_instructions || 'Take as directed'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Labs Tab */}
      {activeTab === 'labs' && (
        <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <h3 className="text-sm font-semibold text-stone-900">Diagnostic Reports & Panels</h3>
          </div>
          <p className="text-xs text-stone-500 py-4 text-center">No records documented.</p>
        </div>
      )}

      {/* Messages Tab */}
      {activeTab === 'messages' && (
        <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <h3 className="text-sm font-semibold text-stone-900">
              Direct Clinical Messages with {patient.name}
            </h3>
            <span className="text-2xs text-emerald-700 font-medium">HIPAA Encrypted Channel</span>
          </div>

          {canonicalMessages.length === 0 ? (
            <p className="text-xs text-stone-500 py-4 text-center">No clinical conversation yet.</p>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto p-2">
              {canonicalMessages.map((msg) => {
                const isDoctor = msg.sender_role === 'doctor' || msg.sender_role === 'admin';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      isDoctor ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div
                      className={`max-w-md p-3 rounded-xl text-xs ${
                        isDoctor
                          ? 'bg-stone-900 text-white'
                          : 'bg-stone-100 text-stone-900'
                      }`}
                    >
                      <p>{msg.body || msg.text}</p>
                    </div>
                    <span className="text-3xs text-stone-400 mt-1">
                      {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          <form onSubmit={handleSendMessage} className="flex gap-2 pt-2 border-t border-stone-100">
            <input
              type="text"
              value={newReplyText}
              onChange={(e) => setNewReplyText(e.target.value)}
              placeholder={`Send a clinical message to ${patient.name}...`}
              className="flex-1 px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs focus:bg-white focus:outline-hidden font-sans"
            />
            <button
              type="submit"
              disabled={isSendingMsg}
              className="px-4 py-2 bg-stone-900 text-white rounded-lg text-xs font-semibold hover:bg-stone-800 transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSendingMsg ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>Send</span>
            </button>
          </form>
        </div>
      )}

      {/* Timeline Tab */}
      {activeTab === 'timeline' && (
        <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-2xs space-y-4">
          <h3 className="text-sm font-semibold text-stone-900 border-b border-stone-100 pb-3">
            Patient Activity & Care Timeline
          </h3>

          <div className="relative pl-6 space-y-6 border-l border-stone-200 ml-2 text-xs">
            <div className="relative space-y-1">
              <span className="absolute -left-[31px] top-0.5 w-3 h-3 rounded-full bg-stone-900 border-2 border-white ring-1 ring-stone-300" />
              <div className="flex items-center justify-between">
                <span className="font-semibold text-stone-900">Intake Form Submitted</span>
                <span className="text-3xs text-stone-400 font-mono">
                  {consultation.submitted_at?.slice(0, 10) || consultation.created_at?.slice(0, 10)}
                </span>
              </div>
              <p className="text-stone-600 text-2xs">Patient submitted questionnaire for {consultation.primary_concern}.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  getPatientById,
  MOCK_CONSULTATIONS,
  MOCK_PATIENTS,
  Patient,
  PatientMedication,
  PatientLabRecord,
} from '../../data/doctorMockData';
import { PatientHeader } from '../../components/doctor/common/PatientHeader';
import { StatusBadge } from '../../components/doctor/common/StatusBadge';
import { PriorityIndicator } from '../../components/doctor/common/PriorityIndicator';
import {
  Activity,
  FileSpreadsheet,
  FileText,
  MessageSquare,
  Clock,
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Send,
  Plus,
  ShieldCheck,
  TrendingDown,
  Stethoscope,
  Info,
} from 'lucide-react';

export default function DoctorPatientChart() {
  const { id } = useParams<{ id: string }>();
  const patient = getPatientById(id || 'pt-9412') || MOCK_PATIENTS[0];

  const [activeTab, setActiveTab] = useState<
    'overview' | 'consultations' | 'medications' | 'labs' | 'messages' | 'timeline'
  >('overview');

  const [newReplyText, setNewReplyText] = useState('');
  const [patientMessages, setPatientMessages] = useState([
    {
      id: 'msg-local-1',
      sender: 'patient',
      text: 'Hello Dr. Mitchell, I completed my intake form earlier today.',
      timestamp: '2 hours ago',
    },
    {
      id: 'msg-local-2',
      sender: 'doctor',
      text: 'Thank you for submitting your baseline vitals. I am currently reviewing your chart and lab records.',
      timestamp: '1 hour ago',
    },
  ]);

  // Find any active consultation for this patient
  const activeConsultation = MOCK_CONSULTATIONS.find((c) => c.patientId === patient.id);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReplyText.trim()) return;
    setPatientMessages((prev) => [
      ...prev,
      {
        id: `msg-local-${Date.now()}`,
        sender: 'doctor',
        text: newReplyText.trim(),
        timestamp: 'Just now',
      },
    ]);
    setNewReplyText('');
  };

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
          Chart MRN: {patient.mrn} • Last modified: Today
        </span>
      </div>

      {/* 1. Persistent Clinical Patient Header */}
      <PatientHeader
        patient={patient}
        activeConsultationId={activeConsultation?.id}
      />

      {/* 2. Navigation Tabs */}
      <div className="border-b border-stone-200">
        <nav className="flex space-x-1 sm:space-x-4 overflow-x-auto text-xs font-medium">
          {[
            { id: 'overview', label: 'Overview', icon: Activity },
            { id: 'consultations', label: 'Consultations', icon: FileText, count: activeConsultation ? 1 : 0 },
            { id: 'medications', label: 'Medications', icon: FileSpreadsheet, count: patient.medications.length },
            { id: 'labs', label: 'Labs & Documents', icon: FileText, count: patient.labs.length },
            { id: 'messages', label: 'Messages', icon: MessageSquare, count: 2 },
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
            {/* Recent Vitals */}
            <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                <span className="text-xs font-semibold text-stone-900 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-stone-500" />
                  Telemetry & Vitals
                </span>
                <span className="text-3xs text-stone-400">Latest: {patient.vitalsHistory[0]?.date || 'Recent'}</span>
              </div>

              {patient.vitalsHistory.length > 0 ? (
                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between p-2 bg-stone-50 rounded-lg">
                    <span className="text-stone-500 text-2xs uppercase">Body Mass Index (BMI)</span>
                    <span className="font-bold text-stone-900 font-mono text-sm">
                      {patient.vitalsHistory[0].bmi}{' '}
                      <span className="text-2xs font-normal text-stone-500">kg/m²</span>
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 bg-stone-50 rounded-lg">
                    <span className="text-stone-500 text-2xs uppercase">Blood Pressure</span>
                    <span className="font-bold text-stone-900 font-mono text-sm">
                      {patient.vitalsHistory[0].bloodPressure}{' '}
                      <span className="text-2xs font-normal text-stone-500">mmHg</span>
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 bg-stone-50 rounded-lg">
                    <span className="text-stone-500 text-2xs uppercase">Weight</span>
                    <span className="font-bold text-stone-900 font-mono text-sm">
                      {patient.vitalsHistory[0].weightLbs}{' '}
                      <span className="text-2xs font-normal text-stone-500">lbs</span>
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-stone-400">No vitals logged.</p>
              )}
            </div>

            {/* Medical History */}
            <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                <span className="text-xs font-semibold text-stone-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-stone-500" />
                  Medical History
                </span>
                <span className="text-3xs text-stone-400 font-mono">{patient.medicalHistory.length} Conditions</span>
              </div>

              <ul className="space-y-2 text-xs text-stone-700">
                {patient.medicalHistory.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 p-1.5 bg-stone-50/70 rounded">
                    <span className="text-stone-400 font-bold">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Current Care Plan */}
            <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                <span className="text-xs font-semibold text-stone-900 flex items-center gap-1.5">
                  <Stethoscope className="w-3.5 h-3.5 text-stone-500" />
                  Current Treatment Regimen
                </span>
                <StatusBadge status={patient.careStatus} size="sm" />
              </div>

              <div className="space-y-2 text-xs">
                <p className="text-stone-700 leading-relaxed bg-stone-50 p-2.5 rounded-lg border border-stone-100">
                  {patient.notes[0]?.text ||
                    'Patient evaluation in progress. Review intake questionnaire to formulate active clinical care plan.'}
                </p>

                {activeConsultation && (
                  <Link
                    to={`/doctor/consultations/${activeConsultation.id}`}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-stone-900 text-white font-medium hover:bg-stone-800 transition-colors shadow-2xs text-xs"
                  >
                    <span>Open Pending Consultation</span>
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Active Medications & Recent Labs Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Medications */}
            <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                <span className="text-xs font-semibold text-stone-900 flex items-center gap-1.5">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-stone-500" />
                  Active Medications ({patient.medications.length})
                </span>
                <Link to="/doctor/prescriptions" className="text-2xs text-stone-500 hover:text-stone-900 font-medium">
                  + New Prescription
                </Link>
              </div>

              {patient.medications.length === 0 ? (
                <p className="text-xs text-stone-400 py-3">No active prescriptions on file.</p>
              ) : (
                <div className="divide-y divide-stone-100">
                  {patient.medications.map((med) => (
                    <div key={med.id} className="py-2.5 flex items-start justify-between gap-3 text-xs">
                      <div>
                        <span className="font-semibold text-stone-900">{med.name} {med.dosage}</span>
                        <p className="text-2xs text-stone-500 mt-0.5">{med.instructions}</p>
                        <span className="text-3xs text-stone-400">Prescribed by {med.prescribingDoctor}</span>
                      </div>
                      <StatusBadge status={med.status} size="sm" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Labs */}
            <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                <span className="text-xs font-semibold text-stone-900 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-stone-500" />
                  Recent Diagnostic Panels ({patient.labs.length})
                </span>
                <span className="text-3xs text-stone-400">Electronic Lab Interface</span>
              </div>

              {patient.labs.length === 0 ? (
                <p className="text-xs text-stone-400 py-3">No diagnostic labs uploaded.</p>
              ) : (
                <div className="divide-y divide-stone-100">
                  {patient.labs.map((lab) => (
                    <div key={lab.id} className="py-2.5 space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-stone-900">{lab.title}</span>
                        <span className="text-3xs text-stone-400">{lab.date}</span>
                      </div>
                      <p className="text-2xs text-stone-600 bg-stone-50 p-2 rounded border border-stone-100 font-mono">
                        {lab.resultSummary}
                      </p>
                    </div>
                  ))}
                </div>
              )}
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

          {activeConsultation ? (
            <div className="p-4 border border-stone-200 rounded-xl bg-stone-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-stone-900 text-sm">
                    {activeConsultation.requestedMedication}
                  </span>
                  <StatusBadge status={activeConsultation.status} />
                  <PriorityIndicator priority={activeConsultation.triagePriority} />
                </div>
                <p className="text-xs text-stone-600">{activeConsultation.reasonForReview}</p>
                <p className="text-2xs text-stone-400">Submitted: {activeConsultation.submittedAt}</p>
              </div>

              <Link
                to={`/doctor/consultations/${activeConsultation.id}`}
                className="px-4 py-2 rounded-lg bg-stone-900 text-white text-xs font-semibold hover:bg-stone-800 transition-colors shrink-0 text-center"
              >
                Open Review Workspace &rarr;
              </Link>
            </div>
          ) : (
            <p className="text-xs text-stone-500 py-4 text-center">No active consultations pending review.</p>
          )}
        </div>
      )}

      {/* Medications Tab */}
      {activeTab === 'medications' && (
        <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <h3 className="text-sm font-semibold text-stone-900">Prescription Ledger</h3>
            <Link
              to="/doctor/prescriptions"
              className="px-3 py-1 rounded-lg bg-stone-900 text-white text-xs font-medium"
            >
              + Create Prescription
            </Link>
          </div>

          <div className="divide-y divide-stone-100">
            {patient.medications.map((med) => (
              <div key={med.id} className="py-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-stone-900">{med.name} {med.dosage}</span>
                  <StatusBadge status={med.status} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-2xs text-stone-500 bg-stone-50 p-2.5 rounded-lg">
                  <div>
                    <span className="block font-semibold text-stone-700">Frequency:</span>
                    <span>{med.frequency}</span>
                  </div>
                  <div>
                    <span className="block font-semibold text-stone-700">Refills Left:</span>
                    <span>{med.refillsLeft}</span>
                  </div>
                  <div>
                    <span className="block font-semibold text-stone-700">Pharmacy:</span>
                    <span>{med.pharmacy}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Labs Tab */}
      {activeTab === 'labs' && (
        <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <h3 className="text-sm font-semibold text-stone-900">Diagnostic Reports & Panels</h3>
            <span className="text-2xs text-stone-500 font-mono">Integrated HL7/FHIR Feed</span>
          </div>

          <div className="space-y-3">
            {patient.labs.map((lab) => (
              <div key={lab.id} className="p-4 border border-stone-200 rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-stone-900 text-sm">{lab.title}</span>
                  <span className="text-2xs text-stone-400">{lab.date}</span>
                </div>
                <p className="text-stone-700 font-mono text-2xs bg-stone-50 p-3 rounded-lg border border-stone-100">
                  {lab.resultSummary}
                </p>
                <div className="text-3xs text-stone-400 flex items-center justify-between">
                  <span>Facility: {lab.labFacility}</span>
                  <span>Ordering: {lab.orderingProvider}</span>
                </div>
              </div>
            ))}
          </div>
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

          <div className="space-y-3 max-h-80 overflow-y-auto p-2">
            {patientMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.sender === 'doctor' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-md p-3 rounded-xl text-xs ${
                    msg.sender === 'doctor'
                      ? 'bg-stone-900 text-white'
                      : 'bg-stone-100 text-stone-900'
                  }`}
                >
                  <p>{msg.text}</p>
                </div>
                <span className="text-3xs text-stone-400 mt-1">{msg.timestamp}</span>
              </div>
            ))}
          </div>

          <form onSubmit={handleSendMessage} className="flex gap-2 pt-2 border-t border-stone-100">
            <input
              type="text"
              value={newReplyText}
              onChange={(e) => setNewReplyText(e.target.value)}
              placeholder={`Send a clinical message or care advisory to ${patient.name}...`}
              className="flex-1 px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs focus:bg-white focus:outline-hidden font-sans"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-stone-900 text-white rounded-lg text-xs font-semibold hover:bg-stone-800 transition-colors flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
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
            {patient.timeline.map((evt) => (
              <div key={evt.id} className="relative space-y-1">
                <span className="absolute -left-[31px] top-0.5 w-3 h-3 rounded-full bg-stone-900 border-2 border-white ring-1 ring-stone-300" />
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-stone-900">{evt.title}</span>
                  <span className="text-3xs text-stone-400 font-mono">{evt.date}</span>
                </div>
                <p className="text-stone-600 text-2xs">{evt.description}</p>
                <span className="text-3xs text-stone-400">Logged by: {evt.author}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

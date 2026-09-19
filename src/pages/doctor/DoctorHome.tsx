import React from 'react';
import { Link } from 'react-router-dom';
import { useDoctorAuth } from '../../context/DoctorAuthContext';
import {
  MOCK_CONSULTATIONS,
  MOCK_FOLLOW_UPS,
  MOCK_MESSAGE_THREADS,
  MOCK_PATIENTS,
} from '../../data/doctorMockData';
import { StatusBadge } from '../../components/doctor/common/StatusBadge';
import { PriorityIndicator } from '../../components/doctor/common/PriorityIndicator';
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
} from 'lucide-react';

export default function DoctorHome() {
  const { doctor } = useDoctorAuth();

  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const pendingConsultations = MOCK_CONSULTATIONS.filter(
    (c) => c.status === 'pending_review' || c.status === 'in_review'
  );
  const urgentItems = pendingConsultations.filter((c) => c.triagePriority === 'urgent');
  const dueFollowUps = MOCK_FOLLOW_UPS.filter((f) => f.dueStatus === 'today' || f.dueStatus === 'overdue');
  const unreadMessages = MOCK_MESSAGE_THREADS.filter((t) => t.unread);

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
            Good morning, {doctor?.name || 'Dr. Mitchell'}
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            {doctor?.specialty} • {doctor?.assignedJurisdiction.join(', ')} Jurisdictions
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
            Patients In Directory
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold text-stone-900 font-sans">
              {MOCK_PATIENTS.length}
            </span>
            <span className="text-3xs text-stone-500">Under care</span>
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
          <span className="text-3xs uppercase tracking-wider text-purple-700 font-semibold block">
            Follow-ups Due
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold text-purple-900 font-sans">
              {dueFollowUps.length}
            </span>
            <span className="text-3xs text-purple-700">Due today</span>
          </div>
        </div>

        <div className="p-3.5 bg-white border border-stone-200 rounded-xl shadow-2xs">
          <span className="text-3xs uppercase tracking-wider text-stone-500 font-semibold block">
            Unread Inquiries
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold text-stone-900 font-sans">
              {unreadMessages.length}
            </span>
            <span className="text-3xs text-stone-500">Require reply</span>
          </div>
        </div>
      </div>

      {/* 3. Section: Urgent Attention Required (Clinical Priority) */}
      {urgentItems.length > 0 && (
        <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-700" />
              <h2 className="text-xs sm:text-sm font-semibold text-rose-900 uppercase tracking-wide">
                Urgent Clinical Attention ({urgentItems.length})
              </h2>
            </div>
            <span className="text-2xs text-rose-700 font-medium">Physician Clearance Priority</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {urgentItems.map((item) => (
              <div
                key={item.id}
                className="bg-white border border-rose-200/80 rounded-lg p-3.5 flex flex-col justify-between gap-3 shadow-2xs"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-semibold text-stone-900 text-sm">{item.patientName}</span>
                      <span className="text-2xs font-mono text-stone-500 ml-2">{item.mrn}</span>
                    </div>
                    <PriorityIndicator priority={item.triagePriority} />
                  </div>
                  <p className="text-xs text-rose-950 font-medium mt-1">{item.reasonForReview}</p>
                  <p className="text-2xs text-stone-500 mt-0.5">
                    Requested: {item.requestedMedication} • Submitted {item.waitTimeFormatted}
                  </p>
                </div>

                <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                  <span className="text-3xs text-stone-400">Jurisdiction: {item.patientState}</span>
                  <Link
                    to={`/doctor/consultations/${item.id}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 hover:text-rose-900"
                  >
                    <span>Review Intake</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Two-Column Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Main Work Queue (Actionable) */}
        <div className="lg:col-span-2 space-y-4">
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

          <div className="bg-white border border-stone-200 rounded-xl divide-y divide-stone-100 shadow-2xs overflow-hidden">
            {pendingConsultations.map((consultation) => (
              <div
                key={consultation.id}
                className="p-4 hover:bg-stone-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/doctor/patients/${consultation.patientId}`}
                      className="font-semibold text-stone-900 hover:text-emerald-800 text-sm"
                    >
                      {consultation.patientName}
                    </Link>
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
        </div>

        {/* Right 1 Col: Follow-ups & Unread Messages */}
        <div className="space-y-6">
          {/* Follow-ups Due */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-700" />
                <h3 className="text-sm font-semibold text-stone-900">Follow-ups Due Today</h3>
              </div>
              <Link
                to="/doctor/follow-ups"
                className="text-2xs font-medium text-stone-500 hover:text-stone-900"
              >
                View all ({dueFollowUps.length})
              </Link>
            </div>

            <div className="bg-white border border-stone-200 rounded-xl divide-y divide-stone-100 shadow-2xs overflow-hidden">
              {dueFollowUps.map((task) => (
                <div key={task.id} className="p-3.5 space-y-1.5 hover:bg-stone-50 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      to={`/doctor/patients/${task.patientId}`}
                      className="text-xs font-semibold text-stone-900 hover:text-emerald-800"
                    >
                      {task.patientName}
                    </Link>
                    <StatusBadge status={task.dueStatus} size="sm" />
                  </div>
                  <p className="text-2xs text-stone-600 line-clamp-2">{task.reason}</p>
                  <div className="pt-1 flex items-center justify-between text-3xs text-stone-400">
                    <span>{task.category}</span>
                    <Link
                      to={`/doctor/patients/${task.patientId}`}
                      className="font-medium text-stone-700 hover:text-stone-900"
                    >
                      {task.nextAction} &rarr;
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Unread Patient Messages */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-stone-700" />
                <h3 className="text-sm font-semibold text-stone-900">Patient Messages</h3>
              </div>
              <Link
                to="/doctor/messages"
                className="text-2xs font-medium text-stone-500 hover:text-stone-900"
              >
                Open Inbox
              </Link>
            </div>

            <div className="bg-white border border-stone-200 rounded-xl divide-y divide-stone-100 shadow-2xs overflow-hidden">
              {unreadMessages.slice(0, 2).map((thread) => (
                <Link
                  key={thread.id}
                  to="/doctor/messages"
                  className="block p-3.5 hover:bg-stone-50 transition-colors space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-stone-900">
                      {thread.patientName}
                    </span>
                    <span className="text-3xs text-stone-400">{thread.lastMessageTime}</span>
                  </div>
                  <p className="text-2xs font-medium text-stone-800">{thread.subject}</p>
                  <p className="text-2xs text-stone-500 line-clamp-1">{thread.lastMessageSnippet}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

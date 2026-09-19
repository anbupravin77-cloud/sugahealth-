import React from 'react';
import { Link } from 'react-router-dom';
import { StatusBadge } from './StatusBadge';
import {
  AlertTriangle,
  FileEdit,
  MessageSquare,
  FileSpreadsheet,
  Activity,
  MapPin,
  Calendar,
  Phone,
  Mail,
  User,
  ShieldAlert,
} from 'lucide-react';

export interface Patient {
  id: string;
  mrn: string;
  name: string;
  age: number | string;
  gender: string;
  dob: string;
  state: string;
  city: string;
  phone: string;
  email: string;
  allergies: string[];
  primaryConcern: string;
  careCategory: string;
  careStatus: string;
}

interface PatientHeaderProps {
  patient: Patient;
  activeConsultationId?: string;
}

export const PatientHeader: React.FC<PatientHeaderProps> = ({ patient, activeConsultationId }) => {
  const hasSevereAllergies = patient.allergies.some(
    (a) => !a.toLowerCase().includes('nkda') && !a.toLowerCase().includes('none')
  );

  return (
    <div className="bg-white border border-stone-200 rounded-xl p-4 sm:p-6 shadow-xs space-y-4">
      {/* Top row: Identity, Demographics, and Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-700 font-semibold text-base flex-shrink-0">
            {patient.name
              .split(' ')
              .map((n) => n[0])
              .join('')}
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-semibold text-stone-900 tracking-tight font-sans">
                {patient.name}
              </h1>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-stone-100 text-stone-600 border border-stone-200">
                {patient.mrn}
              </span>
              <StatusBadge status={patient.careStatus} />
            </div>

            <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-stone-500">
              <span className="flex items-center gap-1 font-medium text-stone-700">
                <User className="w-3.5 h-3.5 text-stone-400" />
                {patient.age} y/o {patient.gender}
              </span>
              <span className="text-stone-300">•</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-stone-400" />
                DOB: {patient.dob}
              </span>
              <span className="text-stone-300">•</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-stone-400" />
                {patient.city}, {patient.state}
              </span>
              <span className="text-stone-300">•</span>
              <span className="flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-stone-400" />
                {patient.phone}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-stone-100">
          {activeConsultationId && (
            <Link
              to={`/doctor/consultations/${activeConsultationId}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-stone-900 text-white text-xs font-medium hover:bg-stone-800 transition-colors shadow-xs"
            >
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>Resume Review</span>
            </Link>
          )}

          <Link
            to="/doctor/messages"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 bg-white text-stone-700 text-xs font-medium hover:bg-stone-50 transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5 text-stone-500" />
            <span>Message</span>
          </Link>

          <Link
            to="/doctor/prescriptions"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 bg-white text-stone-700 text-xs font-medium hover:bg-stone-50 transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-stone-500" />
            <span>Prescribe</span>
          </Link>
        </div>
      </div>

      {/* Second row: Primary concern and Allergies */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-stone-100 text-xs">
        {/* Primary Concern */}
        <div className="flex items-start gap-2 bg-stone-50/80 p-2.5 rounded-lg border border-stone-200/80">
          <Activity className="w-4 h-4 text-stone-500 mt-0.5 flex-shrink-0" />
          <div>
            <span className="font-semibold text-stone-800 block text-2xs uppercase tracking-wider text-stone-500">
              Primary Clinical Focus
            </span>
            <span className="text-stone-800 font-medium">{patient.primaryConcern}</span>
            <span className="text-stone-500 block text-2xs mt-0.5">{patient.careCategory}</span>
          </div>
        </div>

        {/* Allergies Indicator */}
        <div
          className={`flex items-start gap-2 p-2.5 rounded-lg border ${
            hasSevereAllergies
              ? 'bg-rose-50/60 border-rose-200 text-rose-900'
              : 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
          }`}
        >
          {hasSevereAllergies ? (
            <ShieldAlert className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
          )}
          <div>
            <span className="font-semibold block text-2xs uppercase tracking-wider opacity-80">
              Drug & Environmental Allergies
            </span>
            <span className="font-medium">
              {patient.allergies.length > 0 ? patient.allergies.join(', ') : 'No Known Drug Allergies (NKDA)'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

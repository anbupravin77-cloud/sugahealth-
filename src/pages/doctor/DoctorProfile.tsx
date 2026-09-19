import React from 'react';
import { useDoctorAuth } from '../../context/DoctorAuthContext';
import { SectionHeader } from '../../components/doctor/common/SectionHeader';
import {
  UserCheck,
  Award,
  ShieldCheck,
  MapPin,
  Mail,
  Phone,
  Clock,
  Building,
  FileCheck2,
  Stethoscope,
} from 'lucide-react';

export default function DoctorProfile() {
  const { doctor } = useDoctorAuth();

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-150">
      {/* 1. Header */}
      <SectionHeader
        tagline="Provider Credentialing"
        title="Physician Profile"
        subtitle="Active medical licensure, DEA registrations, and telehealth credentialing ledger."
      />

      {/* 2. Provider Identity Card */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 shadow-2xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-stone-100 pb-6">
          <div className="flex items-center gap-4">
            <img
              src={doctor?.avatarUrl || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=256'}
              alt={doctor?.name}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-stone-200 shadow-xs"
            />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-bold text-stone-900 font-sans tracking-tight">
                  {doctor?.name || 'Dr. Sarah Mitchell'}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-2xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {doctor?.credentials || 'MD, FACP'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-stone-600 font-medium">{doctor?.title}</p>
              <p className="text-xs text-stone-400">{doctor?.affiliation}</p>
            </div>
          </div>

          <div className="px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold self-start sm:self-auto flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
            <span>Active Telehealth License</span>
          </div>
        </div>

        {/* Bio */}
        <div className="space-y-1.5 text-xs text-stone-700">
          <span className="font-semibold uppercase text-3xs text-stone-400 tracking-wider">
            Clinical Biography & Focus
          </span>
          <p className="leading-relaxed bg-stone-50 p-3.5 rounded-xl border border-stone-100">
            {doctor?.bio}
          </p>
        </div>

        {/* Credentialing & Registry Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
          <div className="p-4 bg-stone-50 rounded-xl border border-stone-200/80 space-y-1">
            <div className="flex items-center justify-between text-stone-500 text-2xs">
              <span className="font-semibold uppercase tracking-wider">Primary Medical License</span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
            </div>
            <p className="text-stone-900 font-mono font-bold text-sm">{doctor?.licenseNumber}</p>
            <p className="text-3xs text-stone-400">California Medical Board (Active / Good Standing)</p>
          </div>

          <div className="p-4 bg-stone-50 rounded-xl border border-stone-200/80 space-y-1">
            <div className="flex items-center justify-between text-stone-500 text-2xs">
              <span className="font-semibold uppercase tracking-wider">National Provider Identifier (NPI)</span>
              <FileCheck2 className="w-3.5 h-3.5 text-stone-500" />
            </div>
            <p className="text-stone-900 font-mono font-bold text-sm">{doctor?.npiNumber}</p>
            <p className="text-3xs text-stone-400">NPPES Enumerator Registered</p>
          </div>

          <div className="p-4 bg-stone-50 rounded-xl border border-stone-200/80 space-y-1">
            <div className="flex items-center justify-between text-stone-500 text-2xs">
              <span className="font-semibold uppercase tracking-wider">DEA Registration</span>
              <ShieldCheck className="w-3.5 h-3.5 text-stone-500" />
            </div>
            <p className="text-stone-900 font-mono font-bold text-sm">{doctor?.deaNumber}</p>
            <p className="text-3xs text-stone-400">Schedule II - V Electronic Prescribing Authority</p>
          </div>

          <div className="p-4 bg-stone-50 rounded-xl border border-stone-200/80 space-y-1">
            <div className="flex items-center justify-between text-stone-500 text-2xs">
              <span className="font-semibold uppercase tracking-wider">Authorized Telehealth States</span>
              <MapPin className="w-3.5 h-3.5 text-emerald-700" />
            </div>
            <p className="text-emerald-800 font-bold text-sm">
              {doctor?.assignedJurisdiction.join(', ')}
            </p>
            <p className="text-3xs text-stone-400">Interstate Medical Licensure Compact (IMLC)</p>
          </div>
        </div>

        {/* Contact & Availability */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-stone-100 text-xs">
          <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl">
            <Mail className="w-4 h-4 text-stone-400" />
            <div>
              <span className="text-3xs uppercase font-semibold text-stone-400 block">Clinical Email</span>
              <span className="font-medium text-stone-800">{doctor?.email}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl">
            <Clock className="w-4 h-4 text-stone-400" />
            <div>
              <span className="text-3xs uppercase font-semibold text-stone-400 block">Telehealth Hours</span>
              <span className="font-medium text-stone-800">{doctor?.availabilityHours}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

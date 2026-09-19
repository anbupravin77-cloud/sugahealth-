import React, { useState } from 'react';
import { SectionHeader } from '../../components/doctor/common/SectionHeader';
import {
  Settings,
  Bell,
  Lock,
  Clock,
  Sliders,
  CheckCircle2,
  ShieldCheck,
  Save,
} from 'lucide-react';

export default function DoctorSettings() {
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [soundAlerts, setSoundAlerts] = useState(true);
  const [urgentTriagePush, setUrgentTriagePush] = useState(true);
  const [inactivityTimeout, setInactivityTimeout] = useState('30');
  const [defaultCategory, setDefaultCategory] = useState('all');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-150">
      {/* 1. Header */}
      <SectionHeader
        tagline="System Preferences"
        title="Clinical Settings"
        subtitle="Manage clinical duty schedules, electronic prescribing authentication, and notification rules."
      />

      {savedSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-950 text-emerald-100 border border-emerald-800 flex items-center gap-2 text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Clinical workspace preferences saved successfully.</span>
        </div>
      )}

      {/* 2. Settings Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* Availability & Shift */}
        <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
            <Clock className="w-4 h-4 text-stone-600" />
            <h3 className="text-sm font-semibold text-stone-900">
              Telehealth Availability & Delegation
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="text-2xs font-semibold text-stone-600 uppercase block mb-1">
                Default Telehealth Queue View
              </label>
              <select
                value={defaultCategory}
                onChange={(e) => setDefaultCategory(e.target.value)}
                className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-xs"
              >
                <option value="all">All Specialties</option>
                <option value="glp1">GLP-1 Weight Management Only</option>
                <option value="hair">Hair Regrowth Only</option>
                <option value="mens">Men's Sexual Wellness Only</option>
              </select>
            </div>

            <div>
              <label className="text-2xs font-semibold text-stone-600 uppercase block mb-1">
                Automated Coverage Delegation
              </label>
              <select className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-xs">
                <option>None (Active Direct Coverage)</option>
                <option>Dr. Kenneth Cole, MD (Cross-Coverage)</option>
                <option>Dr. Lisa Wong, MD (Endocrinology Backup)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Clinical Notifications */}
        <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
            <Bell className="w-4 h-4 text-stone-600" />
            <h3 className="text-sm font-semibold text-stone-900">
              Clinical Alerts & Notifications
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <label className="flex items-center justify-between p-3 bg-stone-50 rounded-lg cursor-pointer">
              <div>
                <span className="font-semibold text-stone-900 block">
                  High-Priority Triage Alerts
                </span>
                <span className="text-2xs text-stone-500">
                  Notify immediately when a patient intake presents with high-risk telemetry.
                </span>
              </div>
              <input
                type="checkbox"
                checked={urgentTriagePush}
                onChange={(e) => setUrgentTriagePush(e.target.checked)}
                className="rounded text-stone-900 focus:ring-stone-900"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-stone-50 rounded-lg cursor-pointer">
              <div>
                <span className="font-semibold text-stone-900 block">
                  Audible Queue Notification Chime
                </span>
                <span className="text-2xs text-stone-500">
                  Play gentle tone when a new consultation enters your state jurisdiction queue.
                </span>
              </div>
              <input
                type="checkbox"
                checked={soundAlerts}
                onChange={(e) => setSoundAlerts(e.target.checked)}
                className="rounded text-stone-900 focus:ring-stone-900"
              />
            </label>
          </div>
        </div>

        {/* EPCS & Security */}
        <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
            <Lock className="w-4 h-4 text-stone-600" />
            <h3 className="text-sm font-semibold text-stone-900">
              EPCS Security & Session Timeout
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="text-2xs font-semibold text-stone-600 uppercase block mb-1">
                Inactivity Lock Timeout
              </label>
              <select
                value={inactivityTimeout}
                onChange={(e) => setInactivityTimeout(e.target.value)}
                className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-xs"
              >
                <option value="15">15 Minutes (Strict HIPAA)</option>
                <option value="30">30 Minutes (Recommended)</option>
                <option value="60">60 Minutes</option>
              </select>
            </div>

            <div className="p-3 bg-stone-50 rounded-lg flex items-center justify-between">
              <div>
                <span className="font-semibold text-stone-900 block text-2xs">
                  EPCS Hardware Token
                </span>
                <span className="text-3xs text-emerald-700 font-mono">
                  YubiKey 5C NFC Verified
                </span>
              </div>
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Preferences</span>
          </button>
        </div>
      </form>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { SectionHeader } from '../../components/doctor/common/SectionHeader';
import { StatusBadge } from '../../components/doctor/common/StatusBadge';
import { PriorityIndicator } from '../../components/doctor/common/PriorityIndicator';
import { supabase } from '../../lib/supabase';
import {
  Search,
  Clock,
  ArrowRight,
  ShieldAlert,
  FileCheck,
  CheckCircle2,
  RefreshCw,
  Loader2,
} from 'lucide-react';

export default function DoctorWorkQueue() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedUrgency, setSelectedUrgency] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'priority' | 'waiting' | 'newest'>('priority');

  const [liveConsultations, setLiveConsultations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConsultations = async () => {
    setLoading(true);
    setError(null);
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
            setLiveConsultations(data.consultations);
          }
        } else {
          const errData = await res.json().catch(() => ({}));
          setError(errData.error || 'Failed to load consultation work queue');
        }
      }
    } catch (err: any) {
      console.warn('Live consultations fetch error:', err);
      setError(err.message || 'Failed to connect to clinical server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConsultations();

    // Listen for Realtime inserts/updates on consultations
    const channel = supabase
      .channel('doctor-queue-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'consultations' },
        () => {
          fetchConsultations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Map live consultations into UI format
  const mappedLive = liveConsultations.map((c) => {
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
      category: categoryName,
      requestedMedication: responses.requestedMedication || responses.medicationPreference || (c.primary_concern === 'weight' ? 'GLP-1 Weight Management' : 'Telehealth Intake'),
      reasonForReview: responses.conditions?.join(', ') || 'Asynchronous clinical evaluation',
      chiefComplaint: responses.medicalHistory || 'Patient initiated telehealth intake.',
      triagePriority: 'normal' as const,
      status: c.status,
      assignedTo: c.assigned_to,
      submittedAt: c.submitted_at || c.created_at,
      waitTimeFormatted: 'Recent',
      isLive: true,
    };
  });

  const filteredConsultations = mappedLive.filter((item) => {
    const matchesSearch =
      item.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.mrn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.requestedMedication.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.reasonForReview.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesUrgency = selectedUrgency === 'all' || item.triagePriority === selectedUrgency;
    const matchesStatus = selectedStatus === 'all' || item.status === selectedStatus;

    return matchesSearch && matchesCategory && matchesUrgency && matchesStatus;
  }).sort((a, b) => {
    if (sortBy === 'priority') {
      const priorityWeights = { urgent: 3, high: 2, normal: 1 };
      return (priorityWeights[b.triagePriority] || 1) - (priorityWeights[a.triagePriority] || 1);
    }
    if (sortBy === 'waiting') {
      return (a.submittedAt || '').localeCompare(b.submittedAt || '');
    }
    return (b.submittedAt || '').localeCompare(a.submittedAt || '');
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* 1. Header */}
      <SectionHeader
        tagline="Clinical Intake Operations"
        title="Work Queue"
        subtitle="Review, triage, and electronically authorize pending asynchronous telehealth intakes."
        badge={`${filteredConsultations.length} Active`}
        action={
          <button
            type="button"
            onClick={fetchConsultations}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-stone-200 rounded-lg text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        }
      />

      {/* 2. Operational Filters & Search Bar */}
      <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by patient name, MRN, medication, or clinical concern..."
              className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-900 placeholder-stone-400 focus:bg-white focus:outline-hidden focus:border-stone-400 font-sans"
            />
          </div>

          {/* Quick Category Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 text-xs">
            {[
              { label: 'All Categories', value: 'all' },
              { label: 'GLP-1 Weight', value: 'GLP-1 Weight Management' },
              { label: 'Hair Regrowth', value: 'Hair Regrowth' },
              { label: "Men's Health", value: "Men's Sexual Wellness" },
            ].map((cat) => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap text-xs font-medium transition-colors cursor-pointer ${
                  selectedCategory === cat.value
                    ? 'bg-stone-900 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Secondary filters & Sort */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-stone-100 text-xs text-stone-600">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-3xs uppercase tracking-wider text-stone-400 font-semibold">
                Urgency:
              </span>
              <select
                value={selectedUrgency}
                onChange={(e) => setSelectedUrgency(e.target.value)}
                className="bg-stone-50 border border-stone-200 rounded-md px-2 py-1 text-xs text-stone-800"
              >
                <option value="all">All Urgencies</option>
                <option value="urgent">Urgent Escalation</option>
                <option value="high">High Priority</option>
                <option value="normal">Standard Routine</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-3xs uppercase tracking-wider text-stone-400 font-semibold">
                Status:
              </span>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="bg-stone-50 border border-stone-200 rounded-md px-2 py-1 text-xs text-stone-800"
              >
                <option value="all">All Statuses</option>
                <option value="submitted">Pending Review</option>
                <option value="assigned">Assigned</option>
                <option value="under_review">In Review</option>
                <option value="completed">Completed / Signed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-3xs uppercase tracking-wider text-stone-400 font-semibold">
              Sort by:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-stone-50 border border-stone-200 rounded-md px-2 py-1 text-xs text-stone-800"
            >
              <option value="priority">Triage Urgency</option>
              <option value="waiting">Wait Time (Longest)</option>
              <option value="newest">Most Recent</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. Consultations Table */}
      <div className="bg-white border border-stone-200 rounded-xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-sans">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50/80 text-3xs font-semibold uppercase tracking-wider text-stone-500">
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Patient / Demographics</th>
                <th className="py-3 px-4">Category & Requested Protocol</th>
                <th className="py-3 px-4">Clinical Review Reason</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-xs text-stone-700">
              {filteredConsultations.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-stone-50/60 transition-colors group"
                >
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <PriorityIndicator priority={item.triagePriority} />
                  </td>

                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="font-semibold text-stone-900 group-hover:text-stone-950 flex items-center gap-1.5">
                      <span>{item.patientName}</span>
                      {item.isLive && (
                        <span className="text-3xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                          Live Intake
                        </span>
                      )}
                    </div>
                    <div className="text-3xs text-stone-400 font-mono mt-0.5">
                      {item.mrn} • {item.patientAge}y {item.patientGender}
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="font-medium text-stone-900">{item.category}</div>
                    <div className="text-3xs text-stone-500 mt-0.5 flex items-center gap-1">
                      <span>{item.requestedMedication}</span>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 max-w-xs">
                    <p className="text-xs text-stone-600 line-clamp-1 leading-relaxed">
                      {item.reasonForReview}
                    </p>
                  </td>

                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <StatusBadge status={item.status} />
                  </td>

                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <Link
                      to={`/doctor/consultations/${item.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium transition-colors shadow-2xs"
                    >
                      <span>Review</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}

              {filteredConsultations.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-stone-400">
                    <p className="text-xs">No pending consultations match the selected filters.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

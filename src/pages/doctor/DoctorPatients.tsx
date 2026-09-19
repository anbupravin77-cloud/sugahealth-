import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { SectionHeader } from '../../components/doctor/common/SectionHeader';
import { StatusBadge } from '../../components/doctor/common/StatusBadge';
import { supabase } from '../../lib/supabase';
import {
  Search,
  Users,
  ChevronRight,
  Filter,
  User,
  Calendar,
  Activity,
  Plus,
  ArrowRight,
  FileText,
  Loader2,
} from 'lucide-react';

export default function DoctorPatients() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPatients() {
      setLoading(true);
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
            const consults = data.consultations || [];
            
            // Map consultations to unique patients
            const patientMap = new Map<string, any>();
            consults.forEach((c: any) => {
              const pid = c.patient_id;
              const responses = c.responses || {};
              if (!patientMap.has(pid)) {
                patientMap.set(pid, {
                  id: pid,
                  name: responses.fullName || 'Patient',
                  mrn: `MRN-${c.id?.slice(0, 6).toUpperCase()}`,
                  email: c.email || 'N/A',
                  phone: responses.phone || 'N/A',
                  age: responses.age || 'N/A',
                  gender: responses.sex ? responses.sex.charAt(0).toUpperCase() + responses.sex.slice(1) : 'N/A',
                  city: responses.shippingAddress?.city || 'N/A',
                  state: responses.shippingAddress?.state || 'N/A',
                  primaryConcern: c.primary_concern === 'weight' ? 'GLP-1 Weight Management' : 'Telehealth Intake',
                  careCategory: c.primary_concern === 'weight' ? 'weight' : 'general',
                  careStatus: c.status === 'completed' ? 'active_care' : 'awaiting_review',
                  currentMedicationSummary: responses.currentMedication || responses.medicationPreference || 'N/A',
                  latestConsultationId: c.id,
                });
              }
            });
            setPatients(Array.from(patientMap.values()));
          }
        }
      } catch (err) {
        console.warn('Patients load error:', err);
      } finally {
        setLoading(false);
      }
    }
    loadPatients();
  }, []);

  const filteredPatients = patients.filter((patient) => {
    const matchesSearch =
      patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.mrn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.primaryConcern.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || patient.careStatus === statusFilter;
    const matchesCategory = categoryFilter === 'all' || patient.careCategory === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* 1. Header */}
      <SectionHeader
        tagline="Clinical Directory"
        title="Patients"
        subtitle="Search and access persistent patient medical records, treatment trajectories, and medication ledgers."
        badge={`${filteredPatients.length} Patients`}
        action={
          <div className="flex items-center gap-2">
            <span className="text-2xs text-stone-500 font-mono">
              Directory sync active
            </span>
          </div>
        }
      />

      {/* 2. Search & Filters */}
      <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by patient name, MRN (e.g. MRN-9412), email, or city..."
              className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-900 placeholder-stone-400 focus:bg-white focus:outline-hidden focus:border-stone-400 font-sans"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 text-xs">
            {[
              { label: 'All Statuses', value: 'all' },
              { label: 'Awaiting Review', value: 'awaiting_review' },
              { label: 'Active Care', value: 'active_care' },
              { label: 'Follow-up Due', value: 'follow_up_due' },
            ].map((st) => (
              <button
                key={st.value}
                onClick={() => setStatusFilter(st.value)}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap text-xs font-medium transition-colors ${
                  statusFilter === st.value
                    ? 'bg-stone-900 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Patient List Table / Cards */}
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-600">
            <thead className="bg-stone-50/80 text-stone-500 font-semibold border-b border-stone-200 uppercase text-3xs tracking-wider">
              <tr>
                <th className="py-3 px-4">Patient Name & MRN</th>
                <th className="py-3 px-4">Demographics</th>
                <th className="py-3 px-4">Primary Clinical Concern</th>
                <th className="py-3 px-4">Current Regimen</th>
                <th className="py-3 px-4">Care Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-stone-500">
                    <div className="inline-flex items-center gap-2 text-xs">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Loading patient directory...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-stone-400">
                    <p className="text-xs">No patients found in directory matching your criteria.</p>
                  </td>
                </tr>
              ) : (
                filteredPatients.map((patient) => (
                  <tr
                    key={patient.id}
                    className="hover:bg-stone-50/70 transition-colors group cursor-pointer"
                  >
                    <td className="py-3.5 px-4">
                      <Link
                        to={`/doctor/patients/${patient.id}`}
                        className="flex items-center gap-3 font-semibold text-stone-900 group-hover:text-emerald-800"
                      >
                        <div className="w-8 h-8 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center font-bold text-stone-700 text-xs">
                          {patient.name[0]}
                        </div>
                        <div>
                          <div className="text-sm font-sans font-semibold text-stone-900">
                            {patient.name}
                          </div>
                          <span className="font-mono text-2xs text-stone-400">
                            {patient.mrn}
                          </span>
                        </div>
                      </Link>
                    </td>

                    <td className="py-3.5 px-4 text-stone-600">
                      <div>
                        {patient.age} y/o {patient.gender}
                      </div>
                      <div className="text-3xs text-stone-400">
                        {patient.city}, {patient.state}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-medium text-stone-800 line-clamp-1">
                        {patient.primaryConcern}
                      </div>
                      <div className="text-3xs text-stone-400">{patient.careCategory}</div>
                    </td>

                    <td className="py-3.5 px-4 text-stone-700 font-mono text-2xs">
                      <span className="line-clamp-1">{patient.currentMedicationsSummary}</span>
                    </td>

                    <td className="py-3.5 px-4">
                      <StatusBadge status={patient.careStatus} />
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <Link
                        to={`/doctor/patients/${patient.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-stone-100 group-hover:bg-stone-900 group-hover:text-white text-stone-700 font-medium text-xs transition-colors"
                      >
                        <span>Open Chart</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

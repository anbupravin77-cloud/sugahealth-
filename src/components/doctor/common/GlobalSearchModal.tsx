import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, User, FileText, ArrowRight, X, Sparkles, Loader2 } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { supabase } from '../../../lib/supabase';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [consultations, setConsultations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isOpen) return;

    async function loadData() {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          const res = await fetch('/api/clinical/doctor/consultations', {
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
          if (res.ok) {
            const data = await res.json();
            setConsultations(data.consultations || []);
          }
        }
      } catch (err) {
        console.warn('Global search data load error:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Extract unique patients from consultations
  const patientMap = new Map<string, any>();
  consultations.forEach((c) => {
    const pid = c.patient_id;
    if (!patientMap.has(pid)) {
      const responses = c.responses || {};
      patientMap.set(pid, {
        id: pid,
        name: responses.fullName || 'Patient Intake',
        mrn: `MRN-${c.id?.slice(0, 6).toUpperCase()}`,
        primaryConcern: c.primary_concern === 'weight' ? 'GLP-1 Weight Management' : 'Telehealth Intake',
        careStatus: c.status === 'completed' ? 'active_care' : 'awaiting_review',
      });
    }
  });
  const patients = Array.from(patientMap.values());

  const filteredPatients = query.trim()
    ? patients.filter(
        (p) =>
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          p.mrn.toLowerCase().includes(query.toLowerCase()) ||
          p.primaryConcern.toLowerCase().includes(query.toLowerCase())
      )
    : patients.slice(0, 4);

  const filteredConsultations = query.trim()
    ? consultations
        .map((c) => ({
          id: c.id,
          patientName: c.responses?.fullName || 'Patient Intake',
          category: c.primary_concern === 'weight' ? 'GLP-1 Weight' : 'General Care',
          requestedMedication: c.responses?.primaryConcern || 'Clinical Protocol',
          status: c.status,
        }))
        .filter(
          (c) =>
            c.patientName.toLowerCase().includes(query.toLowerCase()) ||
            c.requestedMedication.toLowerCase().includes(query.toLowerCase()) ||
            c.category.toLowerCase().includes(query.toLowerCase())
        )
    : consultations.slice(0, 3).map((c) => ({
        id: c.id,
        patientName: c.responses?.fullName || 'Patient Intake',
        category: c.primary_concern === 'weight' ? 'GLP-1 Weight' : 'General Care',
        requestedMedication: c.responses?.primaryConcern || 'Clinical Protocol',
        status: c.status,
      }));

  const handleSelectPatient = (id: string) => {
    navigate(`/doctor/patients/${id}`);
    onClose();
  };

  const handleSelectConsultation = (id: string) => {
    navigate(`/doctor/consultations/${id}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-stone-900/50 backdrop-blur-xs">
      <div
        className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-stone-200 bg-stone-50/60">
          <Search className="w-5 h-5 text-stone-400" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search patients by name, MRN, concern, or medication..."
            className="flex-1 bg-transparent text-sm text-stone-900 placeholder-stone-400 focus:outline-hidden font-sans"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-md text-stone-400 hover:text-stone-600 hover:bg-stone-200/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results Body */}
        <div className="max-h-[60vh] overflow-y-auto p-3 space-y-4">
          {/* Patients */}
          <div>
            <div className="px-2 py-1 text-2xs font-semibold uppercase tracking-wider text-stone-400 flex items-center justify-between">
              <span>Patients Directory</span>
              <span>{filteredPatients.length} found</span>
            </div>
            <div className="mt-1 space-y-1">
              {filteredPatients.map((patient) => (
                <button
                  key={patient.id}
                  onClick={() => handleSelectPatient(patient.id)}
                  className="w-full text-left flex items-center justify-between p-2.5 rounded-xl hover:bg-stone-50 border border-transparent hover:border-stone-200 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center text-xs font-semibold text-stone-700">
                      {patient.name[0]}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-stone-900 group-hover:text-emerald-950 font-sans">
                          {patient.name}
                        </span>
                        <span className="font-mono text-2xs px-1.5 py-0.2 rounded bg-stone-100 text-stone-500">
                          {patient.mrn}
                        </span>
                      </div>
                      <p className="text-xs text-stone-500 line-clamp-1">{patient.primaryConcern}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={patient.careStatus} size="sm" />
                    <ArrowRight className="w-4 h-4 text-stone-300 group-hover:text-stone-700 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Consultations */}
          <div>
            <div className="px-2 py-1 text-2xs font-semibold uppercase tracking-wider text-stone-400 flex items-center justify-between">
              <span>Clinical Consultations</span>
              <span>{filteredConsultations.length} found</span>
            </div>
            <div className="mt-1 space-y-1">
              {filteredConsultations.map((consultation) => (
                <button
                  key={consultation.id}
                  onClick={() => handleSelectConsultation(consultation.id)}
                  className="w-full text-left flex items-center justify-between p-2.5 rounded-xl hover:bg-stone-50 border border-transparent hover:border-stone-200 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-xs font-semibold text-emerald-800">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-stone-900 font-sans">
                          {consultation.patientName}
                        </span>
                        <span className="text-2xs text-stone-500">• {consultation.category}</span>
                      </div>
                      <p className="text-xs text-stone-500 line-clamp-1">
                        {consultation.requestedMedication}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={consultation.status} size="sm" />
                    <ArrowRight className="w-4 h-4 text-stone-300 group-hover:text-stone-700 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-4 py-2.5 bg-stone-50 border-t border-stone-200 flex items-center justify-between text-2xs text-stone-500">
          <span className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded bg-white border border-stone-200 font-mono text-stone-600">
              ESC
            </kbd>{' '}
            to close
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded bg-white border border-stone-200 font-mono text-stone-600">
              ↵
            </kbd>{' '}
            to navigate
          </span>
        </div>
      </div>
    </div>
  );
};

import { useState, useEffect } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Loader2, ArrowLeft, Shield, User, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { ClinicalNotes } from './ClinicalNotes';
import { PrescriptionBuilder } from './PrescriptionBuilder';
import { DocumentManager } from './DocumentManager';

export default function DoctorReview() {
  const { id } = useParams<{ id: string }>();
  const { user, profile } = useAuth();
  
  const [consultation, setConsultation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [markingComplete, setMarkingComplete] = useState(false);

  const getAuthToken = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) return session.access_token;
    } catch {}
    return null;
  };

  useEffect(() => {
    async function loadConsultation() {
      if (!user || !id) return;
      try {
        const token = await getAuthToken();
        if (!token) return;

        const res = await fetch(`/api/clinical/consultations/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) {
          setError('Consultation not found or access forbidden.');
          return;
        }

        const data = await res.json();
        const cons = data.consultation || data;
        
        // Final fallback auth check
        const assignedTo = cons.assigned_to || cons.assignedTo;
        if (assignedTo && assignedTo !== user.uid && profile?.role !== 'admin') {
          setError('You do not have permission to view this clinical record.');
          return;
        }
        
        setConsultation({
          id: cons.id,
          patientId: cons.patient_id || cons.patientId,
          assignedTo: cons.assigned_to || cons.assignedTo,
          status: cons.status,
          primaryConcern: cons.primary_concern || cons.primaryConcern,
          responses: cons.responses,
          submittedAt: cons.submitted_at || cons.submittedAt,
          updatedAt: cons.updated_at || cons.updatedAt,
        });
        
        // If assigned, automatically claim to transition to under_review
        if (cons.status === 'assigned' && profile?.role === 'doctor') {
          fetch(`/api/clinical/consultations/${id}/claim`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` }
          }).then(claimRes => {
            if (claimRes.ok) {
              setConsultation((prev: any) => ({ ...prev, status: 'under_review' }));
            }
          }).catch(e => console.error("Failed to claim consultation", e));
        }
        
      } catch (err: any) {
        console.error(err);
        setError('Failed to load clinical record.');
      } finally {
        setLoading(false);
      }
    }
    loadConsultation();
  }, [user, id, profile]);

  const handleMarkCompleted = async () => {
    if (!user || !id) return;
    setMarkingComplete(true);
    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/clinical/consultations/${id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to mark completed');
      }
      setConsultation((prev: any) => ({ ...prev, status: 'completed' }));
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to mark completed");
    } finally {
      setMarkingComplete(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-900" />
      </div>
    );
  }

  if (error || !consultation) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle size={48} className="text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-neutral-900 mb-2">Access Denied</h2>
        <p className="text-neutral-500 mb-6">{error}</p>
        <Link to="/doctor" className="text-sm font-semibold text-neutral-900 bg-neutral-200 px-6 py-2 rounded-lg hover:bg-neutral-300">
          Return to Queue
        </Link>
      </div>
    );
  }

  const { responses } = consultation;

  return (
    <div className="min-h-screen bg-neutral-50 pt-24 pb-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Link to="/doctor" className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-500 hover:text-neutral-900 transition-colors">
            <ArrowLeft size={16} /> Back to Queue
          </Link>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
            <span className="text-neutral-400">Status:</span>
            <span className={`px-2 py-1 rounded-md ${
              consultation.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : 
              'bg-amber-100 text-amber-800'
            }`}>
              {consultation.status.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Patient Header */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-500 font-bold text-lg">
              {responses?.fullName?.charAt(0) || 'U'}
            </div>
            <div>
              <h1 className="text-2xl font-black text-neutral-900">{responses?.fullName || 'Unknown Patient'}</h1>
              <p className="text-sm text-neutral-500 flex items-center gap-2 mt-0.5">
                <FileText size={14} /> Consultation ID: <span className="font-mono text-xs">{consultation.id}</span>
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-wider font-bold text-neutral-400 mb-1">Clinical Concern</div>
            <div className="text-lg font-semibold text-neutral-900 capitalize">
              {consultation.primaryConcern === 'weight' ? 'Medical Weight Loss' : consultation.primaryConcern === 'hair' ? 'Hair Growth' : consultation.primaryConcern === 'sex' ? 'Sexual Health' : 'General'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Main Clinical Record */}
          <div className="md:col-span-2 space-y-6">
            
            <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 bg-neutral-50 border-b border-neutral-100 flex items-center gap-2">
                <User size={18} className="text-neutral-500" />
                <h2 className="font-semibold text-neutral-900">Patient Metrics</h2>
              </div>
              <div className="p-6 grid grid-cols-2 gap-6">
                <div>
                  <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Height</div>
                  <div className="font-medium text-neutral-900">{responses?.height || 'Not provided'}</div>
                </div>
                <div>
                  <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Weight</div>
                  <div className="font-medium text-neutral-900">{responses?.weight || 'Not provided'}</div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 bg-neutral-50 border-b border-neutral-100 flex items-center gap-2">
                <Shield size={18} className="text-neutral-500" />
                <h2 className="font-semibold text-neutral-900">Medical History & Conditions</h2>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Selected Conditions</div>
                  {responses?.conditions?.length > 0 ? (
                    <ul className="list-disc list-inside space-y-1 text-sm text-neutral-900">
                      {responses.conditions.map((c: string) => (
                        <li key={c}>{c}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-neutral-500 italic">None reported.</p>
                  )}
                </div>
                
                {responses?.medicalHistory && (
                  <div>
                    <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Additional Medical History</div>
                    <div className="p-4 bg-neutral-50 rounded-lg text-sm text-neutral-900 whitespace-pre-wrap">
                      {responses.medicalHistory}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 bg-neutral-50 border-b border-neutral-100 flex items-center gap-2">
                <AlertCircle size={18} className="text-neutral-500" />
                <h2 className="font-semibold text-neutral-900">Medications & Allergies</h2>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Current Medications</div>
                  <div className="p-4 bg-neutral-50 rounded-lg text-sm text-neutral-900 whitespace-pre-wrap">
                    {responses?.medications || <span className="text-neutral-500 italic">None reported.</span>}
                  </div>
                </div>
                
                <div>
                  <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Known Allergies</div>
                  <div className="p-4 bg-neutral-50 rounded-lg text-sm text-neutral-900 whitespace-pre-wrap">
                    {responses?.allergies || <span className="text-neutral-500 italic">None reported.</span>}
                  </div>
                </div>
              </div>
            </div>

            <ClinicalNotes consultationId={consultation.id} />
            
            <PrescriptionBuilder consultationId={consultation.id} />

          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            
            <DocumentManager consultationId={consultation.id} />

            <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm">
              <h3 className="font-semibold text-neutral-900 mb-4 border-b border-neutral-100 pb-2">Submission Details</h3>
              <div className="space-y-4 text-sm">
                <div>
                  <div className="text-xs text-neutral-500 mb-1">Submitted On</div>
                  <div className="font-medium text-neutral-900">{new Date(consultation.submittedAt).toLocaleString()}</div>
                </div>
                
                <div className="pt-4 border-t border-neutral-100">
                  <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">Consent Verified</div>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                      <span className="text-xs text-neutral-700">Truthful Information</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                      <span className="text-xs text-neutral-700">Telehealth Consent</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                      <span className="text-xs text-neutral-700">Privacy Policy</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Doctor Actions */}
            <div className="bg-neutral-900 rounded-2xl p-6 shadow-sm text-white">
              <h3 className="font-semibold mb-4 border-b border-neutral-800 pb-2">Clinical Action</h3>
              <p className="text-xs text-neutral-400 mb-6">
                After reviewing the clinical record, adding your notes, and finalizing any required prescriptions, you may mark the chart review as completed to conclude this stage of the workflow.
              </p>
              
              {consultation.status !== 'completed' ? (
                <button
                  onClick={handleMarkCompleted}
                  disabled={markingComplete}
                  className="w-full flex items-center justify-center gap-2 bg-white text-neutral-950 px-4 py-3 rounded-xl font-bold uppercase tracking-wider text-xs hover:bg-neutral-200 disabled:opacity-50 transition-colors"
                >
                  {markingComplete ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  Mark Review Complete
                </button>
              ) : (
                <div className="w-full flex items-center justify-center gap-2 bg-emerald-500/20 text-emerald-400 px-4 py-3 rounded-xl font-bold uppercase tracking-wider text-xs border border-emerald-500/30">
                  <CheckCircle2 size={16} />
                  Review Completed
                </div>
              )}
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}

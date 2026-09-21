import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../lib/supabase';
import { Loader2, User, Activity, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export function ConsultationsTab() {
  const { user } = useAuth();
  const [consultations, setConsultations] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedConsultation, setSelectedConsultation] = useState<string | null>(null);
  const [reassignTo, setReassignTo] = useState('');
  const [reason, setReason] = useState('');
  const [reassigning, setReassigning] = useState(false);
  const [success, setSuccess] = useState('');

  const getAuthToken = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) return session.access_token;
    } catch {}
    if (user && typeof (user as any).getIdToken === 'function') {
      try {
        return await (user as any).getIdToken();
      } catch {}
    }
    return null;
  };

  const fetchData = async () => {
    if (!user) return;
    try {
      const { data: consultData } = await supabase
        .from('consultations')
        .select('*')
        .order('updated_at', { ascending: false });

      if (consultData) {
        setConsultations(consultData.map((c: any) => ({
          id: c.id,
          patientId: c.patient_id,
          assignedTo: c.assigned_to,
          status: c.status,
          primaryConcern: c.primary_concern,
          updatedAt: c.updated_at,
          createdAt: c.created_at,
          submittedAt: c.submitted_at,
          responses: c.responses,
        })));
      }
      
      const { data: staffData } = await supabase
        .from('staff_profiles')
        .select('*')
        .eq('role', 'doctor');

      if (staffData) {
        setDoctors(staffData.map((d: any) => ({
          id: d.id,
          displayName: `${d.first_name || ''} ${d.last_name || ''}`.trim() || 'Doctor',
          firstName: d.first_name,
          lastName: d.last_name,
          role: d.role,
          specialties: d.specialties || [],
        })));
      }
      
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleReassign = async (id: string) => {
    if (!user || !reassignTo) return;
    setReassigning(true);
    setSuccess('');
    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/admin/consultations/${id}/reassign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ assignedTo: reassignTo, reason })
      });
      if (!res.ok) throw new Error('Failed to reassign');
      
      setSuccess('Consultation successfully reassigned.');
      setSelectedConsultation(null);
      setReassignTo('');
      setReason('');
      fetchData();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setReassigning(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  const activeConsultations = consultations.filter(c => c.status !== 'draft');

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-neutral-900">Clinical Operations</h2>
          <p className="text-sm text-neutral-500 mt-1">Manage consultation routing and doctor assignments.</p>
        </div>
      </div>
      
      {success && (
        <div className="bg-emerald-50 text-emerald-800 p-4 rounded-lg text-sm border border-emerald-100 flex items-center gap-2 font-bold">
          <CheckCircle2 size={18} className="text-emerald-500" />
          {success}
        </div>
      )}

      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-medium">
              <tr>
                <th className="px-6 py-4">ID & Patient</th>
                <th className="px-6 py-4">Clinical Concern</th>
                <th className="px-6 py-4">Status & Doctor</th>
                <th className="px-6 py-4 text-right">Admin Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {activeConsultations.map(c => {
                const assignedDoc = doctors.find(d => d.id === c.assignedTo);
                
                return (
                  <tr key={c.id} className="hover:bg-neutral-50/50">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-neutral-900">{c.responses?.fullName || 'Unknown'}</div>
                      <div className="text-xs text-neutral-500 font-mono mt-0.5">{c.id}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="capitalize font-medium">{c.primaryConcern}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider w-fit ${
                          c.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                          c.status === 'under_review' ? 'bg-amber-100 text-amber-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {c.status.replace('_', ' ')}
                        </span>
                        <div className="text-xs font-medium text-neutral-700 flex items-center gap-1.5">
                          <User size={12} className="text-neutral-400" />
                          {assignedDoc ? `Dr. ${assignedDoc.lastName || assignedDoc.displayName}` : 'Unassigned'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        {selectedConsultation === c.id ? (
                           <div className="flex items-center gap-2 bg-neutral-50 p-2 rounded-lg border border-neutral-200">
                             <select
                               value={reassignTo}
                               onChange={(e) => setReassignTo(e.target.value)}
                               className="text-xs border border-neutral-300 rounded px-2 py-1"
                             >
                               <option value="">Select Doctor</option>
                               {doctors.filter(d => d.specialties?.includes(c.primaryConcern) || d.specialties?.includes('general')).map(d => (
                                 <option key={d.id} value={d.id}>Dr. {d.lastName || d.displayName}</option>
                               ))}
                             </select>
                             <input 
                               type="text" 
                               placeholder="Reason (optional)" 
                               value={reason}
                               onChange={e => setReason(e.target.value)}
                               className="text-xs border border-neutral-300 rounded px-2 py-1 w-32"
                             />
                             <button
                               onClick={() => handleReassign(c.id)}
                               disabled={!reassignTo || reassigning}
                               className="bg-neutral-900 text-white text-xs px-3 py-1 rounded hover:bg-neutral-800 disabled:opacity-50"
                             >
                               {reassigning ? 'Saving...' : 'Confirm'}
                             </button>
                             <button onClick={() => setSelectedConsultation(null)} className="text-xs text-neutral-500 hover:text-neutral-900">
                               Cancel
                             </button>
                           </div>
                        ) : (
                          <>
                            <Link to={`/doctor/review/${c.id}`} className="text-xs font-semibold text-neutral-600 hover:text-neutral-900">
                              View Chart
                            </Link>
                            <button
                              onClick={() => setSelectedConsultation(c.id)}
                              className="text-xs font-semibold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-md"
                            >
                              Reassign
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import RefillRequests from './RefillRequests';
import { RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { Loader2, Clock, CheckCircle2, Shield, Search, ArrowRight, User } from 'lucide-react';

export default function DoctorQueue() {
  const { user, profile } = useAuth();
  const [consultations, setConsultations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchQueue() {
      if (!user) return;
      try {
        const q = query(
          collection(db, 'consultations'),
          where('assignedTo', '==', user.uid),
          where('status', 'in', ['assigned', 'under_review', 'completed'])
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Client-side sort by newest first (since composite index might not exist)
        data.sort((a: any, b: any) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
        setConsultations(data);
      } catch (err) {
        console.error("Failed to fetch queue", err);
      } finally {
        setLoading(false);
      }
    }
    fetchQueue();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-900" />
      </div>
    );
  }

  const activeConsultations = consultations.filter(c => c.status !== 'completed');
  const completedConsultations = consultations.filter(c => c.status === 'completed');

  return (
    <div className="min-h-screen bg-neutral-50 pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-neutral-500 mb-2 font-medium">
              <Shield size={16} className="text-emerald-600" />
              Doctor Portal
            </div>
            <h1 className="text-3xl font-black text-neutral-900 tracking-tight">Clinical Work Queue</h1>
            <p className="text-neutral-500 mt-1">
              Welcome back, Dr. {profile?.lastName || profile?.displayName}. You have {activeConsultations.length} consultations awaiting review.
            </p>
          </div>
          <div>
            <Link 
              to="/doctor/messages"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-neutral-200 text-neutral-700 rounded-lg text-sm font-bold hover:bg-neutral-50 transition-colors shadow-sm"
            >
              Patient Messages
            </Link>
          </div>
        </div>

        {/* Active Queue */}
        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
            <h2 className="font-semibold text-neutral-900 flex items-center gap-2">
              Needs Attention <span className="bg-red-100 text-red-700 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full">{activeConsultations.length}</span>
            </h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-neutral-50 border-b border-neutral-100 text-neutral-500 font-medium">
                <tr>
                  <th className="px-6 py-4">Patient</th>
                  <th className="px-6 py-4">Clinical Concern</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Waiting Since</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {activeConsultations.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-neutral-500">
                      <div className="flex flex-col items-center justify-center">
                        <CheckCircle2 size={32} className="text-emerald-300 mb-3" />
                        <p className="font-medium text-neutral-900">Your queue is empty.</p>
                        <p className="text-xs mt-1">All assigned consultations have been reviewed.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  activeConsultations.map(c => (
                    <tr key={c.id} className="hover:bg-neutral-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-neutral-900">
                          {c.responses?.fullName || 'Unknown Patient'}
                        </div>
                        <div className="text-xs text-neutral-500 mt-0.5">
                          ID: {c.patientId.slice(0, 8)}...
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="capitalize font-medium text-neutral-900">
                          {c.primaryConcern === 'weight' ? 'Weight Loss' : c.primaryConcern === 'hair' ? 'Hair Growth' : c.primaryConcern === 'sex' ? 'Sexual Health' : 'General'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                          c.status === 'under_review' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {c.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-neutral-500 text-xs">
                        <div className="flex items-center gap-1.5">
                          <Clock size={14} />
                          {new Date(c.submittedAt).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          to={`/doctor/review/${c.id}`}
                          className="inline-flex items-center gap-1.5 bg-neutral-950 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-neutral-800 transition-colors"
                        >
                          Review <ArrowRight size={14} />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recently Completed */}
        {completedConsultations.length > 0 && (
          <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm">
             <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
              <h2 className="font-semibold text-neutral-900">Recently Completed</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-neutral-50 border-b border-neutral-100 text-neutral-500 font-medium">
                  <tr>
                    <th className="px-6 py-3">Patient</th>
                    <th className="px-6 py-3">Clinical Concern</th>
                    <th className="px-6 py-3">Completed On</th>
                    <th className="px-6 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {completedConsultations.map(c => (
                    <tr key={c.id} className="hover:bg-neutral-50/50">
                      <td className="px-6 py-3 text-neutral-900 font-medium">{c.responses?.fullName || 'Unknown Patient'}</td>
                      <td className="px-6 py-3 text-neutral-600 capitalize">{c.primaryConcern}</td>
                      <td className="px-6 py-3 text-neutral-500 text-xs">{new Date(c.updatedAt).toLocaleDateString()}</td>
                      <td className="px-6 py-3 text-right">
                        <Link to={`/doctor/review/${c.id}`} className="text-neutral-600 hover:text-neutral-900 font-medium text-xs">
                          View Chart
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Loader2, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function RefillRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const token = await user?.getIdToken();
      const res = await fetch('/api/refill-requests', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (id: string, action: 'approve' | 'deny') => {
    if (!window.confirm(`Are you sure you want to ${action} this refill request?`)) return;
    setProcessing(id);
    
    try {
      const token = await user?.getIdToken();
      const res = await fetch(`/api/refill-requests/${id}/review`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ action, decisionReason: `Clinically reviewed and ${action}d` })
      });
      
      if (res.ok) {
        await fetchRequests();
      } else {
        const data = await res.json();
        alert(`Error: ${data.error}`);
      }
    } catch (err) {
      alert('An error occurred');
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  const pending = requests.filter(r => r.status === 'pending_review');
  const past = requests.filter(r => r.status !== 'pending_review');

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-neutral-900 mb-6">Pending Refill Requests</h2>
        {pending.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 py-12 text-center">
            <CheckCircle className="mb-4 h-8 w-8 text-neutral-300" />
            <h3 className="mb-1 text-sm font-medium text-neutral-900">All caught up</h3>
            <p className="text-sm text-neutral-500">No pending refill requests.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pending.map(req => (
              <div key={req.refillRequestId} className="rounded-xl border border-neutral-200 bg-white p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center">
                <div>
                  <h3 className="font-medium text-neutral-900">Patient ID: {req.patientId.slice(0, 8)}...</h3>
                  <p className="text-sm text-neutral-500">Requested: {new Date(req.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="mt-4 sm:mt-0 flex gap-3">
                  <button
                    onClick={() => handleReview(req.refillRequestId, 'deny')}
                    disabled={processing === req.refillRequestId}
                    className="flex items-center justify-center rounded-lg border border-red-200 text-red-600 bg-red-50 px-4 py-2 text-sm font-medium hover:bg-red-100 disabled:opacity-50"
                  >
                    Deny
                  </button>
                  <button
                    onClick={() => handleReview(req.refillRequestId, 'approve')}
                    disabled={processing === req.refillRequestId}
                    className="flex items-center justify-center rounded-lg bg-neutral-950 text-white px-4 py-2 text-sm font-medium hover:bg-neutral-800 disabled:opacity-50"
                  >
                    Approve Refill
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {past.length > 0 && (
        <div className="pt-6 border-t border-neutral-100">
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">Past Refill Requests</h2>
          <div className="space-y-3">
            {past.slice(0, 10).map(req => (
              <div key={req.refillRequestId} className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-medium text-neutral-900">Patient: {req.patientId.slice(0,8)}...</h3>
                  <p className="text-xs text-neutral-500">{new Date(req.reviewedAt || req.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="text-sm font-medium uppercase tracking-wider text-neutral-500">
                  {req.status.replace('_', ' ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

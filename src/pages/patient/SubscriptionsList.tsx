import { useEffect, useState } from 'react';
import { Loader2, RefreshCw, XCircle, CheckCircle, Clock, Plus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function SubscriptionsList() {
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [eligiblePrescriptions, setEligiblePrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = await user?.getIdToken();
      
      const [subsRes, presRes] = await Promise.all([
        fetch('/api/subscriptions', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/prescriptions/eligible', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      if (subsRes.ok && presRes.ok) {
        const subsData = await subsRes.json();
        const presData = await presRes.json();
        
        setSubscriptions(subsData);
        setEligiblePrescriptions(presData);
      } else {
        setError('Failed to load data');
      }
    } catch (err) {
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id: string) => {
    if (!window.confirm('Are you sure you want to cancel this subscription?')) return;
    
    setCancelling(id);
    try {
      const token = await user?.getIdToken();
      const res = await fetch(`/api/subscriptions/${id}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        await fetchData();
      } else {
        const errorData = await res.json();
        alert(`Failed to cancel: ${errorData.error}`);
      }
    } catch (err) {
      alert('An error occurred');
    } finally {
      setCancelling(null);
    }
  };

  const handleSubscribe = async (prescriptionId: string) => {
    setSubscribing(prescriptionId);
    try {
      const token = await user?.getIdToken();
      const res = await fetch(`/api/subscriptions/checkout`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ prescriptionId })
      });
      
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        alert(`Failed to start subscription: ${data.error}`);
      }
    } catch (err) {
      alert('An error occurred');
    } finally {
      setSubscribing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
        {error}
      </div>
    );
  }

  // Filter out prescriptions that already have active subscriptions
  const availableToSubscribe = eligiblePrescriptions.filter(p => 
    !subscriptions.some(s => s.sourcePrescriptionId === p.id && s.status !== 'cancelled' && s.status !== 'expired')
  );

  return (
    <div className="space-y-8">
      {subscriptions.length > 0 ? (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-neutral-900">Active Subscriptions</h3>
          {subscriptions.map((sub) => (
            <div key={sub.subscriptionId} className="flex flex-col sm:flex-row items-start sm:items-center justify-between rounded-xl border border-neutral-200 bg-white p-5">
              <div className="mb-4 sm:mb-0">
                <h3 className="font-medium text-neutral-900">{sub.treatmentName}</h3>
                <div className="mt-1 flex items-center space-x-4 text-sm text-neutral-500">
                  <span className="flex items-center">
                    {sub.status === 'active' ? (
                      <CheckCircle className="mr-1.5 h-4 w-4 text-green-500" />
                    ) : sub.status === 'past_due' ? (
                      <Clock className="mr-1.5 h-4 w-4 text-amber-500" />
                    ) : (
                      <XCircle className="mr-1.5 h-4 w-4 text-neutral-400" />
                    )}
                    <span className="capitalize">{sub.status.replace('_', ' ')}</span>
                  </span>
                  <span>•</span>
                  <span>Every {sub.intervalCount} {sub.billingInterval}(s)</span>
                </div>
                {sub.status === 'active' && sub.nextBillingAt && (
                  <div className="mt-2 text-xs text-neutral-500">
                    Next billing: {new Date(sub.nextBillingAt).toLocaleDateString()}
                  </div>
                )}
              </div>
              
              {(sub.status === 'active' || sub.status === 'past_due' || sub.status === 'paused') && (
                <button
                  onClick={() => handleCancel(sub.subscriptionId)}
                  disabled={cancelling === sub.subscriptionId}
                  className="flex items-center justify-center rounded-lg border border-red-200 text-red-600 bg-red-50 px-4 py-2 text-sm font-medium transition-colors hover:bg-red-100 disabled:opacity-50"
                >
                  {cancelling === sub.subscriptionId ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Cancel'}
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 py-12 text-center">
          <RefreshCw className="mb-4 h-8 w-8 text-neutral-300" />
          <h3 className="mb-1 text-sm font-medium text-neutral-900">No active subscriptions</h3>
          <p className="text-sm text-neutral-500">
            When you subscribe to refills, they will appear here.
          </p>
        </div>
      )}

      {availableToSubscribe.length > 0 && (
        <div className="space-y-4 pt-6 border-t border-neutral-100">
          <h3 className="text-lg font-medium text-neutral-900">Eligible for Refill Subscription</h3>
          {availableToSubscribe.map((p) => (
            <div key={p.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50 p-5">
              <div className="mb-4 sm:mb-0">
                <h3 className="font-medium text-neutral-900">{p.treatmentCategory || 'General Refill'}</h3>
                <p className="mt-1 text-sm text-neutral-500">
                  {p.medications?.map((m: any) => m.medicationName).join(', ')}
                </p>
                <div className="mt-2 text-xs text-neutral-500 font-medium">
                  Refill every {p.refillIntervalDays || 30} days
                </div>
              </div>
              
              <button
                onClick={() => handleSubscribe(p.id)}
                disabled={subscribing === p.id}
                className="flex items-center justify-center rounded-lg bg-neutral-950 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:opacity-50"
              >
                {subscribing === p.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" /> Subscribe
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

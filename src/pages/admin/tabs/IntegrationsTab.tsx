import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

interface IntegrationStatus {
  stripe: 'Configured' | 'Not configured';
  email: 'Configured' | 'Not configured';
  sms: 'Configured' | 'Not configured';
  shipping: 'Configured' | 'Not configured';
}

export function IntegrationsTab() {
  const { user } = useAuth();
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchStatus() {
      if (!user) return;
      try {
        const token = await user.getIdToken();
        const res = await fetch('/api/admin/integrations/status', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        if (!res.ok) {
          throw new Error('Failed to fetch integration status');
        }
        
        const data = await res.json();
        setStatus(data);
      } catch (err: any) {
        setError(err.message || 'An error occurred');
      } finally {
        setLoading(false);
      }
    }
    fetchStatus();
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-neutral-400" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-800 p-4 rounded-xl text-sm">
        {error}
      </div>
    );
  }

  const integrations = [
    { name: 'Stripe', key: 'stripe' as keyof IntegrationStatus, description: 'Payment processing and checkout' },
    { name: 'Email Provider', key: 'email' as keyof IntegrationStatus, description: 'Transactional email delivery' },
    { name: 'SMS Provider', key: 'sms' as keyof IntegrationStatus, description: 'Transactional text messages' },
    { name: 'Shipping Provider', key: 'shipping' as keyof IntegrationStatus, description: 'Pharmacist fulfillment and shipping labels' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-neutral-900 mb-2">Platform Integrations</h2>
        <p className="text-sm text-neutral-500">
          Operational status of external service integrations. Secrets and credentials are managed server-side and cannot be viewed here.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-sm">
        <ul className="divide-y divide-neutral-200">
          {integrations.map((integration) => {
            const isConfigured = status?.[integration.key] === 'Configured';
            return (
              <li key={integration.key} className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">{integration.name}</h3>
                  <p className="text-sm text-neutral-500 mt-1">{integration.description}</p>
                </div>
                <div className="flex shrink-0">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
                    isConfigured 
                      ? 'bg-emerald-50 text-emerald-700' 
                      : 'bg-neutral-100 text-neutral-600'
                  }`}>
                    {isConfigured ? (
                      <CheckCircle2 size={14} className="text-emerald-500" />
                    ) : (
                      <XCircle size={14} className="text-neutral-400" />
                    )}
                    {isConfigured ? 'Configured' : 'Not configured'}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

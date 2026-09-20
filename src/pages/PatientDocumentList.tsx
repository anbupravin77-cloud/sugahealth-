import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Loader2, FileText, Download, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PatientDocumentListProps {
  consultationId: string;
}

export function PatientDocumentList({ consultationId }: PatientDocumentListProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingOrder, setCreatingOrder] = useState<string | null>(null);

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

  useEffect(() => {
    async function fetchDocuments() {
      if (!user) return;
      try {
        const token = await getAuthToken();
        if (!token) return;
        const res = await fetch(`/api/consultations/${consultationId}/documents`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setDocuments(data.documents || []);
        }
      } catch (err) {
        console.error('Error fetching documents:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchDocuments();
  }, [consultationId, user]);

  const handleDownload = async (docId: string, filename: string) => {
    if (!user) return;
    try {
      const token = await getAuthToken();
      if (!token) return;
      const res = await fetch(`/api/documents/${docId}/download`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Failed to download document.');
      }
    } catch (err) {
      console.error(err);
      alert('Error downloading document.');
    }
  };

  const handleCreateOrder = async (prescriptionId: string) => {
    if (!user) return;
    setCreatingOrder(prescriptionId);
    try {
      const token = await getAuthToken();
      if (!token) return;
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ prescriptionId })
      });
      
      const data = await res.json();
      if (res.ok) {
        // Trigger page refresh to show orders tab or navigate
        window.location.reload();
      } else {
        alert(data.error || 'Failed to create order');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred while creating your order.');
    } finally {
      setCreatingOrder(null);
    }
  };

  if (loading) return null;
  if (documents.length === 0) return null;

  return (
    <div className="mt-4 pt-4 border-t border-neutral-100">
      <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3">Clinical Documents</h4>
      <div className="flex flex-col gap-3">
        {documents.map((doc) => (
          <div key={doc.id} className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => handleDownload(doc.id, `${doc.documentType === 'prescription' ? 'Prescription' : 'Consultation'}_${doc.sourceEntityId}.pdf`)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors border ${
                doc.documentType === 'prescription' 
                  ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                  : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'
              }`}
            >
              <FileText size={14} />
              {doc.documentType === 'prescription' ? 'Official Prescription' : 'Intake Record'}
              <Download size={14} className="ml-1 opacity-50" />
            </button>

            {doc.documentType === 'prescription' && (
              <button
                onClick={() => handleCreateOrder(doc.sourceEntityId)}
                disabled={creatingOrder === doc.sourceEntityId}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider bg-neutral-900 text-white hover:bg-neutral-800 transition-colors disabled:opacity-50"
              >
                {creatingOrder === doc.sourceEntityId ? <Loader2 size={14} className="animate-spin" /> : <ShoppingBag size={14} />}
                Purchase Medication
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Loader2, FileText, Download, RefreshCw } from 'lucide-react';

interface DocumentManagerProps {
  consultationId: string;
}

export function DocumentManager({ consultationId }: DocumentManagerProps) {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);

  const fetchDocuments = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const token = await user.getIdToken();
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
  };

  useEffect(() => {
    fetchDocuments();
  }, [consultationId, user]);

  const handleGenerate = async (type: 'consultation' | 'prescription', prescriptionId?: string) => {
    if (!user) return;
    setGenerating(type);
    
    try {
      const token = await user.getIdToken();
      const endpoint = type === 'consultation' 
        ? `/api/consultations/${consultationId}/documents/generate-consultation`
        : `/api/consultations/${consultationId}/documents/generate-prescription`;
        
      const body = type === 'prescription' ? JSON.stringify({ prescriptionId }) : undefined;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body
      });
      
      if (res.ok) {
        await fetchDocuments();
      } else {
        const data = await res.json();
        alert(`Failed to generate document: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred while generating the document.');
    } finally {
      setGenerating(null);
    }
  };

  const handleDownload = async (docId: string, filename: string) => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
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

  return (
    <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm">
      <h3 className="font-semibold text-neutral-900 mb-4 border-b border-neutral-100 pb-2 flex items-center gap-2">
        <FileText size={18} />
        Clinical Documents
      </h3>
      
      {loading ? (
        <div className="flex justify-center p-4">
          <Loader2 className="animate-spin text-neutral-400" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Consultation Doc */}
          <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl border border-neutral-100">
            <div>
              <div className="text-sm font-semibold text-neutral-900">Intake Document</div>
              <div className="text-xs text-neutral-500">Patient submission record</div>
            </div>
            <div className="flex gap-2">
              {documents.some(d => d.documentType === 'consultation') ? (
                <>
                  <button 
                    onClick={() => handleGenerate('consultation')}
                    disabled={generating === 'consultation'}
                    className="p-2 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200 rounded-lg transition-colors"
                    title="Regenerate Document"
                  >
                    {generating === 'consultation' ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                  </button>
                  <button 
                    onClick={() => handleDownload(documents.find(d => d.documentType === 'consultation').id, `Consultation_${consultationId}.pdf`)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-neutral-900 text-white text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-neutral-800 transition-colors"
                  >
                    <Download size={14} /> Download
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => handleGenerate('consultation')}
                  disabled={generating === 'consultation'}
                  className="px-3 py-1.5 border border-neutral-300 text-neutral-700 text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-neutral-100 transition-colors flex items-center gap-1"
                >
                  {generating === 'consultation' ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                  Generate
                </button>
              )}
            </div>
          </div>
          
          {/* Prescription Docs */}
          {documents.filter(d => d.documentType === 'prescription').map(doc => (
            <div key={doc.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-xl border border-blue-100">
              <div>
                <div className="text-sm font-semibold text-blue-900">Prescription</div>
                <div className="text-xs text-blue-700">Official Rx (v{doc.version})</div>
              </div>
              <button 
                onClick={() => handleDownload(doc.id, `Prescription_${doc.sourceEntityId}.pdf`)}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Download size={14} /> Download
              </button>
            </div>
          ))}
          <p className="text-xs text-neutral-500 pt-2 border-t border-neutral-100">
            Note: Prescription PDFs can only be generated from finalized prescriptions.
          </p>
        </div>
      )}
    </div>
  );
}

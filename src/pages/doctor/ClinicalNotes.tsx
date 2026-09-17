import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Loader2, Save, FileText, CheckCircle2 } from 'lucide-react';

interface ClinicalNotesProps {
  consultationId: string;
}

export function ClinicalNotes({ consultationId }: ClinicalNotesProps) {
  const { user } = useAuth();
  const [noteId, setNoteId] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  
  useEffect(() => {
    async function fetchNotes() {
      if (!user) return;
      try {
        const token = await user.getIdToken();
        const res = await fetch(`/api/consultations/${consultationId}/notes`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.notes && data.notes.length > 0) {
            setNoteId(data.notes[0].id);
            setText(data.notes[0].text);
          }
        }
      } catch (err) {
        console.error('Error fetching notes:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchNotes();
  }, [consultationId, user]);

  const handleSave = async () => {
    if (!user || !text.trim()) return;
    setSaving(true);
    setSavedSuccess(false);
    
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/consultations/${consultationId}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ text, noteId })
      });
      
      if (res.ok) {
        const data = await res.json();
        setNoteId(data.noteId);
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      } else {
        alert('Failed to save notes.');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred while saving notes.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm flex items-center justify-center min-h-[200px]">
        <Loader2 className="animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="px-6 py-4 bg-neutral-50 border-b border-neutral-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText size={18} className="text-neutral-500" />
          <h2 className="font-semibold text-neutral-900">Clinical Notes (Internal)</h2>
        </div>
        {savedSuccess && (
          <span className="flex items-center gap-1 text-emerald-600 text-xs font-bold uppercase tracking-wider">
            <CheckCircle2 size={14} /> Saved
          </span>
        )}
      </div>
      <div className="p-6">
        <p className="text-xs text-neutral-500 mb-4">
          These notes are private and only visible to authorized clinical staff. Patients cannot see this information.
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter clinical observations, assessment, and plan..."
          className="w-full border border-neutral-200 rounded-xl p-4 text-sm text-neutral-900 focus:outline-none focus:border-neutral-400 focus:ring-1 focus:ring-neutral-400 min-h-[200px] resize-y mb-4"
        />
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving || !text.trim()}
            className="flex items-center gap-2 bg-neutral-900 text-white px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-neutral-800 disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save Notes
          </button>
        </div>
      </div>
    </div>
  );
}

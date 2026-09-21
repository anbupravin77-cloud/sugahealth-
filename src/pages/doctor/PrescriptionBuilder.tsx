import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Loader2, Plus, Trash2, Pill, CheckCircle2, AlertCircle } from 'lucide-react';

interface PrescriptionBuilderProps {
  consultationId: string;
}

interface Medication {
  medicationName: string;
  activeIngredient: string;
  dosageStrength: string;
  pharmaceuticalForm: string;
  quantity: string;
  frequency: string;
  route: string;
  timingInstructions: string;
  duration: string;
  specialInstructions: string;
}

const emptyMedication: Medication = {
  medicationName: '',
  activeIngredient: '',
  dosageStrength: '',
  pharmaceuticalForm: '',
  quantity: '',
  frequency: '',
  route: '',
  timingInstructions: '',
  duration: '',
  specialInstructions: '',
};

export function PrescriptionBuilder({ consultationId }: PrescriptionBuilderProps) {
  const { user } = useAuth();
  
  const [prescriptionId, setPrescriptionId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');
  const [medications, setMedications] = useState<Medication[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const [refillEligible, setRefillEligible] = useState(false);
  const [refillIntervalDays, setRefillIntervalDays] = useState(30);
  const [treatmentCategory, setTreatmentCategory] = useState('');

  const getAuthToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  };

  useEffect(() => {
    async function fetchPrescription() {
      if (!user) return;
      try {
        const token = await getAuthToken();
        const res = await fetch(`/api/consultations/${consultationId}/prescription`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.prescription) {
            setPrescriptionId(data.prescription.id);
            setStatus(data.prescription.status);
            setMedications(data.prescription.medications || []);
            setRefillEligible(Boolean(data.prescription.refillEligible));
            setRefillIntervalDays(Number(data.prescription.refillIntervalDays) || 30);
            setTreatmentCategory(data.prescription.treatmentCategory || '');
          }
        }
      } catch (err) {
        console.error('Error fetching prescription:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchPrescription();
  }, [consultationId, user]);

  const handleAddMedication = () => {
    setMedications([...medications, { ...emptyMedication }]);
  };

  const handleRemoveMedication = (index: number) => {
    setMedications(medications.filter((_, i) => i !== index));
  };

  const handleChange = (index: number, field: keyof Medication, value: string) => {
    const updated = [...medications];
    updated[index][field] = value;
    setMedications(updated);
  };

  const handleSaveDraft = async () => {
    if (!user) return;
    setSaving(true);
    setSavedSuccess(false);
    
    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/consultations/${consultationId}/prescription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ medications, prescriptionId, refillEligible, refillIntervalDays, treatmentCategory })
      });
      
      if (res.ok) {
        const data = await res.json();
        setPrescriptionId(data.prescriptionId);
        setStatus('draft');
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      } else {
        alert('Failed to save prescription draft.');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred while saving prescription.');
    } finally {
      setSaving(false);
    }
  };

  const handleFinalize = async () => {
    if (!user || !prescriptionId) return;
    
    // Validate medications
    const isValid = medications.every(m => m.medicationName && m.dosageStrength && m.quantity && m.frequency);
    if (!isValid) {
      alert("Please complete required medication fields (Name, Strength, Quantity, Frequency) before finalizing.");
      return;
    }
    
    const confirm = window.confirm("Are you sure you want to finalize this prescription? It will be locked and cannot be edited.");
    if (!confirm) return;

    setFinalizing(true);
    try {
      const token = await getAuthToken();
      // Auto-save first
      await fetch(`/api/consultations/${consultationId}/prescription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          medications,
          prescriptionId,
          refillEligible,
          refillIntervalDays,
          treatmentCategory
        })
      });

      const res = await fetch(`/api/consultations/${consultationId}/prescription/finalize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ prescriptionId })
      });
      
      if (res.ok) {
        setStatus('finalized');
      } else {
        alert('Failed to finalize prescription.');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred while finalizing.');
    } finally {
      setFinalizing(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm flex items-center justify-center min-h-[200px]">
        <Loader2 className="animate-spin text-neutral-400" />
      </div>
    );
  }

  const isLocked = status === 'finalized' || status === 'cancelled';

  return (
    <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="px-6 py-4 bg-neutral-50 border-b border-neutral-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Pill size={18} className="text-neutral-500" />
          <h2 className="font-semibold text-neutral-900">Prescription Builder</h2>
        </div>
        <div className="flex items-center gap-4">
          {savedSuccess && (
            <span className="flex items-center gap-1 text-emerald-600 text-xs font-bold uppercase tracking-wider">
              <CheckCircle2 size={14} /> Saved
            </span>
          )}
          {status && (
            <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
              status === 'finalized' ? 'bg-emerald-100 text-emerald-800' : 
              status === 'cancelled' ? 'bg-red-100 text-red-800' :
              'bg-blue-100 text-blue-800'
            }`}>
              {status}
            </span>
          )}
        </div>
      </div>
      
      <div className="p-6 space-y-6">
        
        {isLocked && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl flex items-start gap-3 text-sm">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <p>This prescription has been finalized and cannot be edited. It serves as the authoritative clinical record.</p>
          </div>
        )}

        <div className="space-y-6">
          {medications.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-neutral-200 rounded-xl">
              <p className="text-sm text-neutral-500 mb-3">No medications added yet.</p>
              {!isLocked && (
                <button
                  onClick={handleAddMedication}
                  className="text-xs font-bold uppercase tracking-wider bg-neutral-100 text-neutral-900 px-4 py-2 rounded-lg hover:bg-neutral-200 transition-colors"
                >
                  <Plus size={14} className="inline mr-1 mb-0.5" /> Add Medication
                </button>
              )}
            </div>
          ) : (
            medications.map((med, index) => (
              <div key={index} className="border border-neutral-200 rounded-xl p-5 bg-neutral-50/50">
                <div className="flex items-center justify-between mb-4 border-b border-neutral-200 pb-3">
                  <h3 className="font-bold text-neutral-900">Medication #{index + 1}</h3>
                  {!isLocked && (
                    <button
                      onClick={() => handleRemoveMedication(index)}
                      className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Medication Name *</label>
                    <input
                      type="text"
                      disabled={isLocked}
                      value={med.medicationName}
                      onChange={(e) => handleChange(index, 'medicationName', e.target.value)}
                      placeholder="e.g. Semaglutide"
                      className="w-full border border-neutral-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-neutral-400 disabled:opacity-50 disabled:bg-neutral-100"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Active Ingredient(s)</label>
                    <input
                      type="text"
                      disabled={isLocked}
                      value={med.activeIngredient}
                      onChange={(e) => handleChange(index, 'activeIngredient', e.target.value)}
                      placeholder="e.g. Semaglutide"
                      className="w-full border border-neutral-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-neutral-400 disabled:opacity-50 disabled:bg-neutral-100"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Dosage Strength *</label>
                    <input
                      type="text"
                      disabled={isLocked}
                      value={med.dosageStrength}
                      onChange={(e) => handleChange(index, 'dosageStrength', e.target.value)}
                      placeholder="e.g. 0.25mg"
                      className="w-full border border-neutral-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-neutral-400 disabled:opacity-50 disabled:bg-neutral-100"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Form / Route</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        disabled={isLocked}
                        value={med.pharmaceuticalForm}
                        onChange={(e) => handleChange(index, 'pharmaceuticalForm', e.target.value)}
                        placeholder="Form (e.g. Injection)"
                        className="w-1/2 border border-neutral-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-neutral-400 disabled:opacity-50 disabled:bg-neutral-100"
                      />
                      <input
                        type="text"
                        disabled={isLocked}
                        value={med.route}
                        onChange={(e) => handleChange(index, 'route', e.target.value)}
                        placeholder="Route (e.g. SubQ)"
                        className="w-1/2 border border-neutral-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-neutral-400 disabled:opacity-50 disabled:bg-neutral-100"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Quantity *</label>
                    <input
                      type="text"
                      disabled={isLocked}
                      value={med.quantity}
                      onChange={(e) => handleChange(index, 'quantity', e.target.value)}
                      placeholder="e.g. 1 pen (2mg/1.5mL)"
                      className="w-full border border-neutral-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-neutral-400 disabled:opacity-50 disabled:bg-neutral-100"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Frequency / Timing *</label>
                    <input
                      type="text"
                      disabled={isLocked}
                      value={med.frequency}
                      onChange={(e) => handleChange(index, 'frequency', e.target.value)}
                      placeholder="e.g. Once weekly"
                      className="w-full border border-neutral-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-neutral-400 disabled:opacity-50 disabled:bg-neutral-100"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Sig (Instructions for Patient)</label>
                    <input
                      type="text"
                      disabled={isLocked}
                      value={med.timingInstructions}
                      onChange={(e) => handleChange(index, 'timingInstructions', e.target.value)}
                      placeholder="e.g. Inject 0.25mg subcutaneously once weekly for 4 weeks"
                      className="w-full border border-neutral-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-neutral-400 disabled:opacity-50 disabled:bg-neutral-100"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Special Instructions (Optional)</label>
                    <input
                      type="text"
                      disabled={isLocked}
                      value={med.specialInstructions}
                      onChange={(e) => handleChange(index, 'specialInstructions', e.target.value)}
                      placeholder="e.g. Keep refrigerated."
                      className="w-full border border-neutral-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-neutral-400 disabled:opacity-50 disabled:bg-neutral-100"
                    />
                  </div>
                </div>
              </div>
            ))
          )}
          
          {!isLocked && medications.length > 0 && (
            <button
              onClick={handleAddMedication}
              className="w-full border-2 border-dashed border-neutral-200 text-neutral-600 font-bold uppercase tracking-wider text-xs py-3 rounded-xl hover:bg-neutral-50 hover:border-neutral-300 transition-colors"
            >
              <Plus size={14} className="inline mr-1 mb-0.5" /> Add Another Medication
            </button>
          )}
        </div>

        {!isLocked && (
          <div className="pt-6 border-t border-neutral-100 flex flex-col sm:flex-row justify-end gap-3">
            <button
              onClick={handleSaveDraft}
              disabled={saving || finalizing || medications.length === 0}
              className="px-6 py-3 rounded-lg text-xs font-bold uppercase tracking-wider bg-neutral-100 text-neutral-900 hover:bg-neutral-200 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : 'Save Draft'}
            </button>
            <button
              onClick={handleFinalize}
              disabled={saving || finalizing || medications.length === 0}
              className="px-6 py-3 rounded-lg text-xs font-bold uppercase tracking-wider bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {finalizing ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              Finalize Prescription
            </button>
          </div>
        )}
        
      </div>
    </div>
  );
}

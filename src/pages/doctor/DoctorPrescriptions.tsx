import React, { useState, useEffect } from 'react';
import { SectionHeader } from '../../components/doctor/common/SectionHeader';
import { StatusBadge } from '../../components/doctor/common/StatusBadge';
import { supabase } from '../../lib/supabase';
import {
  Search,
  Plus,
  FileSpreadsheet,
  CheckCircle2,
  Lock,
  FileCheck,
  Save,
  X,
  Clock,
  Printer,
  ShieldCheck,
  Loader2,
  AlertTriangle,
} from 'lucide-react';

export interface LivePrescription {
  id: string;
  consultationId?: string;
  patientId: string;
  patientName: string;
  patientMrn: string;
  medication: string;
  strength: string;
  form: string;
  frequency: string;
  route: string;
  quantity: string;
  refills: number;
  instructions: string;
  status: 'draft' | 'finalized';
  date: string;
  prescribedBy: string;
  pharmacyDestination: string;
}

export default function DoctorPrescriptions() {
  const [prescriptions, setPrescriptions] = useState<LivePrescription[]>([]);
  const [consultations, setConsultations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'draft' | 'finalized'>('all');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedRx, setSelectedRx] = useState<LivePrescription | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form states for new/editing prescription
  const [formConsultationId, setFormConsultationId] = useState('');
  const [formMedication, setFormMedication] = useState('Semaglutide 0.25mg Starter Pen');
  const [formStrength, setFormStrength] = useState('0.25mg / 0.5mL');
  const [formForm, setFormForm] = useState('Pre-filled Multi-Dose Pen');
  const [formFrequency, setFormFrequency] = useState('Once weekly for 4 weeks');
  const [formRoute, setFormRoute] = useState('Subcutaneous');
  const [formQuantity, setFormQuantity] = useState('1 Pen (2mL)');
  const [formRefills, setFormRefills] = useState(1);
  const [formInstructions, setFormInstructions] = useState(
    'Inject 0.25mg subcutaneously into abdomen or thigh once every 7 days on the same day each week.'
  );

  const fetchLivePrescriptions = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      // 1. Fetch prescriptions
      const rxRes = await fetch('/api/clinical/doctor/prescriptions', {
        headers: { Authorization: `Bearer ${token}` },
      });

      // 2. Fetch consultations for patient directory & fallback mapping
      const consultRes = await fetch('/api/clinical/doctor/consultations', {
        headers: { Authorization: `Bearer ${token}` },
      });

      let consultList: any[] = [];
      if (consultRes.ok) {
        const cData = await consultRes.json();
        consultList = cData.consultations || [];
        setConsultations(consultList);
        if (consultList.length > 0 && !formConsultationId) {
          setFormConsultationId(consultList[0].id);
        }
      }

      if (rxRes.ok) {
        const rxData = await rxRes.json();
        const rawRxs: any[] = rxData.prescriptions || [];

        const mapped: LivePrescription[] = rawRxs.map((r) => {
          const matchedConsult = consultList.find((c) => c.id === r.consultation_id);
          const pResponses = matchedConsult?.responses || r.consultation?.responses || {};
          const firstItem = (r.items && r.items[0]) || {};

          return {
            id: r.id,
            consultationId: r.consultation_id,
            patientId: r.patient_id,
            patientName: pResponses.fullName || 'Patient',
            patientMrn: `MRN-${(r.consultation_id || r.id).slice(0, 6).toUpperCase()}`,
            medication: firstItem.medication_name || 'Clinical Prescription',
            strength: firstItem.strength || 'As prescribed',
            form: firstItem.dosage_form || 'Formulation',
            frequency: 'Weekly',
            route: 'Subcutaneous',
            quantity: `${firstItem.quantity || 1} Pen`,
            refills: r.refill_count || 0,
            instructions: r.directions || 'Inject as directed weekly.',
            status: r.status === 'active' || r.status === 'finalized' ? 'finalized' : 'draft',
            date: (r.created_at || '').slice(0, 10) || 'Recent',
            prescribedBy: 'Attending Clinician',
            pharmacyDestination: 'Suga Partner Compounding Pharmacy',
          };
        });

        // Also include approved consultations with medication options that haven't finalized separate table rows
        consultList.forEach((c) => {
          if (c.responses?.medicationOptions?.options?.length > 0 && !mapped.some((m) => m.consultationId === c.id)) {
            const firstOpt = c.responses.medicationOptions.options[0];
            mapped.push({
              id: `rx-${c.id.slice(0, 8)}`,
              consultationId: c.id,
              patientId: c.patient_id,
              patientName: c.responses.fullName || 'Patient Intake',
              patientMrn: `MRN-${c.id.slice(0, 6).toUpperCase()}`,
              medication: firstOpt.name || 'Compounded Protocol',
              strength: firstOpt.strength || 'Standard',
              form: firstOpt.dosageForm || 'Subcutaneous',
              frequency: 'Weekly',
              route: 'Subcutaneous',
              quantity: '1 Unit',
              refills: 1,
              instructions: c.responses.signOff?.treatmentSummary || 'Follow prescribed protocol.',
              status: c.status === 'completed' ? 'finalized' : 'draft',
              date: (c.submitted_at || c.created_at || '').slice(0, 10) || 'Recent',
              prescribedBy: 'Attending Clinician',
              pharmacyDestination: 'Suga Partner Compounding Pharmacy',
            });
          }
        });

        setPrescriptions(mapped);
      }
    } catch (err) {
      console.warn('DoctorPrescriptions fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLivePrescriptions();
  }, []);

  const filteredList = prescriptions.filter((rx) => {
    const matchesSearch =
      rx.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rx.patientMrn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rx.medication.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === 'all' || rx.status === activeTab;
    return matchesSearch && matchesTab;
  });

  const handleSaveDraft = async () => {
    if (!formConsultationId) {
      alert('Please select an active consultation.');
      return;
    }

    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      const res = await fetch(`/api/clinical/consultations/${formConsultationId}/prescription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          directions: formInstructions,
          refillCount: formRefills,
          refillIntervalDays: 30,
          medicationOptions: [
            {
              id: 'med-opt-1',
              name: formMedication,
              strength: formStrength,
              dosageForm: formForm,
              priceInr: 2999,
              description: formInstructions,
            },
          ],
          customClinicianMessage: `Prescribed: ${formMedication}. Follow directions carefully.`,
        }),
      });

      if (res.ok) {
        setIsEditorOpen(false);
        await fetchLivePrescriptions();
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || 'Failed to save prescription.');
      }
    } catch (err: any) {
      alert(err.message || 'Error saving prescription');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFinalizeRx = async (rx: LivePrescription) => {
    if (!rx.consultationId) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      const res = await fetch(`/api/clinical/consultations/${rx.consultationId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          clinicianAttestation: true,
          treatmentSummary: rx.instructions,
        }),
      });

      if (res.ok) {
        await fetchLivePrescriptions();
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || 'Failed to finalize prescription.');
      }
    } catch (err: any) {
      alert(err.message || 'Error finalizing prescription');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* 1. Header */}
      <SectionHeader
        tagline="Electronic Prescribing (EPCS)"
        title="Prescriptions"
        subtitle="Manage active drug regimens, sign digital orders, and monitor partner compounding pharmacy fulfillment."
        badge={`${prescriptions.length} Records`}
        action={
          <button
            onClick={() => {
              setSelectedRx(null);
              setIsEditorOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-stone-900 text-white text-xs font-semibold hover:bg-stone-800 transition-colors shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Electronic Rx</span>
          </button>
        }
      />

      {/* 2. Filter & Tabs */}
      <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by patient, MRN, or medication name..."
              className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-900 placeholder-stone-400 focus:bg-white focus:outline-hidden font-sans"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            {[
              { id: 'all', label: 'All Records' },
              { id: 'draft', label: 'Drafts' },
              { id: 'finalized', label: 'Finalized & Signed' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-stone-900 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Prescription Ledger Table */}
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-2xs">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3 text-stone-500 text-xs">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Loading prescription records...</span>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <FileSpreadsheet className="w-8 h-8 text-stone-300 mx-auto" />
            <p className="text-xs text-stone-500 font-medium">No prescription records found.</p>
            <p className="text-2xs text-stone-400">
              Prescriptions are formulated and electronically authorized directly during consultation intake reviews.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-stone-600">
              <thead className="bg-stone-50/80 text-stone-500 font-semibold border-b border-stone-200 uppercase text-3xs tracking-wider">
                <tr>
                  <th className="py-3 px-4">Rx ID & Date</th>
                  <th className="py-3 px-4">Patient Name & MRN</th>
                  <th className="py-3 px-4">Medication & Strength</th>
                  <th className="py-3 px-4">Refills & Qty</th>
                  <th className="py-3 px-4">Pharmacy Destination</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredList.map((rx) => (
                  <tr key={rx.id} className="hover:bg-stone-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-2xs">
                      <span className="font-semibold text-stone-900 block">{rx.id}</span>
                      <span className="text-stone-400">{rx.date}</span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-stone-900 block">{rx.patientName}</span>
                      <span className="font-mono text-2xs text-stone-400">{rx.patientMrn}</span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-stone-900 block">{rx.medication}</span>
                      <span className="text-2xs text-stone-500">{rx.strength} • {rx.form}</span>
                    </td>

                    <td className="py-3.5 px-4 text-2xs text-stone-700">
                      <div>Refills: {rx.refills}</div>
                      <div className="text-stone-400">Qty: {rx.quantity}</div>
                    </td>

                    <td className="py-3.5 px-4 text-2xs text-stone-500">
                      {rx.pharmacyDestination}
                    </td>

                    <td className="py-3.5 px-4">
                      <StatusBadge status={rx.status} />
                    </td>

                    <td className="py-3.5 px-4 text-right space-x-2">
                      {rx.status === 'draft' ? (
                        <button
                          onClick={() => handleFinalizeRx(rx)}
                          className="px-2.5 py-1 rounded bg-stone-900 hover:bg-stone-800 text-white font-medium text-2xs transition-colors"
                        >
                          Sign & Finalize
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-2xs text-stone-500 font-mono">
                          <Lock className="w-3 h-3 text-emerald-700" />
                          <span>Signed EPCS</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. Prescription Editor Modal */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden space-y-4 p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
                <h3 className="text-base font-semibold text-stone-900 font-sans">
                  Create Electronic Prescription (EPCS)
                </h3>
              </div>
              <button
                onClick={() => setIsEditorOpen(false)}
                className="p-1 rounded-md text-stone-400 hover:text-stone-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="text-2xs font-semibold text-stone-600 uppercase block mb-1">
                  Select Patient Intake
                </label>
                {consultations.length === 0 ? (
                  <p className="text-xs text-stone-400">No active patient consultations available.</p>
                ) : (
                  <select
                    value={formConsultationId}
                    onChange={(e) => setFormConsultationId(e.target.value)}
                    className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-xs font-medium"
                  >
                    {consultations.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.responses?.fullName || 'Patient Intake'} (MRN-{c.id.slice(0, 6).toUpperCase()})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="text-2xs font-semibold text-stone-600 uppercase block mb-1">
                  Medication Name
                </label>
                <input
                  type="text"
                  value={formMedication}
                  onChange={(e) => setFormMedication(e.target.value)}
                  className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="text-2xs font-semibold text-stone-600 uppercase block mb-1">
                  Strength / Dosage
                </label>
                <input
                  type="text"
                  value={formStrength}
                  onChange={(e) => setFormStrength(e.target.value)}
                  className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="text-2xs font-semibold text-stone-600 uppercase block mb-1">
                  Dosage Form
                </label>
                <input
                  type="text"
                  value={formForm}
                  onChange={(e) => setFormForm(e.target.value)}
                  className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="text-2xs font-semibold text-stone-600 uppercase block mb-1">
                  Route
                </label>
                <input
                  type="text"
                  value={formRoute}
                  onChange={(e) => setFormRoute(e.target.value)}
                  className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="text-2xs font-semibold text-stone-600 uppercase block mb-1">
                  Quantity & Refills
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formQuantity}
                    onChange={(e) => setFormQuantity(e.target.value)}
                    placeholder="Qty"
                    className="w-2/3 p-2 bg-stone-50 border border-stone-200 rounded-lg text-xs"
                  />
                  <input
                    type="number"
                    value={formRefills}
                    onChange={(e) => setFormRefills(Number(e.target.value))}
                    placeholder="Refills"
                    className="w-1/3 p-2 bg-stone-50 border border-stone-200 rounded-lg text-xs"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-2xs font-semibold text-stone-600 uppercase block mb-1">
                Patient Instructions (Sig)
              </label>
              <textarea
                rows={2}
                value={formInstructions}
                onChange={(e) => setFormInstructions(e.target.value)}
                className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-xs"
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-stone-200">
              <span className="text-3xs text-stone-400 font-mono">
                Attending: Electronic Prescriber
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-stone-200 text-stone-600 text-xs font-medium hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSaving || consultations.length === 0}
                  onClick={handleSaveDraft}
                  className="px-4 py-1.5 rounded-lg bg-stone-900 text-white text-xs font-semibold hover:bg-stone-800 disabled:opacity-50 flex items-center gap-2"
                >
                  {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Draft Prescription</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

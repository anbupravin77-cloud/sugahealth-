import React, { useState } from 'react';
import {
  MOCK_PRESCRIPTIONS,
  MOCK_PATIENTS,
  PrescriptionRecord,
} from '../../data/doctorMockData';
import { SectionHeader } from '../../components/doctor/common/SectionHeader';
import { StatusBadge } from '../../components/doctor/common/StatusBadge';
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
} from 'lucide-react';

export default function DoctorPrescriptions() {
  const [prescriptions, setPrescriptions] = useState<PrescriptionRecord[]>(MOCK_PRESCRIPTIONS);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'draft' | 'finalized'>('all');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedRx, setSelectedRx] = useState<PrescriptionRecord | null>(null);

  // Form states for new/editing prescription
  const [formPatientId, setFormPatientId] = useState(MOCK_PATIENTS[0].id);
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

  const filteredList = prescriptions.filter((rx) => {
    const matchesSearch =
      rx.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rx.patientMrn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rx.medication.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === 'all' || rx.status === activeTab;
    return matchesSearch && matchesTab;
  });

  const handleSaveDraft = () => {
    const patientObj = MOCK_PATIENTS.find((p) => p.id === formPatientId) || MOCK_PATIENTS[0];
    const newRx: PrescriptionRecord = {
      id: `rx-${Date.now().toString().slice(-4)}`,
      patientId: patientObj.id,
      patientName: patientObj.name,
      patientMrn: patientObj.mrn,
      medication: formMedication,
      strength: formStrength,
      form: formForm,
      frequency: formFrequency,
      route: formRoute,
      quantity: formQuantity,
      refills: formRefills,
      instructions: formInstructions,
      status: 'draft',
      date: new Date().toISOString().split('T')[0],
      prescribedBy: 'Dr. Sarah Mitchell, MD',
      pharmacyDestination: 'Suga Partner Compounding Pharmacy',
    };
    setPrescriptions([newRx, ...prescriptions]);
    setIsEditorOpen(false);
  };

  const handleFinalizeRx = (id: string) => {
    setPrescriptions((prev) =>
      prev.map((rx) =>
        rx.id === id
          ? {
              ...rx,
              status: 'finalized',
              lockedAt: new Date().toISOString(),
            }
          : rx
      )
    );
    if (selectedRx?.id === id) {
      setSelectedRx((prev) => (prev ? { ...prev, status: 'finalized', lockedAt: new Date().toISOString() } : null));
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
                        onClick={() => handleFinalizeRx(rx.id)}
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
                  Select Patient
                </label>
                <select
                  value={formPatientId}
                  onChange={(e) => setFormPatientId(e.target.value)}
                  className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-xs font-medium"
                >
                  {MOCK_PATIENTS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.mrn})
                    </option>
                  ))}
                </select>
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
                Attending: Dr. Sarah Mitchell, MD
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
                  onClick={handleSaveDraft}
                  className="px-4 py-1.5 rounded-lg bg-stone-900 text-white text-xs font-semibold hover:bg-stone-800"
                >
                  Save Draft Prescription
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

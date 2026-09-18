import { useState } from 'react';
import { Doctor } from '../../../types';
import { ImageUploadField } from '../ImageUploadField';
import { Plus, Trash2, Edit2, Check, ArrowLeft } from 'lucide-react';

interface DoctorsTabProps {
  doctors: Doctor[];
  onChange: (doctors: Doctor[]) => void;
}

export function DoctorsTab(props: DoctorsTabProps) {
  const doctors = props?.doctors || [];
  const onChange = props?.onChange || (() => {});
  const [editingIdx, setEditingIdx] = useState<number | null>(null);

  const handleEdit = (idx: number) => {
    setEditingIdx(idx);
  };

  const handleAddDoctor = () => {
    const newDoctor: Doctor = {
      id: `doc-${Date.now()}`,
      name: 'Dr. New Physician, MD',
      role: 'Staff Physician',
      specialty: 'Metabolic Health & Preventive Medicine',
      credentials: 'MD, FACP',
      education: 'Harvard Medical School, MD; Johns Hopkins Residency',
      affiliations: ['American College of Physicians', 'Endocrine Society'],
      licensedStatesCount: 48,
      featuredStates: ['CA', 'NY', 'TX', 'FL', 'IL'],
      boardCertification: 'American Board of Internal Medicine',
      yearsOfExperience: 14,
      bio: 'Board-certified medical practitioner committed to individualized patient care and rigorous clinical protocols.',
      image: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?q=80&w=800&auto=format&fit=crop&grayscale=1',
      quote: 'Medicine should support your biology naturally rather than dictate it.',
    };

    const updated = [newDoctor, ...doctors];
    onChange(updated);
    setEditingIdx(0);
  };

  const handleDelete = (idx: number) => {
    const confirmed = window.confirm("Are you sure you want to remove this clinician from the medical team?");
    if (!confirmed) return;
    const updated = doctors.filter((_, i) => i !== idx);
    onChange(updated);
    if (editingIdx === idx) setEditingIdx(null);
  };

  const updateCurrent = (field: keyof Doctor, val: any) => {
    if (editingIdx === null) return;
    const updated = [...doctors];
    updated[editingIdx] = { ...updated[editingIdx], [field]: val };
    onChange(updated);
  };

  const currentDoctor = editingIdx !== null ? doctors[editingIdx] : null;

  return (
    <div className="space-y-6">
      
      {/* Edit View */}
      {currentDoctor !== null ? (
        <div className="bg-white p-6 rounded-2xl border border-neutral-200 space-y-6">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
            <button
              type="button"
              onClick={() => setEditingIdx(null)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-700 hover:text-neutral-950 transition-colors cursor-pointer"
            >
              <ArrowLeft size={16} /> Back to Medical Board
            </button>
            <button
              type="button"
              onClick={() => setEditingIdx(null)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-neutral-950 text-white text-xs font-bold hover:bg-neutral-800 transition-colors"
            >
              <Check size={14} /> Done Editing Clinician
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">Clinician Full Name</label>
              <input
                type="text"
                value={currentDoctor.name}
                onChange={(e) => updateCurrent('name', e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">Clinical Role</label>
              <input
                type="text"
                value={currentDoctor.role}
                onChange={(e) => updateCurrent('role', e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">Medical Specialty</label>
              <input
                type="text"
                value={currentDoctor.specialty}
                onChange={(e) => updateCurrent('specialty', e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">Credentials</label>
              <input
                type="text"
                value={currentDoctor.credentials}
                onChange={(e) => updateCurrent('credentials', e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">Board Certification</label>
              <input
                type="text"
                value={currentDoctor.boardCertification}
                onChange={(e) => updateCurrent('boardCertification', e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">Years of Experience</label>
              <input
                type="number"
                value={currentDoctor.yearsOfExperience}
                onChange={(e) => updateCurrent('yearsOfExperience', parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">Physician Bio</label>
            <textarea
              rows={3}
              value={currentDoctor.bio}
              onChange={(e) => updateCurrent('bio', e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">Education & Medical Training</label>
            <input
              type="text"
              value={currentDoctor.education}
              onChange={(e) => updateCurrent('education', e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                Professional Affiliations (Comma-separated)
              </label>
              <input
                type="text"
                value={currentDoctor.affiliations.join(', ')}
                onChange={(e) => updateCurrent('affiliations', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                Featured Licensed States (Comma-separated)
              </label>
              <input
                type="text"
                value={currentDoctor.featuredStates.join(', ')}
                onChange={(e) => updateCurrent('featuredStates', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">Physician Quote / Philosophy</label>
            <input
              type="text"
              value={currentDoctor.quote || ''}
              onChange={(e) => updateCurrent('quote', e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 italic"
            />
          </div>

          <ImageUploadField
            label="Physician Headshot Portrait"
            value={currentDoctor.image}
            onChange={(val) => updateCurrent('image', val)}
            description="Professional medical portrait photo."
          />
        </div>
      ) : (
        /* Doctors List Overview */
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-neutral-200">
            <div>
              <h3 className="font-sans text-base font-bold text-neutral-950">Medical Board & Clinical Team</h3>
              <p className="text-xs text-neutral-500">Board-certified physicians reviewing patient intake.</p>
            </div>

            <button
              type="button"
              onClick={handleAddDoctor}
              className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-neutral-950 text-white text-xs font-bold hover:bg-neutral-800 transition-colors cursor-pointer shadow-xs"
            >
              <Plus size={14} /> Add Clinician
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {doctors.map((doc, idx) => (
              <div
                key={doc.id}
                className="bg-white p-5 rounded-2xl border border-neutral-200 hover:border-neutral-950 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="h-44 w-full rounded-xl bg-neutral-100 overflow-hidden mb-4 border border-neutral-200">
                    <img
                      src={doc.image}
                      alt={doc.name}
                      className="h-full w-full object-cover grayscale"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                  <h4 className="font-sans text-base font-bold text-neutral-950">
                    {doc.name}
                  </h4>
                  <p className="text-xs font-semibold text-neutral-700 mt-0.5">{doc.role}</p>
                  <p className="text-[11px] font-mono text-neutral-400 mt-0.5">{doc.credentials}</p>
                  <p className="text-xs text-neutral-600 mt-2 line-clamp-2 leading-relaxed">{doc.bio}</p>
                </div>

                <div className="pt-4 mt-4 border-t border-neutral-100 flex items-center justify-between">
                  <span className="text-[11px] text-neutral-500 font-medium truncate max-w-[140px]">{doc.specialty}</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleEdit(idx)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold text-neutral-700 hover:bg-neutral-100 transition-colors"
                    >
                      <Edit2 size={13} /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(idx)}
                      className="p-1 rounded text-neutral-400 hover:text-red-600 transition-colors"
                      title="Delete doctor"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}

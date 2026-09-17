import { Plus, Trash2 } from "lucide-react";
import { WeightLossPageContent } from '../../../types/content';
import { ImageUploadField } from '../ImageUploadField';

interface WeightLossTabProps {
  data: WeightLossPageContent;
  onChange: (updated: WeightLossPageContent) => void;
}

export function WeightLossTab(props: WeightLossTabProps) {
  const data = props?.data || ({} as any);
  const onChange = props?.onChange || (() => {});

  const addPillar = () => {
    onChange({ ...data, pillars: [...data.pillars, { title: 'New Pillar', desc: 'Desc', icon: 'Star' }] });
  };
  const removePillar = (idx: number) => {
    onChange({ ...data, pillars: data.pillars.filter((_, i) => i !== idx) });
  };
  const addMedication = () => {
    onChange({ ...data, medications: [...data.medications, { name: 'New Med', subtitle: 'Sub', description: 'Desc', benefits: ['Benefit'] }] });
  };
  const removeMedication = (idx: number) => {
    onChange({ ...data, medications: data.medications.filter((_, i) => i !== idx) });
  };
  const addBenefit = (mIdx: number) => {
    const updated = [...data.medications];
    updated[mIdx].benefits.push('New Benefit');
    onChange({ ...data, medications: updated });
  };
  const removeBenefit = (mIdx: number, bIdx: number) => {
    const updated = [...data.medications];
    updated[mIdx].benefits = updated[mIdx].benefits.filter((_, i) => i !== bIdx);
    onChange({ ...data, medications: updated });
  };

  const updatePillar = (idx: number, field: string, val: string) => {
    const updated = [...data.pillars];
    updated[idx] = { ...updated[idx], [field]: val };
    onChange({ ...data, pillars: updated });
  };

  const updateMedication = (idx: number, field: string, val: any) => {
    const updated = [...data.medications];
    updated[idx] = { ...updated[idx], [field]: val };
    onChange({ ...data, medications: updated });
  };

  const updateMedBenefit = (medIdx: number, bIdx: number, val: string) => {
    const updated = [...data.medications];
    const bnf = [...updated[medIdx].benefits];
    bnf[bIdx] = val;
    updated[medIdx] = { ...updated[medIdx], benefits: bnf };
    onChange({ ...data, medications: updated });
  };

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="bg-white p-6 rounded-2xl border border-neutral-200 space-y-4">
        <h3 className="font-sans text-base font-bold text-neutral-950">Page Header</h3>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">Header Title</label>
          <input
            type="text"
            value={data.header.title}
            onChange={(e) => onChange({ ...data, header: { ...data.header, title: e.target.value } })}
            className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300"
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">Header Subtitle</label>
          <textarea
            rows={2}
            value={data.header.subtitle}
            onChange={(e) => onChange({ ...data, header: { ...data.header, subtitle: e.target.value } })}
            className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300"
          />
        </div>
        <ImageUploadField
          label="Header Background Image"
          value={data.header.image}
          onChange={(val) => onChange({ ...data, header: { ...data.header, image: val } })}
        />
      </div>

      {/* Science & Left Sticky Callout */}
      <div className="bg-white p-6 rounded-2xl border border-neutral-200 space-y-4">
        <h3 className="font-sans text-base font-bold text-neutral-950">Science & Clinical Intro</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">Eyebrow</label>
            <input
              type="text"
              value={data.science.eyebrow}
              onChange={(e) => onChange({ ...data, science: { ...data.science, eyebrow: e.target.value } })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">Title</label>
            <input
              type="text"
              value={data.science.title}
              onChange={(e) => onChange({ ...data, science: { ...data.science, title: e.target.value } })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">Description Paragraph</label>
          <textarea
            rows={3}
            value={data.science.description}
            onChange={(e) => onChange({ ...data, science: { ...data.science, description: e.target.value } })}
            className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300"
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">Clinical Fact Callout</label>
          <textarea
            rows={2}
            value={data.science.clinicalFact}
            onChange={(e) => onChange({ ...data, science: { ...data.science, clinicalFact: e.target.value } })}
            className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300"
          />
        </div>
      </div>

      {/* 3 Core Pillars */}
      <div className="bg-white p-6 rounded-2xl border border-neutral-200 space-y-4">
        <h3 className="font-sans text-base font-bold text-neutral-950">Core Biological Pillars</h3>
        {data.pillars.map((pil, idx) => (
          <div key={idx} className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-3">
            <span className="text-xs font-bold text-neutral-500 uppercase">Pillar {pil.num}</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-neutral-600 mb-1">Tag Pill</label>
                <input
                  type="text"
                  value={pil.tag}
                  onChange={(e) => updatePillar(idx, 'tag', e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded border border-neutral-300 bg-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-neutral-600 mb-1">Pillar Title</label>
                <input
                  type="text"
                  value={pil.title}
                  onChange={(e) => updatePillar(idx, 'title', e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded border border-neutral-300 bg-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-neutral-600 mb-1">Pillar Description</label>
              <textarea
                rows={2}
                value={pil.desc}
                onChange={(e) => updatePillar(idx, 'desc', e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded border border-neutral-300 bg-white"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Medication Formulations */}
      <div className="bg-white p-6 rounded-2xl border border-neutral-200 space-y-4">
        <h3 className="font-sans text-base font-bold text-neutral-950">Medication Formulations</h3>
        {data.medications.map((med, idx) => (
          <div key={idx} className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-neutral-600 mb-1">Medication Title</label>
                <input
                  type="text"
                  value={med.title}
                  onChange={(e) => updateMedication(idx, 'title', e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded border border-neutral-300 bg-white font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-neutral-600 mb-1">Category Tag</label>
                <input
                  type="text"
                  value={med.tag}
                  onChange={(e) => updateMedication(idx, 'tag', e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded border border-neutral-300 bg-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-neutral-600 mb-1">Description</label>
              <textarea
                rows={2}
                value={med.desc}
                onChange={(e) => updateMedication(idx, 'desc', e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded border border-neutral-300 bg-white"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-neutral-600 mb-1">Clinical Benefits (3 Points)</label>
              <div className="space-y-1.5">
                {med.benefits.map((bnf, bIdx) => (
                  <div key={bIdx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={bnf}
                      onChange={(e) => updateMedBenefit(idx, bIdx, e.target.value)}
                      className="w-full px-2.5 py-1 text-xs rounded border border-neutral-300 bg-white"
                    />
                    <button type="button" onClick={() => removeBenefit(idx, bIdx)} className="text-red-500"><Trash2 size={14}/></button>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[10px] font-bold uppercase text-neutral-600 mb-1">Button Text</label>
                <input
                  type="text"
                  value={med.buttonText}
                  onChange={(e) => updateMedication(idx, 'buttonText', e.target.value)}
                  className="w-full px-2.5 py-1 text-xs rounded border border-neutral-300 bg-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-neutral-600 mb-1">Button Link</label>
                <input
                  type="text"
                  value={med.buttonLink}
                  onChange={(e) => updateMedication(idx, 'buttonLink', e.target.value)}
                  className="w-full px-2.5 py-1 text-xs rounded border border-neutral-300 bg-white font-mono"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Comparison Section Header */}
      <div className="bg-white p-6 rounded-2xl border border-neutral-200 space-y-4">
        <h3 className="font-sans text-base font-bold text-neutral-950">Comparison Section Intro</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">Eyebrow</label>
            <input
              type="text"
              value={data.comparison.eyebrow}
              onChange={(e) => onChange({ ...data, comparison: { ...data.comparison, eyebrow: e.target.value } })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">Title</label>
            <input
              type="text"
              value={data.comparison.title}
              onChange={(e) => onChange({ ...data, comparison: { ...data.comparison, title: e.target.value } })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">Description</label>
          <input
            type="text"
            value={data.comparison.description}
            onChange={(e) => onChange({ ...data, comparison: { ...data.comparison, description: e.target.value } })}
            className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300"
          />
        </div>
      </div>

      {/* CTA Footer */}
      <div className="bg-white p-6 rounded-2xl border border-neutral-200 space-y-4">
        <h3 className="font-sans text-base font-bold text-neutral-950">Bottom CTA Banner</h3>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">Title</label>
          <input
            type="text"
            value={data.ctaBanner.title}
            onChange={(e) => onChange({ ...data, ctaBanner: { ...data.ctaBanner, title: e.target.value } })}
            className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300"
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">Description</label>
          <textarea
            rows={2}
            value={data.ctaBanner.description}
            onChange={(e) => onChange({ ...data, ctaBanner: { ...data.ctaBanner, description: e.target.value } })}
            className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">Button Text</label>
            <input
              type="text"
              value={data.ctaBanner.buttonText}
              onChange={(e) => onChange({ ...data, ctaBanner: { ...data.ctaBanner, buttonText: e.target.value } })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">Button Link</label>
            <input
              type="text"
              value={data.ctaBanner.buttonLink}
              onChange={(e) => onChange({ ...data, ctaBanner: { ...data.ctaBanner, buttonLink: e.target.value } })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 font-mono"
            />
          </div>
        </div>
      </div>

    </div>
  );
}

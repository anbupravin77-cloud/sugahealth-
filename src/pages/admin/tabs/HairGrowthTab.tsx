import { HairGrowthPageContent } from '../../../types/content';
import { ImageUploadField } from '../ImageUploadField';
import { Plus, Trash2 } from 'lucide-react';

interface HairGrowthTabProps {
  data: HairGrowthPageContent;
  onChange: (updated: HairGrowthPageContent) => void;
}

export function HairGrowthTab(props: HairGrowthTabProps) {
  const data = props?.data || ({} as any);
  const onChange = props?.onChange || (() => {});

  const addPillar = () => {
    const num = `0${(data.pillars?.length || 0) + 1}`;
    onChange({
      ...data,
      pillars: [
        ...(data.pillars || []),
        { num, tag: 'FOLLICULAR', title: 'New Biological Pillar', desc: 'Clinical explanation of hair growth mechanism.' }
      ]
    });
  };
  const removePillar = (idx: number) => {
    onChange({ ...data, pillars: (data.pillars || []).filter((_, i) => i !== idx) });
  };
  const addGrowthCycle = () => {
    onChange({ ...data, growthCycle: [...data.growthCycle, { phase: 'New Phase', time: 'Time', desc: 'Desc' }] });
  };
  const removeGrowthCycle = (idx: number) => {
    onChange({ ...data, growthCycle: data.growthCycle.filter((_, i) => i !== idx) });
  };

  const updatePillar = (idx: number, field: string, val: string) => {
    const updated = [...data.pillars];
    updated[idx] = { ...updated[idx], [field]: val };
    onChange({ ...data, pillars: updated });
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
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

      {/* Science */}
      <div className="bg-white p-6 rounded-2xl border border-neutral-200 space-y-4">
        <h3 className="font-sans text-base font-bold text-neutral-950">Science & Follicular Biology</h3>
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

      {/* Pillars */}
      <div className="bg-white p-6 rounded-2xl border border-neutral-200 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-sans text-base font-bold text-neutral-950">Core Biological Pillars</h3>
            <p className="text-xs text-neutral-500">Key physiological pillars supporting hair regeneration.</p>
          </div>
          <button
            type="button"
            onClick={addPillar}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-neutral-950 text-white text-xs font-bold hover:bg-neutral-800 transition-colors cursor-pointer shadow-xs"
          >
            <Plus size={14} /> Add Pillar
          </button>
        </div>
        {data.pillars.map((pil, idx) => (
          <div key={idx} className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-500 uppercase">Pillar {pil.num}</span>
              <button
                type="button"
                onClick={() => removePillar(idx)}
                className="text-neutral-400 hover:text-red-600 transition-colors p-1 cursor-pointer"
                title="Remove pillar"
              >
                <Trash2 size={14} />
              </button>
            </div>
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

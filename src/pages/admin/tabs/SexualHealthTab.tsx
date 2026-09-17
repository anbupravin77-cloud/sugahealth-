import { Plus, Trash2 } from "lucide-react";
import { SexualHealthPageContent } from '../../../types/content';
import { ImageUploadField } from '../ImageUploadField';

interface SexualHealthTabProps {
  data: SexualHealthPageContent;
  onChange: (updated: SexualHealthPageContent) => void;
}

export function SexualHealthTab(props: SexualHealthTabProps) {
  const data = props?.data || ({} as any);
  const onChange = props?.onChange || (() => {});

  const addCondition = () => {
    onChange({ ...data, conditions: [...data.conditions, { title: 'New Condition', desc: 'Desc' }] });
  };
  const removeCondition = (idx: number) => {
    onChange({ ...data, conditions: data.conditions.filter((_, i) => i !== idx) });
  };
  const addCardioPara = () => {
    onChange({ ...data, cardiovascular: { ...data.cardiovascular, paragraphs: [...data.cardiovascular.paragraphs, 'New Paragraph'] } });
  };
  const removeCardioPara = (idx: number) => {
    onChange({ ...data, cardiovascular: { ...data.cardiovascular, paragraphs: data.cardiovascular.paragraphs.filter((_, i) => i !== idx) } });
  };
  const addPrivacy = () => {
    onChange({ ...data, privacy: [...data.privacy, { title: 'New Title', desc: 'Desc' }] });
  };
  const removePrivacy = (idx: number) => {
    onChange({ ...data, privacy: data.privacy.filter((_, i) => i !== idx) });
  };

  const updateCondition = (idx: number, field: string, val: string) => {
    const updated = [...data.conditions];
    updated[idx] = { ...updated[idx], [field]: val };
    onChange({ ...data, conditions: updated });
  };

  const updateCardioParagraph = (idx: number, val: string) => {
    const p = [...data.cardiovascular.paragraphs];
    p[idx] = val;
    onChange({
      ...data,
      cardiovascular: { ...data.cardiovascular, paragraphs: p },
    });
  };

  const updatePrivacy = (idx: number, field: 'title' | 'desc', val: string) => {
    const priv = [...data.privacy];
    priv[idx] = { ...priv[idx], [field]: val };
    onChange({ ...data, privacy: priv });
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

      {/* Conditions / Targeted Treatment Pathways */}
      <div className="bg-white p-6 rounded-2xl border border-neutral-200 space-y-4">
        <h3 className="font-sans text-base font-bold text-neutral-950">Conditions & Clinical Pathways</h3>
        {data.conditions.map((cond, idx) => (
          <div key={idx} className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-neutral-600 mb-1">Condition / Pathway Title</label>
                <input
                  type="text"
                  value={cond.title}
                  onChange={(e) => updateCondition(idx, 'title', e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded border border-neutral-300 bg-white font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-neutral-600 mb-1">Clinical Stat</label>
                <input
                  type="text"
                  value={cond.stat}
                  onChange={(e) => updateCondition(idx, 'stat', e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded border border-neutral-300 bg-white font-mono"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-neutral-600 mb-1">Description</label>
              <textarea
                rows={2}
                value={cond.desc}
                onChange={(e) => updateCondition(idx, 'desc', e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded border border-neutral-300 bg-white"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-neutral-600 mb-1">Formulations & Medications</label>
              <input
                type="text"
                value={cond.meds}
                onChange={(e) => updateCondition(idx, 'meds', e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded border border-neutral-300 bg-white font-mono text-neutral-700"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[10px] font-bold uppercase text-neutral-600 mb-1">Button Text</label>
                <input
                  type="text"
                  value={cond.buttonText}
                  onChange={(e) => updateCondition(idx, 'buttonText', e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded border border-neutral-300 bg-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-neutral-600 mb-1">Button Link</label>
                <input
                  type="text"
                  value={cond.buttonLink}
                  onChange={(e) => updateCondition(idx, 'buttonLink', e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded border border-neutral-300 bg-white font-mono"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Cardiovascular Health Callout */}
      <div className="bg-white p-6 rounded-2xl border border-neutral-200 space-y-4">
        <h3 className="font-sans text-base font-bold text-neutral-950">Cardiovascular Health Section</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">Eyebrow</label>
            <input
              type="text"
              value={data.cardiovascular.eyebrow}
              onChange={(e) => onChange({
                ...data,
                cardiovascular: { ...data.cardiovascular, eyebrow: e.target.value },
              })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">Title</label>
            <input
              type="text"
              value={data.cardiovascular.title}
              onChange={(e) => onChange({
                ...data,
                cardiovascular: { ...data.cardiovascular, title: e.target.value },
              })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700">Paragraphs</label>
          {data.cardiovascular.paragraphs.map((para, pIdx) => (
            <div key={pIdx} className="flex gap-2 mb-2 items-start relative">
              <textarea
                rows={2}
                value={para}
                onChange={(e) => updateCardioParagraph(pIdx, e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 leading-relaxed pr-8"
              />
              <button type="button" onClick={() => removeCardioPara(pIdx)} className="absolute top-2 right-2 text-red-500"><Trash2 size={16}/></button>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div>
            <label className="block text-[10px] font-bold uppercase text-neutral-600 mb-1">Stat Number</label>
            <input
              type="text"
              value={data.cardiovascular.statNumber}
              onChange={(e) => onChange({
                ...data,
                cardiovascular: { ...data.cardiovascular, statNumber: e.target.value },
              })}
              className="w-full px-3 py-1.5 text-xs rounded border border-neutral-300 font-bold"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-neutral-600 mb-1">Stat Label</label>
            <input
              type="text"
              value={data.cardiovascular.statLabel}
              onChange={(e) => onChange({
                ...data,
                cardiovascular: { ...data.cardiovascular, statLabel: e.target.value },
              })}
              className="w-full px-3 py-1.5 text-xs rounded border border-neutral-300"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-neutral-600 mb-1">Stat Description</label>
            <input
              type="text"
              value={data.cardiovascular.statDesc}
              onChange={(e) => onChange({
                ...data,
                cardiovascular: { ...data.cardiovascular, statDesc: e.target.value },
              })}
              className="w-full px-3 py-1.5 text-xs rounded border border-neutral-300"
            />
          </div>
        </div>
      </div>

      {/* Discretion & Privacy */}
      <div className="bg-white p-6 rounded-2xl border border-neutral-200 space-y-4">
        <h3 className="font-sans text-base font-bold text-neutral-950">Patient Discretion & Packaging</h3>
        {data.privacy.map((pr, idx) => (
          <div key={idx} className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2">
            <div>
              <label className="block text-[10px] font-bold uppercase text-neutral-600 mb-1">Feature Title</label>
              <input
                type="text"
                value={pr.title}
                onChange={(e) => updatePrivacy(idx, 'title', e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded border border-neutral-300 bg-white font-bold"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-neutral-600 mb-1">Feature Description</label>
              <textarea
                rows={2}
                value={pr.desc}
                onChange={(e) => updatePrivacy(idx, 'desc', e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded border border-neutral-300 bg-white leading-relaxed"
              />
            </div>
          </div>
        ))}
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

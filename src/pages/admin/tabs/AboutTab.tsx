import { Plus, Trash2 } from "lucide-react";
import { AboutPageContent } from '../../../types/content';
import { ImageUploadField } from '../ImageUploadField';

interface AboutTabProps {
  data: AboutPageContent;
  onChange: (updated: AboutPageContent) => void;
}

export function AboutTab(props: AboutTabProps) {
  const data = props?.data || ({} as any);
  const onChange = props?.onChange || (() => {});
  const updateStandard = (idx: number, field: string, val: string) => {
    const updated = [...data.standards];
    updated[idx] = { ...updated[idx], [field]: val };
    onChange({ ...data, standards: updated });
  };

  const updateSafety = (idx: number, field: string, val: string) => {
    const updated = [...data.safety];
    updated[idx] = { ...updated[idx], [field]: val };
    onChange({ ...data, safety: updated });
  };

  const updateMetric = (idx: number, field: string, val: any) => {
    const updated = [...data.metrics];
    updated[idx] = { ...updated[idx], [field]: val };
    onChange({ ...data, metrics: updated });
  };

  const addMissionPara = () => {
    onChange({ ...data, mission: { ...data.mission, paragraphs: [...data.mission.paragraphs, 'New paragraph'] } });
  };
  const removeMissionPara = (idx: number) => {
    onChange({ ...data, mission: { ...data.mission, paragraphs: data.mission.paragraphs.filter((_, i) => i !== idx) } });
  };
  const updateMissionParagraph = (idx: number, val: string) => {
    const p = [...data.mission.paragraphs];
    p[idx] = val;
    onChange({
      ...data,
      mission: { ...data.mission, paragraphs: p },
    });
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

      {/* Mission & "Live naturally" Philosophy */}
      <div className="bg-white p-6 rounded-2xl border border-neutral-200 space-y-4">
        <h3 className="font-sans text-base font-bold text-neutral-950">Mission & "Live Naturally" Philosophy</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">Eyebrow</label>
            <input
              type="text"
              value={data.mission.eyebrow}
              onChange={(e) => onChange({ ...data, mission: { ...data.mission, eyebrow: e.target.value } })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">Title</label>
            <input
              type="text"
              value={data.mission.title}
              onChange={(e) => onChange({ ...data, mission: { ...data.mission, title: e.target.value } })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">Subtitle</label>
          <input
            type="text"
            value={data.mission.subtitle}
            onChange={(e) => onChange({ ...data, mission: { ...data.mission, subtitle: e.target.value } })}
            className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300"
          />
        </div>

        <div className="space-y-3 pt-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700">
            Mission Paragraphs (3 Paragraphs)
          </label>
          <div className="flex justify-end mb-2"><button type="button" onClick={addMissionPara} className="text-xs flex items-center gap-1 text-neutral-500"><Plus size={14}/> Add Paragraph</button></div>
          {data.mission.paragraphs.map((p, idx) => (
            <div key={idx} className="relative mb-3">
              <span className="text-[10px] text-neutral-400 font-bold uppercase block mb-1">Paragraph {idx + 1}</span>
              <textarea
                rows={3}
                value={p}
                onChange={(e) => updateMissionParagraph(idx, e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 leading-relaxed pr-8"
              />
              <button type="button" onClick={() => removeMissionPara(idx)} className="absolute top-6 right-2 text-red-500"><Trash2 size={14}/></button>
            </div>
          ))}
        </div>
      </div>

      {/* 3 Standards */}
      <div className="bg-white p-6 rounded-2xl border border-neutral-200 space-y-4">
        <h3 className="font-sans text-base font-bold text-neutral-950">Practice Standards (3 Pillars)</h3>
        <div className="space-y-3">
          {data.standards.map((st, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2">
              <label className="block text-[10px] font-bold uppercase text-neutral-500">Standard #{idx + 1}</label>
              <input
                type="text"
                value={st.title}
                onChange={(e) => updateStandard(idx, 'title', e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded border border-neutral-300 bg-white font-bold"
              />
              <textarea
                rows={2}
                value={st.desc}
                onChange={(e) => updateStandard(idx, 'desc', e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded border border-neutral-300 bg-white"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Safety & Compliance */}
      <div className="bg-white p-6 rounded-2xl border border-neutral-200 space-y-4">
        <h3 className="font-sans text-base font-bold text-neutral-950">Safety Standards & Compliance</h3>
        <div className="space-y-3">
          {data.safety.map((sf, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2">
              <label className="block text-[10px] font-bold uppercase text-neutral-500">Requirement #{idx + 1}</label>
              <input
                type="text"
                value={sf.title}
                onChange={(e) => updateSafety(idx, 'title', e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded border border-neutral-300 bg-white font-bold"
              />
              <textarea
                rows={2}
                value={sf.desc}
                onChange={(e) => updateSafety(idx, 'desc', e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded border border-neutral-300 bg-white"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Metrics */}
      <div className="bg-white p-6 rounded-2xl border border-neutral-200 space-y-4">
        <h3 className="font-sans text-base font-bold text-neutral-950">Trust & Quality Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {data.metrics.map((m, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2">
              <div className="flex gap-1">
                <input
                  type="text"
                  placeholder="Prefix"
                  value={m.prefix || ''}
                  onChange={(e) => updateMetric(idx, 'prefix', e.target.value)}
                  className="w-1/3 px-2 py-1 text-xs rounded border border-neutral-300 bg-white"
                />
                <input
                  type="number"
                  value={m.value}
                  onChange={(e) => updateMetric(idx, 'value', parseFloat(e.target.value) || 0)}
                  className="w-1/3 px-2 py-1 text-xs rounded border border-neutral-300 bg-white font-bold"
                />
                <input
                  type="text"
                  placeholder="Suffix"
                  value={m.suffix || ''}
                  onChange={(e) => updateMetric(idx, 'suffix', e.target.value)}
                  className="w-1/3 px-2 py-1 text-xs rounded border border-neutral-300 bg-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-neutral-500 mb-1">Title</label>
                <input
                  type="text"
                  value={m.title}
                  onChange={(e) => updateMetric(idx, 'title', e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded border border-neutral-300 bg-white font-semibold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-neutral-500 mb-1">Description</label>
                <input
                  type="text"
                  value={m.desc}
                  onChange={(e) => updateMetric(idx, 'desc', e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded border border-neutral-300 bg-white"
                />
              </div>
            </div>
          ))}
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

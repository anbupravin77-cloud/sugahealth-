const fs = require("fs");
let content = fs.readFileSync("src/pages/admin/tabs/AboutTab.tsx", "utf8");

const addFunctions = `
  const addMissionPara = () => {
    onChange({ ...data, mission: { ...data.mission, paragraphs: [...data.mission.paragraphs, 'New paragraph'] } });
  };
  const removeMissionPara = (idx: number) => {
    onChange({ ...data, mission: { ...data.mission, paragraphs: data.mission.paragraphs.filter((_, i) => i !== idx) } });
  };
  const addStandard = () => {
    onChange({ ...data, standards: [...data.standards, { title: 'New Standard', desc: 'Desc' }] });
  };
  const removeStandard = (idx: number) => {
    onChange({ ...data, standards: data.standards.filter((_, i) => i !== idx) });
  };
  const addSafety = () => {
    onChange({ ...data, safety: [...data.safety, { title: 'New Safety', desc: 'Desc' }] });
  };
  const removeSafety = (idx: number) => {
    onChange({ ...data, safety: data.safety.filter((_, i) => i !== idx) });
  };
  const addMetric = () => {
    onChange({ ...data, metrics: [...data.metrics, { value: '0', label: 'Metric' }] });
  };
  const removeMetric = (idx: number) => {
    onChange({ ...data, metrics: data.metrics.filter((_, i) => i !== idx) });
  };
`;

content = content.replace("  const updateMissionPara = ", addFunctions + "\n  const updateMissionPara = ");

// mission paragraphs
content = content.replace(
  /<label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">\s*Mission Paragraphs\s*<\/label>/,
  `<div className="flex justify-between items-center mb-1">
      <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700">Mission Paragraphs</label>
      <button type="button" onClick={addMissionPara} className="text-[10px] font-bold text-neutral-900"><Plus size={12} className="inline mr-1"/>Add Paragraph</button>
    </div>`
);
content = content.replace(
  /{data\.mission\.paragraphs\.map\(\(p, idx\) => \(\s*<textarea/,
  `{data.mission.paragraphs.map((p, idx) => (
            <div key={idx} className="flex gap-2 mb-2 items-start relative">
              <textarea`
);
content = content.replace(
  /{data\.mission\.paragraphs\.map\(\(p, idx\) => \(\s*<div key={idx} className="flex gap-2 mb-2 items-start relative">\s*<textarea[\s\S]*?onChange=\{\(e\) => updateMissionPara\(idx, e\.target\.value\)\}\s*className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 leading-relaxed"\s*\/>\s*\)\)}/,
  `{data.mission.paragraphs.map((p, idx) => (
            <div key={idx} className="flex gap-2 mb-2 items-start relative">
              <textarea
                rows={3}
                value={p}
                onChange={(e) => updateMissionPara(idx, e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 leading-relaxed pr-8"
              />
              <button type="button" onClick={() => removeMissionPara(idx)} className="absolute top-2 right-2 text-red-500"><Trash2 size={16}/></button>
            </div>
          ))}`
);

// standards
content = content.replace(
  /<h3 className="font-sans text-base font-bold text-neutral-950 mb-1">\s*Medical Standards\s*<\/h3>/,
  `<div className="flex justify-between items-center mb-1">
      <h3 className="font-sans text-base font-bold text-neutral-950">Medical Standards</h3>
      <button type="button" onClick={addStandard} className="text-xs font-bold bg-neutral-900 text-white px-3 py-1 rounded"><Plus size={14} className="inline mr-1"/>Add</button>
    </div>`
);
content = content.replace(
  /{data\.standards\.map\(\(st, idx\) => \(\s*<div key={idx} className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-3">/,
  `{data.standards.map((st, idx) => (
      <div key={idx} className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-3 relative">
        <button type="button" onClick={() => removeStandard(idx)} className="absolute top-2 right-2 text-red-500"><Trash2 size={16}/></button>`
);

// safety
content = content.replace(
  /<h3 className="font-sans text-base font-bold text-neutral-950 mb-1">\s*Safety Protocols\s*<\/h3>/,
  `<div className="flex justify-between items-center mb-1">
      <h3 className="font-sans text-base font-bold text-neutral-950">Safety Protocols</h3>
      <button type="button" onClick={addSafety} className="text-xs font-bold bg-neutral-900 text-white px-3 py-1 rounded"><Plus size={14} className="inline mr-1"/>Add</button>
    </div>`
);
content = content.replace(
  /{data\.safety\.map\(\(sf, idx\) => \(\s*<div key={idx} className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-3">/,
  `{data.safety.map((sf, idx) => (
      <div key={idx} className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-3 relative">
        <button type="button" onClick={() => removeSafety(idx)} className="absolute top-2 right-2 text-red-500"><Trash2 size={16}/></button>`
);

// metrics
content = content.replace(
  /<h3 className="font-sans text-base font-bold text-neutral-950 mb-1">\s*Impact Metrics\s*<\/h3>/,
  `<div className="flex justify-between items-center mb-1">
      <h3 className="font-sans text-base font-bold text-neutral-950">Impact Metrics</h3>
      <button type="button" onClick={addMetric} className="text-xs font-bold bg-neutral-900 text-white px-3 py-1 rounded"><Plus size={14} className="inline mr-1"/>Add</button>
    </div>`
);
content = content.replace(
  /{data\.metrics\.map\(\(m, idx\) => \(\s*<div key={idx} className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-3">/,
  `{data.metrics.map((m, idx) => (
      <div key={idx} className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-3 relative">
        <button type="button" onClick={() => removeMetric(idx)} className="absolute top-2 right-2 text-red-500"><Trash2 size={16}/></button>`
);

if (!content.includes('Trash2')) {
  content = content.replace("import { useState } from 'react';", "import { useState } from 'react';\nimport { Plus, Trash2 } from 'lucide-react';");
}
fs.writeFileSync("src/pages/admin/tabs/AboutTab.tsx", content);
console.log("AboutTab updated");

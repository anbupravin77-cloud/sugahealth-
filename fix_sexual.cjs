const fs = require("fs");
let content = fs.readFileSync("src/pages/admin/tabs/SexualHealthTab.tsx", "utf8");

const addFunctions = `
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
`;

content = content.replace("  const updateCondition = ", addFunctions + "\n  const updateCondition = ");

// conditions
content = content.replace(
  /<h3 className="font-sans text-base font-bold text-neutral-950">Treatable Conditions<\/h3>/,
  `<div className="flex justify-between items-center">
      <h3 className="font-sans text-base font-bold text-neutral-950">Treatable Conditions</h3>
      <button type="button" onClick={addCondition} className="text-xs font-bold bg-neutral-900 text-white px-3 py-1 rounded"><Plus size={14} className="inline mr-1"/>Add</button>
    </div>`
);
content = content.replace(
  /{data\.conditions\.map\(\(cond, idx\) => \(\s*<div key={idx} className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 grid grid-cols-1 md:grid-cols-2 gap-4">/,
  `{data.conditions.map((cond, idx) => (
      <div key={idx} className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 grid grid-cols-1 md:grid-cols-2 gap-4 relative">
        <button type="button" onClick={() => removeCondition(idx)} className="absolute top-2 right-2 text-red-500"><Trash2 size={16}/></button>`
);

// cardio
content = content.replace(
  /<label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">\s*Paragraphs\s*<\/label>/,
  `<div className="flex justify-between items-center mb-1">
      <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700">Paragraphs</label>
      <button type="button" onClick={addCardioPara} className="text-[10px] font-bold text-neutral-900"><Plus size={12} className="inline mr-1"/>Add Paragraph</button>
    </div>`
);
content = content.replace(
  /{data\.cardiovascular\.paragraphs\.map\(\(para, pIdx\) => \(\s*<textarea/,
  `{data.cardiovascular.paragraphs.map((para, pIdx) => (
            <div key={pIdx} className="flex gap-2 mb-2">
              <textarea`
);
content = content.replace(
  /{data\.cardiovascular\.paragraphs\.map\(\(para, pIdx\) => \(\s*<div key={pIdx} className="flex gap-2 mb-2">\s*<textarea[\s\S]*?onChange=\{\(e\) => updateCardioPara\(pIdx, e\.target\.value\)\}\s*className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 leading-relaxed"\s*\/>\s*\)\)}/,
  `{data.cardiovascular.paragraphs.map((para, pIdx) => (
            <div key={pIdx} className="flex gap-2 mb-2 items-start relative">
              <textarea
                rows={3}
                value={para}
                onChange={(e) => updateCardioPara(pIdx, e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 leading-relaxed pr-8"
              />
              <button type="button" onClick={() => removeCardioPara(pIdx)} className="absolute top-2 right-2 text-red-500"><Trash2 size={16}/></button>
            </div>
          ))}`
);

// privacy
content = content.replace(
  /<h3 className="font-sans text-base font-bold text-neutral-950 mb-1">\s*Privacy & Discretion\s*<\/h3>/,
  `<div className="flex justify-between items-center mb-1">
      <h3 className="font-sans text-base font-bold text-neutral-950">Privacy & Discretion</h3>
      <button type="button" onClick={addPrivacy} className="text-xs font-bold bg-neutral-900 text-white px-3 py-1 rounded"><Plus size={14} className="inline mr-1"/>Add</button>
    </div>`
);
content = content.replace(
  /{data\.privacy\.map\(\(pr, idx\) => \(\s*<div key={idx} className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-3">/,
  `{data.privacy.map((pr, idx) => (
      <div key={idx} className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-3 relative">
        <button type="button" onClick={() => removePrivacy(idx)} className="absolute top-2 right-2 text-red-500"><Trash2 size={16}/></button>`
);

if (!content.includes('Trash2')) {
  content = content.replace("import { useState } from 'react';", "import { useState } from 'react';\nimport { Plus, Trash2 } from 'lucide-react';");
}
fs.writeFileSync("src/pages/admin/tabs/SexualHealthTab.tsx", content);
console.log("SexualHealthTab updated");

const fs = require("fs");
let content = fs.readFileSync("src/pages/admin/tabs/WeightLossTab.tsx", "utf8");

const addFunctions = `
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
`;

content = content.replace("  const updatePillar = ", addFunctions + "\n  const updatePillar = ");

// Pillars
content = content.replace(
  /<h3 className="font-sans text-base font-bold text-neutral-950">Treatment Pillars<\/h3>/,
  `<div className="flex justify-between items-center">
      <h3 className="font-sans text-base font-bold text-neutral-950">Treatment Pillars</h3>
      <button type="button" onClick={addPillar} className="text-xs font-bold bg-neutral-900 text-white px-3 py-1 rounded"><Plus size={14} className="inline mr-1"/>Add</button>
    </div>`
);
content = content.replace(
  /{data\.pillars\.map\(\(pil, idx\) => \(\s*<div key={idx} className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 grid grid-cols-1 md:grid-cols-4 gap-4">/,
  `{data.pillars.map((pil, idx) => (
      <div key={idx} className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 grid grid-cols-1 md:grid-cols-4 gap-4 relative">
        <button type="button" onClick={() => removePillar(idx)} className="absolute top-2 right-2 text-red-500"><Trash2 size={16}/></button>`
);

// Medications
content = content.replace(
  /<div className="flex items-center justify-between">\s*<div>\s*<h3 className="font-sans text-base font-bold text-neutral-950">Medications & Therapies<\/h3>\s*<p className="text-xs text-neutral-500">Configure the specific GLP-1 and combination therapies offered\.<\/p>\s*<\/div>\s*<\/div>/,
  `<div className="flex items-center justify-between">
      <div>
        <h3 className="font-sans text-base font-bold text-neutral-950">Medications & Therapies</h3>
        <p className="text-xs text-neutral-500">Configure the specific GLP-1 and combination therapies offered.</p>
      </div>
      <button type="button" onClick={addMedication} className="text-xs font-bold bg-neutral-900 text-white px-3 py-1 rounded"><Plus size={14} className="inline mr-1"/>Add</button>
    </div>`
);
content = content.replace(
  /{data\.medications\.map\(\(med, idx\) => \(\s*<div key={idx} className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-4">/,
  `{data.medications.map((med, idx) => (
      <div key={idx} className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-4 relative">
        <button type="button" onClick={() => removeMedication(idx)} className="absolute top-2 right-2 text-red-500"><Trash2 size={16}/></button>`
);

// Medication benefits
content = content.replace(
  /<label className="block text-\[10px\] font-bold uppercase text-neutral-500 mb-1">Key Benefits<\/label>/,
  `<div className="flex justify-between items-center mb-1">
      <label className="block text-[10px] font-bold uppercase text-neutral-500">Key Benefits</label>
      <button type="button" onClick={() => addBenefit(idx)} className="text-[10px] font-bold text-neutral-900"><Plus size={12} className="inline mr-1"/>Add Benefit</button>
    </div>`
);
content = content.replace(
  /{med\.benefits\.map\(\(bnf, bIdx\) => \(\s*<input/,
  `{med.benefits.map((bnf, bIdx) => (
                  <div key={bIdx} className="flex items-center gap-2">
                    <input`
);
// In this case, we have to handle the closing div. The original has `<input key={bIdx} ... />`. We changed it to wrap in a div. 
// We'll just replace the original map completely.
content = content.replace(
  /{med\.benefits\.map\(\(bnf, bIdx\) => \(\s*<input[\s\S]*?onChange=\{\(e\) => updateMedBenefit\(idx, bIdx, e\.target\.value\)\}\s*className="w-full px-2\.5 py-1\.5 text-xs rounded border border-neutral-300"\s*\/>\s*\)\)}/,
  `{med.benefits.map((bnf, bIdx) => (
                  <div key={bIdx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={bnf}
                      onChange={(e) => updateMedBenefit(idx, bIdx, e.target.value)}
                      className="flex-1 px-2.5 py-1.5 text-xs rounded border border-neutral-300"
                    />
                    <button type="button" onClick={() => removeBenefit(idx, bIdx)} className="text-red-500"><Trash2 size={14}/></button>
                  </div>
                ))}`
);

if (!content.includes('Trash2')) {
  content = content.replace("import { useState } from 'react';", "import { useState } from 'react';\nimport { Plus, Trash2 } from 'lucide-react';");
}
fs.writeFileSync("src/pages/admin/tabs/WeightLossTab.tsx", content);
console.log("WeightLossTab updated");

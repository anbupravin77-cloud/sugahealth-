const fs = require("fs");
let content = fs.readFileSync("src/pages/admin/tabs/HomeTab.tsx", "utf8");

// We can just add all the add/remove functions right after the update functions.
const addFunctions = `
  const addSpecialization = () => {
    onChange({ ...data, specializations: [...data.specializations, { title: 'New', subtitle: 'Desc', icon: 'Heart', highlights: [] }] });
  };
  const removeSpecialization = (idx: number) => {
    onChange({ ...data, specializations: data.specializations.filter((_, i) => i !== idx) });
  };
  const addTimelineStep = (cat: 'weight' | 'hair' | 'sexual') => {
    const updated = [...data.timeline[cat], { phase: 'Phase', label: 'Label', description: 'Desc' }];
    onChange({ ...data, timeline: { ...data.timeline, [cat]: updated } });
  };
  const removeTimelineStep = (cat: 'weight' | 'hair' | 'sexual', idx: number) => {
    const updated = data.timeline[cat].filter((_, i) => i !== idx);
    onChange({ ...data, timeline: { ...data.timeline, [cat]: updated } });
  };
  const addHowItWorksStep = () => {
    onChange({ ...data, howItWorks: [...data.howItWorks, { time: '01', title: 'New Step', desc: 'Desc' }] });
  };
  const removeHowItWorksStep = (idx: number) => {
    onChange({ ...data, howItWorks: data.howItWorks.filter((_, i) => i !== idx) });
  };
  const addAccountability = () => {
    onChange({ ...data, accountability: [...data.accountability, { value: 0, suffix: '%', title: 'Metric', desc: 'Desc' }] });
  };
  const removeAccountability = (idx: number) => {
    onChange({ ...data, accountability: data.accountability.filter((_, i) => i !== idx) });
  };
`;

content = content.replace("  const updateSpecialization = ", addFunctions + "\n  const updateSpecialization = ");

// Inject into specializations UI
content = content.replace(
  /<h3 className="font-sans text-base font-bold text-neutral-950 mb-1">\s*Clinical Focus Areas\s*<\/h3>/,
  `<div className="flex justify-between items-center mb-1">
      <h3 className="font-sans text-base font-bold text-neutral-950">Clinical Focus Areas</h3>
      <button type="button" onClick={addSpecialization} className="text-xs font-bold bg-neutral-900 text-white px-3 py-1 rounded"><Plus size={14} className="inline mr-1"/>Add</button>
    </div>`
);
content = content.replace(
  /<div key={idx} className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-4">/,
  `<div key={idx} className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-4 relative">
    <button type="button" onClick={() => removeSpecialization(idx)} className="absolute top-2 right-2 text-red-500"><Trash2 size={16}/></button>`
);

// Timeline UI
content = content.replace(
  /<div className="flex items-center gap-2 mb-4">([\s\S]*?)<\/div>/,
  `<div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        $1
      </div>
      <button type="button" onClick={() => addTimelineStep(activeTimelineCat)} className="text-xs font-bold bg-neutral-900 text-white px-3 py-1 rounded"><Plus size={14} className="inline mr-1"/>Add</button>
    </div>`
);
content = content.replace(
  /{data\.timeline\[activeTimelineCat\]\.map\(\(step, idx\) => \(\s*<div key={idx} className="grid grid-cols-12 gap-3">/,
  `{data.timeline[activeTimelineCat].map((step, idx) => (
      <div key={idx} className="grid grid-cols-12 gap-3 relative pr-8">
        <button type="button" onClick={() => removeTimelineStep(activeTimelineCat, idx)} className="absolute top-1 right-0 text-red-500"><Trash2 size={16}/></button>`
);

// How It Works UI
content = content.replace(
  /<h3 className="font-sans text-base font-bold text-neutral-950">How It Works \(Steps\)<\/h3>/,
  `<div className="flex justify-between items-center">
      <h3 className="font-sans text-base font-bold text-neutral-950">How It Works (Steps)</h3>
      <button type="button" onClick={addHowItWorksStep} className="text-xs font-bold bg-neutral-900 text-white px-3 py-1 rounded"><Plus size={14} className="inline mr-1"/>Add</button>
    </div>`
);
content = content.replace(
  /{data\.howItWorks\.map\(\(step, idx\) => \(\s*<div key={idx} className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-3">/,
  `{data.howItWorks.map((step, idx) => (
      <div key={idx} className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-3 relative">
        <button type="button" onClick={() => removeHowItWorksStep(idx)} className="absolute top-2 right-2 text-red-500"><Trash2 size={16}/></button>`
);

// Accountability UI
content = content.replace(
  /<h3 className="font-sans text-base font-bold text-neutral-950">Accountability & Metrics<\/h3>/,
  `<div className="flex justify-between items-center">
      <h3 className="font-sans text-base font-bold text-neutral-950">Accountability & Metrics</h3>
      <button type="button" onClick={addAccountability} className="text-xs font-bold bg-neutral-900 text-white px-3 py-1 rounded"><Plus size={14} className="inline mr-1"/>Add</button>
    </div>`
);
content = content.replace(
  /{data\.accountability\.map\(\(m, idx\) => \(\s*<div key={idx} className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-3">/,
  `{data.accountability.map((m, idx) => (
      <div key={idx} className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-3 relative">
        <button type="button" onClick={() => removeAccountability(idx)} className="absolute top-2 right-2 text-red-500"><Trash2 size={16}/></button>`
);

// We need to add Trash2/Plus to imports if not there.
if (!content.includes('Trash2')) {
  content = content.replace("import { useState } from 'react';", "import { useState } from 'react';\nimport { Plus, Trash2 } from 'lucide-react';");
}

fs.writeFileSync("src/pages/admin/tabs/HomeTab.tsx", content);
console.log("HomeTab updated");

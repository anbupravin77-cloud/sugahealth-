const fs = require("fs");
let content = fs.readFileSync("src/pages/admin/tabs/HairGrowthTab.tsx", "utf8");

const addFunctions = `
  const addPillar = () => {
    onChange({ ...data, pillars: [...data.pillars, { title: 'New Pillar', desc: 'Desc', icon: 'Star' }] });
  };
  const removePillar = (idx: number) => {
    onChange({ ...data, pillars: data.pillars.filter((_, i) => i !== idx) });
  };
  const addGrowthCycle = () => {
    onChange({ ...data, growthCycle: [...data.growthCycle, { phase: 'New Phase', time: 'Time', desc: 'Desc' }] });
  };
  const removeGrowthCycle = (idx: number) => {
    onChange({ ...data, growthCycle: data.growthCycle.filter((_, i) => i !== idx) });
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

// Growth Cycle
content = content.replace(
  /<div className="flex items-center justify-between">\s*<div>\s*<h3 className="font-sans text-base font-bold text-neutral-950">Growth Cycle Timeline<\/h3>/,
  `<div className="flex items-center justify-between">
      <div>
        <h3 className="font-sans text-base font-bold text-neutral-950">Growth Cycle Timeline</h3>`
);
// We also need to add the add button
content = content.replace(
  /<h3 className="font-sans text-base font-bold text-neutral-950">Growth Cycle Timeline<\/h3>\s*<p className="text-xs text-neutral-500">Configure the expected timeline for hair restoration\.<\/p>\s*<\/div>\s*<\/div>/,
  `<h3 className="font-sans text-base font-bold text-neutral-950">Growth Cycle Timeline</h3>
        <p className="text-xs text-neutral-500">Configure the expected timeline for hair restoration.</p>
      </div>
      <button type="button" onClick={addGrowthCycle} className="text-xs font-bold bg-neutral-900 text-white px-3 py-1 rounded"><Plus size={14} className="inline mr-1"/>Add</button>
    </div>`
);
content = content.replace(
  /{data\.growthCycle\.map\(\(cycle, idx\) => \(\s*<div key={idx} className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 grid grid-cols-1 md:grid-cols-12 gap-4">/,
  `{data.growthCycle.map((cycle, idx) => (
      <div key={idx} className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 grid grid-cols-1 md:grid-cols-12 gap-4 relative">
        <button type="button" onClick={() => removeGrowthCycle(idx)} className="absolute top-2 right-2 text-red-500"><Trash2 size={16}/></button>`
);


if (!content.includes('Trash2')) {
  content = content.replace("import { useState } from 'react';", "import { useState } from 'react';\nimport { Plus, Trash2 } from 'lucide-react';");
}
fs.writeFileSync("src/pages/admin/tabs/HairGrowthTab.tsx", content);
console.log("HairGrowthTab updated");

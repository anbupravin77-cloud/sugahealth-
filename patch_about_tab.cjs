const fs = require("fs");
let content = fs.readFileSync("src/pages/admin/tabs/AboutTab.tsx", "utf8");

content = content.replace(
  "const updateMissionParagraph = (idx: number, val: string) => {",
  `const addMissionPara = () => {
    onChange({ ...data, mission: { ...data.mission, paragraphs: [...data.mission.paragraphs, 'New paragraph'] } });
  };
  const removeMissionPara = (idx: number) => {
    onChange({ ...data, mission: { ...data.mission, paragraphs: data.mission.paragraphs.filter((_, i) => i !== idx) } });
  };
  const updateMissionParagraph = (idx: number, val: string) => {`
);

content = content.replace(
  `{data.mission.paragraphs.map((p, idx) => (`,
  `<div className="flex justify-end mb-2"><button type="button" onClick={addMissionPara} className="text-xs flex items-center gap-1 text-neutral-500"><Plus size={14}/> Add Paragraph</button></div>
          {data.mission.paragraphs.map((p, idx) => (`
);

fs.writeFileSync("src/pages/admin/tabs/AboutTab.tsx", content);
console.log("Patched AboutTab.tsx");

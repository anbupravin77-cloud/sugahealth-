const fs = require("fs");
let content = fs.readFileSync("src/pages/admin/tabs/AboutTab.tsx", "utf8");

content = content.replace(
  /{data\.mission\.paragraphs\.map\(\(p, idx\) => \([\s\S]*?\)\)}/,
  `{data.mission.paragraphs.map((p, idx) => (
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
          ))}`
);

fs.writeFileSync("src/pages/admin/tabs/AboutTab.tsx", content);
console.log("AboutTab paragraphs fixed");

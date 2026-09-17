const fs = require("fs");
let content = fs.readFileSync("src/pages/admin/tabs/SexualHealthTab.tsx", "utf8");

content = content.replace(
  /{data\.cardiovascular\.paragraphs\.map\(\(para, pIdx\) => \([\s\S]*?\)\)}/,
  `{data.cardiovascular.paragraphs.map((para, pIdx) => (
            <div key={pIdx} className="flex gap-2 mb-2 items-start relative">
              <textarea
                rows={2}
                value={para}
                onChange={(e) => updateCardioPara(pIdx, e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 leading-relaxed pr-8"
              />
              <button type="button" onClick={() => removeCardioPara(pIdx)} className="absolute top-2 right-2 text-red-500"><Trash2 size={16}/></button>
            </div>
          ))}`
);

fs.writeFileSync("src/pages/admin/tabs/SexualHealthTab.tsx", content);
console.log("SexualHealthTab fixed");

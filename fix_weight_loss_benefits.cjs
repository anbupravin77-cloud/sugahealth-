const fs = require("fs");
let content = fs.readFileSync("src/pages/admin/tabs/WeightLossTab.tsx", "utf8");

content = content.replace(
  /{med\.benefits\.map\(\(bnf, bIdx\) => \([\s\S]*?\)\)}/,
  `{med.benefits.map((bnf, bIdx) => (
                  <div key={bIdx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={bnf}
                      onChange={(e) => updateMedBenefit(idx, bIdx, e.target.value)}
                      className="w-full px-2.5 py-1 text-xs rounded border border-neutral-300 bg-white"
                    />
                    <button type="button" onClick={() => removeBenefit(idx, bIdx)} className="text-red-500"><Trash2 size={14}/></button>
                  </div>
                ))}`
);

fs.writeFileSync("src/pages/admin/tabs/WeightLossTab.tsx", content);
console.log("WeightLossTab fixed");

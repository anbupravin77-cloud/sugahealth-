const fs = require("fs");
let content = fs.readFileSync("src/pages/admin/tabs/GlobalTab.tsx", "utf8");

// Add import for Plus and Trash2 if missing
if (!content.includes("Trash2")) {
  content = content.replace("import { useState }", "import { useState }\nimport { Plus, Trash2 } from 'lucide-react';");
}

// NavLinks Add/Remove
content = content.replace(
  "const updateNavLink = (index: number, field: 'name' | 'path' | 'desc', val: string) => {",
  `const addNavLink = () => {
    const updated = [...data.navLinks, { name: 'New Link', path: '/', desc: 'Description' }];
    updateField('navLinks', updated);
  };
  const removeNavLink = (index: number) => {
    const updated = data.navLinks.filter((_, i) => i !== index);
    updateField('navLinks', updated);
  };
  const updateNavLink = (index: number, field: 'name' | 'path' | 'desc', val: string) => {`
);

content = content.replace(
  /<h3 className="font-sans text-base font-bold text-neutral-950 mb-1">\s*Primary Navigation Links\s*<\/h3>\s*<p className="text-xs text-neutral-500 mb-5">\s*Links in the top navigation bar and mobile drawer.\s*<\/p>/,
  `<div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-sans text-base font-bold text-neutral-950 mb-1">
              Primary Navigation Links
            </h3>
            <p className="text-xs text-neutral-500">
              Links in the top navigation bar and mobile drawer. (Add or remove to toggle page visibility)
            </p>
          </div>
          <button
            type="button"
            onClick={addNavLink}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-neutral-950 text-white text-xs font-bold hover:bg-neutral-800 transition-colors"
          >
            <Plus size={14} /> Add Link
          </button>
        </div>`
);

content = content.replace(
  /<div key={idx} className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 grid grid-cols-1 md:grid-cols-3 gap-3">/,
  `<div key={idx} className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 relative">
              <button
                type="button"
                onClick={() => removeNavLink(idx)}
                className="absolute top-2 right-2 p-1 text-neutral-400 hover:text-red-600 transition-colors"
              >
                <Trash2 size={14} />
              </button>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">`
);

// We need to fix the div tags since we added a wrapper inside the loop.
content = content.replace(
  /<\/div>\s*<\/div>\s*\)\)\}/,
  `</div></div>
            </div>
          ))}`
);

fs.writeFileSync("src/pages/admin/tabs/GlobalTab.tsx", content);
console.log("GlobalTab updated");

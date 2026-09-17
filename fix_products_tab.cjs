const fs = require("fs");
let content = fs.readFileSync("src/pages/admin/tabs/ProductsTab.tsx", "utf8");

content = content.replace(
  "const [editingIdx, setEditingIdx] = useState<number | null>(null);",
  "const [editingIdx, setEditingIdx] = useState<number | null>(null);\n  const [draftProduct, setDraftProduct] = useState<Product | null>(null);"
);

content = content.replace(
  /const handleAddProduct = \(\) => {[\s\S]*?setEditingIdx\(updated\.length - 1\);\n  };/,
  `const handleAddProduct = () => {
    const newProduct = {
      id: \`prod_\${Date.now()}\`,
      name: 'New Medication',
      tagline: 'Short description here',
      category: 'weight',
      image: 'https://images.unsplash.com/photo-1584308666744-24d5e4a83bf3?w=800&auto=format&fit=crop&q=80',
      description: 'Detailed clinical description of the medication.',
      mechanismOfAction: 'How this medication works in the body.',
      startingPrice: '$199',
      billingCadence: '/mo',
      rxRequired: true,
      deliveryMethod: 'Oral tablet',
      howToUse: 'Take one tablet daily.',
      benefits: ['First benefit', 'Second benefit']
    };
    setDraftProduct(newProduct as Product);
    setEditingIdx(-1);
  };`
);

content = content.replace(
  /const handleEdit = \(idx: number\) => {\n    setEditingIdx\(idx\);\n  };/,
  `const handleEdit = (idx: number) => {
    setEditingIdx(idx);
    setDraftProduct(products[idx]);
  };`
);

content = content.replace(
  /const handleSave = \(\) => {\n    setEditingIdx\(null\);\n  };/,
  `const handleSave = () => {
    if (draftProduct) {
      if (editingIdx === -1) {
        onChange([...products, draftProduct]);
      } else if (editingIdx !== null) {
        const updated = [...products];
        updated[editingIdx] = draftProduct;
        onChange(updated);
      }
    }
    setEditingIdx(null);
    setDraftProduct(null);
  };
  
  const handleCancel = () => {
    setEditingIdx(null);
    setDraftProduct(null);
  };`
);

content = content.replace(
  /const updateCurrent = <K extends keyof Product>\(field: K, val: Product\[K\]\) => {[\s\S]*?onChange\(updated\);\n  };/,
  `const updateCurrent = <K extends keyof Product>(field: K, val: Product[K]) => {
    if (draftProduct) {
      setDraftProduct({ ...draftProduct, [field]: val });
    }
  };`
);

content = content.replace(
  /const currentProduct = products\[editingIdx\];/,
  `const currentProduct = draftProduct;`
);

content = content.replace(
  /const updateBenefit = \(bIdx: number, val: string\) => {[\s\S]*?onChange\(updated\);\n  };/,
  `const updateBenefit = (bIdx: number, val: string) => {
    if (draftProduct) {
      const updatedBenefits = [...draftProduct.benefits];
      updatedBenefits[bIdx] = val;
      setDraftProduct({ ...draftProduct, benefits: updatedBenefits });
    }
  };`
);

content = content.replace(
  /const addBenefit = \(\) => {[\s\S]*?onChange\(updated\);\n  };/,
  `const addBenefit = () => {
    if (draftProduct) {
      setDraftProduct({ ...draftProduct, benefits: [...draftProduct.benefits, 'New benefit'] });
    }
  };`
);

content = content.replace(
  /const removeBenefit = \(bIdx: number\) => {[\s\S]*?onChange\(updated\);\n  };/,
  `const removeBenefit = (bIdx: number) => {
    if (draftProduct) {
      const updatedBenefits = draftProduct.benefits.filter((_, i) => i !== bIdx);
      setDraftProduct({ ...draftProduct, benefits: updatedBenefits });
    }
  };`
);

content = content.replace(
  /<button\n\s*type="button"\n\s*onClick={handleSave}\n\s*className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-neutral-950 text-white text-xs font-bold hover:bg-neutral-800 transition-colors cursor-pointer shadow-xs"\n\s*>/,
  `<button
            type="button"
            onClick={handleCancel}
            className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-neutral-200 text-neutral-900 text-xs font-bold hover:bg-neutral-300 transition-colors cursor-pointer shadow-xs mr-2"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-neutral-950 text-white text-xs font-bold hover:bg-neutral-800 transition-colors cursor-pointer shadow-xs"
          >`
);

// Delete confirmation removal
content = content.replace(/if \(\s*window\.confirm\([^)]+\)\s*\) \{/g, "if (true) {");

fs.writeFileSync("src/pages/admin/tabs/ProductsTab.tsx", content);
console.log("ProductsTab updated successfully!");

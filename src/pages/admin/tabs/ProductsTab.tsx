import { useState } from 'react';
import { Product, TreatmentCategory } from '../../../types';
import { ImageUploadField } from '../ImageUploadField';
import { Plus, Trash2, Edit2, Check, ArrowLeft } from 'lucide-react';

interface ProductsTabProps {
  products: Product[];
  onChange: (products: Product[]) => void;
}

export function ProductsTab(props: ProductsTabProps) {
  const products = props?.products || [];
  const onChange = props?.onChange || (() => {});
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [draftProduct, setDraftProduct] = useState<Product | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const handleEdit = (idx: number) => {
    setEditingIdx(idx);
    setDraftProduct(products[idx]);
  };

  const handleAddProduct = () => {
    const newProduct: Product = {
      id: `prod-${Date.now()}`,
      name: 'New Formulated Medication',
      tagline: 'Targeted clinical therapeutic protocol',
      category: 'weight',
      startingPrice: '$199',
      billingCadence: 'billed monthly',
      deliveryMethod: 'Injectable',
      rxRequired: true,
      dosage: 'Customized patient titration',
      activeIngredients: 'Compound Name',
      clinicalProof: 'Clinically tested therapeutic outcomes',
      mechanismOfAction: 'Targeted GLP-1 / receptor modulation',
      howToUse: 'Administer weekly as directed by your physician.',
      description: 'Medical description detailing mechanism of action and clinical utility.',
      benefits: [
        'Doctor-monitored dosage titration schedule',
        'Direct overnight cold-pack refrigerated shipping',
        'Ongoing metabolic progress assessments',
      ],
      image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?q=80&w=800&auto=format&fit=crop',
    };

    const updated = [newProduct, ...products];
    onChange(updated);
    setEditingIdx(0);
  };

  const handleDelete = (idx: number) => {
    if (true) {
      const updated = products.filter((_, i) => i !== idx);
      onChange(updated);
      if (editingIdx === idx) setEditingIdx(null);
    }
  };

  const updateCurrent = (field: keyof Product, val: any) => {
    if (editingIdx === null) return;
    const updated = [...products];
    updated[editingIdx] = { ...updated[editingIdx], [field]: val };
    onChange(updated);
  };

  const updateBenefit = (bIdx: number, val: string) => {
    if (draftProduct) {
      const updatedBenefits = [...draftProduct.benefits];
      updatedBenefits[bIdx] = val;
      setDraftProduct({ ...draftProduct, benefits: updatedBenefits });
    }
  };

  const addBenefit = () => {
    if (draftProduct) {
      setDraftProduct({ ...draftProduct, benefits: [...draftProduct.benefits, 'New benefit'] });
    }
  };

  const removeBenefit = (bIdx: number) => {
    if (draftProduct) {
      const updatedBenefits = draftProduct.benefits.filter((_, i) => i !== bIdx);
      setDraftProduct({ ...draftProduct, benefits: updatedBenefits });
    }
  };

  const currentProduct = editingIdx !== null ? products[editingIdx] : null;

  const filteredProducts = categoryFilter === 'all' 
    ? products 
    : products.filter(p => p.category === categoryFilter);

  return (
    <div className="space-y-6">
      
      {/* Product Detail Editor View */}
      {currentProduct !== null ? (
        <div className="bg-white p-6 rounded-2xl border border-neutral-200 space-y-6">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
            <button
              type="button"
              onClick={() => setEditingIdx(null)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-700 hover:text-neutral-950 transition-colors cursor-pointer"
            >
              <ArrowLeft size={16} /> Back to Products Formulary
            </button>
            <button
              type="button"
              onClick={() => setEditingIdx(null)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-neutral-950 text-white text-xs font-bold hover:bg-neutral-800 transition-colors"
            >
              <Check size={14} /> Done Editing Product
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">Medication Name</label>
              <input
                type="text"
                value={currentProduct.name}
                onChange={(e) => updateCurrent('name', e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">Subtitle / Tagline</label>
              <input
                type="text"
                value={currentProduct.tagline}
                onChange={(e) => updateCurrent('tagline', e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">Clinical Category</label>
              <select
                value={currentProduct.category}
                onChange={(e) => updateCurrent('category', e.target.value as TreatmentCategory)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 bg-white"
              >
                <option value="weight">Weight Loss</option>
                <option value="hair">Hair Growth</option>
                <option value="sexual">Sexual Health</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">Starting Price</label>
              <input
                type="text"
                value={currentProduct.startingPrice}
                onChange={(e) => updateCurrent('startingPrice', e.target.value)}
                placeholder="e.g. $199"
                className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">Billing Cadence</label>
              <input
                type="text"
                value={currentProduct.billingCadence}
                onChange={(e) => updateCurrent('billingCadence', e.target.value)}
                placeholder="e.g. billed monthly"
                className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">Delivery Method</label>
              <input
                type="text"
                value={currentProduct.deliveryMethod}
                onChange={(e) => updateCurrent('deliveryMethod', e.target.value)}
                placeholder="e.g. Subcutaneous Injectable"
                className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">Dosage Protocol</label>
              <input
                type="text"
                value={currentProduct.dosage}
                onChange={(e) => updateCurrent('dosage', e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">Active Ingredients</label>
              <input
                type="text"
                value={currentProduct.activeIngredients}
                onChange={(e) => updateCurrent('activeIngredients', e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">Clinical Description</label>
            <textarea
              rows={3}
              value={currentProduct.description}
              onChange={(e) => updateCurrent('description', e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">Mechanism of Action</label>
              <textarea
                rows={2}
                value={currentProduct.mechanismOfAction}
                onChange={(e) => updateCurrent('mechanismOfAction', e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">How To Use / Protocol</label>
              <textarea
                rows={2}
                value={currentProduct.howToUse}
                onChange={(e) => updateCurrent('howToUse', e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300"
              />
            </div>
          </div>

          <ImageUploadField
            label="Product Imagery URL"
            value={currentProduct.image}
            onChange={(val) => updateCurrent('image', val)}
            description="Display photo of the medication packaging or vial."
          />

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700">
                Clinical Benefits List
              </label>
              <button
                type="button"
                onClick={addBenefit}
                className="text-[11px] font-bold text-neutral-900 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus size={12} /> Add Benefit
              </button>
            </div>
            {currentProduct.benefits.map((bn, bIdx) => (
              <div key={bIdx} className="flex items-center gap-2">
                <input
                  type="text"
                  value={bn}
                  onChange={(e) => updateBenefit(bIdx, e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs rounded border border-neutral-300"
                />
                <button
                  type="button"
                  onClick={() => removeBenefit(bIdx)}
                  className="p-1 text-neutral-400 hover:text-red-600 cursor-pointer"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          <div className="pt-3 flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={currentProduct.rxRequired}
                onChange={(e) => updateCurrent('rxRequired', e.target.checked)}
                className="rounded border-neutral-300 text-neutral-950 focus:ring-neutral-950"
              />
              <span className="text-xs font-semibold text-neutral-800">
                Requires Board-Certified Physician Prescription (Rx)
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!!currentProduct.isPopular}
                onChange={(e) => updateCurrent('isPopular', e.target.checked)}
                className="rounded border-neutral-300 text-neutral-950 focus:ring-neutral-950"
              />
              <span className="text-xs font-semibold text-neutral-800">
                Mark as Most Popular / Featured
              </span>
            </label>
          </div>
        </div>
      ) : (
        /* Products List Overview */
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-neutral-200">
            <div>
              <h3 className="font-sans text-base font-bold text-neutral-950">Medication Formulary</h3>
              <p className="text-xs text-neutral-500">Currently offering {products.length} clinical treatments.</p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-neutral-300 bg-white"
              >
                <option value="all">All Categories</option>
                <option value="weight">Weight Loss</option>
                <option value="hair">Hair Regrowth</option>
                <option value="sexual">Sexual Vitality</option>
              </select>

              <button
                type="button"
                onClick={handleAddProduct}
                className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-neutral-950 text-white text-xs font-bold hover:bg-neutral-800 transition-colors cursor-pointer shadow-xs"
              >
                <Plus size={14} /> Add Medication
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredProducts.map((prod) => {
              const realIndex = products.findIndex(p => p.id === prod.id);
              return (
                <div
                  key={prod.id}
                  className="bg-white p-5 rounded-2xl border border-neutral-200 hover:border-neutral-950 transition-all flex flex-col justify-between"
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className="h-16 w-16 rounded-xl bg-neutral-100 overflow-hidden shrink-0 border border-neutral-200">
                      <img
                        src={prod.image}
                        alt={prod.name}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-neutral-100 text-neutral-700">
                          {prod.category}
                        </span>
                        {prod.rxRequired && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-neutral-900 text-white">
                            Rx Only
                          </span>
                        )}
                      </div>
                      <h4 className="font-sans text-base font-bold text-neutral-950 truncate">
                        {prod.name}
                      </h4>
                      <p className="text-xs text-neutral-500 truncate">{prod.tagline}</p>
                      <p className="text-xs font-mono font-bold text-neutral-900 mt-1">
                        {prod.startingPrice} <span className="text-[10px] text-neutral-400 font-sans">{prod.billingCadence}</span>
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-neutral-100 flex items-center justify-between">
                    <span className="text-[11px] text-neutral-400">{prod.deliveryMethod}</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleEdit(realIndex)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
                      >
                        <Edit2 size={13} /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(realIndex)}
                        className="p-1 rounded text-neutral-400 hover:text-red-600 transition-colors cursor-pointer"
                        title="Delete product"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}

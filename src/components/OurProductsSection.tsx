import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowRight, 
  Check, 
  ShieldCheck, 
  Sparkles, 
  Info, 
  X, 
  Truck, 
  FileText,
  Activity,
  Layers
} from 'lucide-react';
import { Image } from './ui/Image';
import { GsapHeaderReveal } from './ui/GsapReveal';
import { productsData } from '../data/products';
import { Product, TreatmentCategory } from '../types';
import { cn } from '../lib/utils';
import { useContent } from '../context/ContentContext';

interface OurProductsSectionProps {
  products?: Product[];
}

export function OurProductsSection({ products: propProducts }: OurProductsSectionProps = {}) {
  const { content } = useContent();
  const allProducts = propProducts || content?.products || productsData;
  const [selectedCategory, setSelectedCategory] = useState<'all' | TreatmentCategory>('all');
  const [activeModalProduct, setActiveModalProduct] = useState<Product | null>(null);

  // Prevent background scroll and chaining when modal is active
  useEffect(() => {
    if (activeModalProduct) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setActiveModalProduct(null);
      };
      window.addEventListener('keydown', handleKeyDown);

      return () => {
        document.body.style.overflow = originalOverflow;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [activeModalProduct]);

  const filteredProducts = selectedCategory === 'all'
    ? allProducts
    : allProducts.filter((p) => p.category === selectedCategory);

  return (
    <section id="products" className="py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-12 flex flex-col items-center">
        <GsapHeaderReveal className="flex flex-col items-center text-center">
          <span className="text-xs font-bold tracking-widest text-neutral-500 uppercase block mb-2.5 text-center">
            Prescription Formulary
          </span>
          <h2 className="font-sans text-3xl sm:text-4xl md:text-5xl font-extrabold text-neutral-950 tracking-tight leading-[1.15] pb-1 text-balance text-center">
            Targeted therapies compounded for maximum bioavailability.
          </h2>
          <p className="mt-3.5 sm:mt-4 text-sm sm:text-base text-neutral-600 max-w-2xl mx-auto text-center leading-relaxed">
            Doctor-formulated treatments with pure active pharmaceutical ingredients, prepared exclusively in state-licensed 503A/503B pharmacies.
          </p>
        </GsapHeaderReveal>

        {/* Category Filters */}
        <div className="mt-7 sm:mt-8 flex justify-center w-full max-w-full px-2 sm:px-0">
          <div className="flex flex-wrap sm:inline-flex justify-center items-center p-1.5 bg-neutral-100 rounded-2xl sm:rounded-full border border-neutral-200/80 shadow-xs gap-1 sm:gap-1.5 max-w-full">
            {[
              { key: 'all', label: 'All Formulations' },
              { key: 'weight', label: 'Weight Loss' },
              { key: 'hair', label: 'Hair Growth' },
              { key: 'sexual', label: 'Sexual Health' }
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setSelectedCategory(tab.key as any)}
                className={cn(
                  "px-3 sm:px-5 py-1.5 sm:py-2 rounded-xl sm:rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer whitespace-nowrap",
                  selectedCategory === tab.key
                    ? 'bg-neutral-950 text-white shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-950 hover:bg-neutral-200/60'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
        <AnimatePresence mode="popLayout">
          {filteredProducts.map((product) => (
            <motion.div
              key={product.id}
              layout
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.25 }}
              className="group bg-white rounded-2xl sm:rounded-3xl border border-neutral-200/90 hover:border-neutral-950 transition-all duration-300 flex flex-col overflow-hidden shadow-xs hover:shadow-md"
            >
              {/* Product Visual Container */}
              <div className="relative h-60 sm:h-64 w-full bg-neutral-100 overflow-hidden">
                <Image
                  src={product.image}
                  alt={product.name}
                  containerClassName="w-full h-full"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent pointer-events-none" />

                {/* Top Badges */}
                <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between pointer-events-none">
                  <span className="px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-md text-[10px] font-bold text-neutral-900 uppercase tracking-wider border border-neutral-200/60 shadow-xs">
                    {product.category === 'weight' ? 'Metabolic GLP-1' : product.category === 'hair' ? 'Trichology Formula' : 'Endocrine / Vascular'}
                  </span>
                  {product.isPopular && (
                    <span className="px-2.5 py-1 rounded-full bg-neutral-950 text-white text-[10px] font-bold uppercase tracking-wider shadow-xs flex items-center gap-1">
                      <Sparkles size={10} className="text-amber-300" />
                      Most Prescribed
                    </span>
                  )}
                </div>

                {/* Delivery Method Overlay */}
                <div className="absolute bottom-3 left-3.5 right-3.5 text-white pointer-events-none">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-neutral-200">
                    <Layers size={12} className="text-neutral-300 shrink-0" />
                    <span className="truncate">{product.deliveryMethod}</span>
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 sm:p-6 lg:p-7 flex flex-col flex-grow justify-between">
                <div>
                  {/* Name & Active Ingredients */}
                  <div className="mb-3 sm:mb-4">
                    <h3 className="font-sans text-lg sm:text-xl font-bold text-neutral-950 tracking-tight group-hover:text-neutral-800 transition-colors">
                      {product.name}
                    </h3>
                    <p className="mt-1 text-xs font-semibold text-neutral-500 font-mono line-clamp-1">
                      {product.activeIngredients}
                    </p>
                  </div>

                  {/* Clinical Highlight */}
                  <div className="mb-4 sm:mb-5 p-2.5 sm:p-3 rounded-xl bg-neutral-50 border border-neutral-200/80">
                    <div className="flex items-start gap-2">
                      <div className="w-4 h-4 rounded-full bg-neutral-900 text-white flex items-center justify-center shrink-0 mt-0.5">
                        <Check size={10} strokeWidth={3} />
                      </div>
                      <span className="text-xs font-semibold text-neutral-800 leading-snug">
                        {product.clinicalProof}
                      </span>
                    </div>
                  </div>

                  {/* Summary Bullets - Hidden on Mobile & Tablet to prevent clutter */}
                  <ul className="space-y-1.5 mb-5 text-xs text-neutral-600 hidden lg:block">
                    {(product.benefits || []).slice(0, 2).map((benefit, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 shrink-0" />
                        <span className="line-clamp-1">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Pricing & Actions */}
                <div className="pt-3.5 sm:pt-4 border-t border-neutral-100">
                  {/* Price Tag */}
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xs text-neutral-500 font-medium leading-none">From</span>
                    <span className="font-sans text-2xl sm:text-3xl font-black text-neutral-950 tracking-tight leading-none">
                      {product.startingPrice}
                    </span>
                    <span className="text-xs text-neutral-500 font-medium leading-none">/mo</span>
                  </div>

                  {/* Free 2-Day Ship Badge Below Price with Proper Spacing */}
                  <div className="mt-2.5 mb-3.5 sm:mb-4">
                    <div className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs font-semibold text-neutral-700 bg-neutral-100/90 px-2.5 py-1 rounded-full whitespace-nowrap border border-neutral-200/80">
                      <Truck size={12} className="shrink-0 text-neutral-800" />
                      <span className="leading-none">Free 2-Day Ship</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                    <button
                      type="button"
                      onClick={() => setActiveModalProduct(product)}
                      className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-2.5 sm:px-3 rounded-xl border border-neutral-300 hover:border-neutral-950 bg-white hover:bg-neutral-50 text-xs font-bold text-neutral-800 uppercase tracking-wider transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] cursor-pointer"
                    >
                      <Info size={13} />
                      <span>Details</span>
                    </button>

                    <Link
                      to={`/consultation?concern=${product.category}`}
                      className="w-full inline-flex items-center justify-center gap-1 py-2.5 px-2.5 sm:px-3 rounded-xl bg-neutral-950 hover:bg-neutral-800 text-white text-xs font-bold uppercase tracking-wider transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] shadow-xs group"
                    >
                      <span>Get Started</span>
                      <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Trust Footnote */}
      <div className="mt-8 sm:mt-10 pt-6 border-t border-neutral-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left text-xs text-neutral-500">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-neutral-900 shrink-0" />
          <span>All prescription treatments require online clinical evaluation and doctor approval.</span>
        </div>
        <div className="flex items-center gap-4 text-neutral-700 font-medium">
          <span>✓ 100% US Licensed Pharmacies</span>
          <span>✓ Authentic Ingredients</span>
          <span>✓ Discreet Packaging</span>
        </div>
      </div>

      {/* Product Information Modal */}
      <AnimatePresence>
        {activeModalProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-hidden overscroll-none">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveModalProduct(null)}
              className="fixed inset-0 bg-black/65 backdrop-blur-xs"
            />

            {/* Modal Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-2xl bg-white rounded-2xl sm:rounded-3xl border border-neutral-200 shadow-2xl overflow-hidden z-10 my-auto flex flex-col max-h-[85vh] sm:max-h-[88vh]"
            >
              {/* Responsive Modal Header */}
              <div className="relative shrink-0 p-5 sm:p-6 md:p-7 bg-neutral-950 text-white">
                <button
                  type="button"
                  onClick={() => setActiveModalProduct(null)}
                  className="absolute top-4 right-4 sm:top-5 sm:right-5 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer z-10"
                  aria-label="Close modal"
                >
                  <X size={16} />
                </button>

                <span className="text-[10px] sm:text-[11px] font-bold tracking-widest uppercase text-neutral-400 block mb-1">
                  Prescription Specification
                </span>
                <h3 className="font-sans text-lg sm:text-2xl md:text-3xl font-extrabold tracking-tight text-white pr-8 sm:pr-10 leading-snug">
                  {activeModalProduct.name}
                </h3>
                <p className="mt-1 text-xs text-neutral-300 font-mono line-clamp-1 sm:line-clamp-none">
                  Active Ingredients: {activeModalProduct.activeIngredients}
                </p>
              </div>

              {/* Modal Content - Internal Smooth Scroll with overscroll containment */}
              <div className="p-4 sm:p-6 md:p-8 overflow-y-auto overscroll-contain space-y-4 sm:space-y-6 text-neutral-800 flex-grow">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1.5 sm:mb-2">
                    Formulation Overview
                  </h4>
                  <p className="text-xs sm:text-sm text-neutral-700 leading-relaxed">
                    {activeModalProduct.description}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-neutral-50 border border-neutral-200/70">
                    <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-neutral-500 block mb-0.5">
                      Administration Method
                    </span>
                    <span className="text-xs font-bold text-neutral-900 block">
                      {activeModalProduct.deliveryMethod}
                    </span>
                    <span className="text-[11px] text-neutral-500 mt-1 block">
                      {activeModalProduct.howToUse}
                    </span>
                  </div>

                  <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-neutral-50 border border-neutral-200/70">
                    <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-neutral-500 block mb-0.5">
                      Typical Dosage Range
                    </span>
                    <span className="text-xs font-bold text-neutral-900 block">
                      {activeModalProduct.dosage}
                    </span>
                    <span className="text-[11px] text-neutral-500 mt-1 block">
                      Titrated and monitored by your assigned physician.
                    </span>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1.5 sm:mb-2">
                    Mechanism of Action
                  </h4>
                  <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-neutral-50 border border-neutral-200/70 flex items-start gap-2.5 sm:gap-3">
                    <Activity size={16} className="text-neutral-950 shrink-0 mt-0.5" />
                    <p className="text-xs text-neutral-700 leading-relaxed">
                      {activeModalProduct.mechanismOfAction}
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1.5 sm:mb-2">
                    Clinical Benefits & Outcomes
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
                    {(activeModalProduct.benefits || []).map((benefit, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-neutral-700">
                        <Check size={13} className="text-neutral-950 shrink-0 mt-0.5" />
                        <span>{benefit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Modal Footer - Pinned to bottom */}
              <div className="shrink-0 p-4 sm:p-5 md:p-6 bg-neutral-50 border-t border-neutral-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
                <div className="w-full sm:w-auto text-center sm:text-left">
                  <span className="text-[11px] text-neutral-500 block">All-inclusive pricing</span>
                  <div className="flex items-baseline justify-center sm:justify-start gap-1">
                    <span className="font-sans text-xl sm:text-2xl font-extrabold text-neutral-950">
                      {activeModalProduct.startingPrice}
                    </span>
                    <span className="text-xs font-medium text-neutral-500">{activeModalProduct.billingCadence}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setActiveModalProduct(null)}
                    className="flex-1 sm:flex-initial px-4 sm:px-5 py-2.5 sm:py-3 rounded-full border border-neutral-300 text-xs font-bold uppercase tracking-wider text-neutral-700 hover:bg-neutral-100 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] cursor-pointer"
                  >
                    Close
                  </button>
                  <Link
                    to={`/consultation?concern=${activeModalProduct.category}`}
                    onClick={() => setActiveModalProduct(null)}
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-5 sm:px-6 py-2.5 sm:py-3 rounded-full bg-neutral-950 hover:bg-neutral-800 text-white text-xs font-bold uppercase tracking-wider transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] shadow-xs"
                  >
                    <span>Check Eligibility</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}

import { useState } from 'react';
import { Check, X, ArrowRight, ShieldCheck, Activity, Clock, Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';

export interface ComparisonOption {
  name: string;
  badge?: string;
  badgeType?: 'primary' | 'muted' | 'outline';
  tagline?: string;
  description: string;
  stats?: { label: string; value: string };
  features: string[];
  pros?: string[];
  cons?: string[];
  timeline?: {
    m1: string;
    m3: string;
    m6: string;
    m12: string;
  };
  isHighlighted?: boolean;
}

export interface ComparisonDataset {
  id: string;
  label: string;
  description: string;
  optionA: ComparisonOption;
  optionB: ComparisonOption;
}

const WEIGHT_LOSS_COMPARISONS: ComparisonDataset[] = [
  {
    id: 'semaglutide-vs-tirzepatide',
    label: 'Semaglutide vs. Tirzepatide',
    description: 'Compare the single-target GLP-1 receptor agonist against the next-generation dual GIP/GLP-1 incretin mimetic.',
    optionA: {
      name: 'Semaglutide Protocol',
      badge: 'GLP-1 Mono-Agonist',
      badgeType: 'muted',
      tagline: 'Standard Clinical Front-Line',
      description: 'Selectively stimulates pancreatic GLP-1 receptors, delaying gastric emptying and suppressing central hunger signals in the hypothalamus.',
      stats: { label: 'Avg Body Weight Loss', value: '14.9% – 16%' },
      features: [
        'FDA-approved peptide molecule targeting GLP-1 receptors exclusively',
        'Once-weekly subcutaneous administration via micro-needle pen',
        'Proven long-term cardiovascular outcome reduction (SELECT trial)',
        'Predictable 4-week titration schedule starting at 0.25mg to prevent nausea',
        'Included clinical nutritionist support and 1:1 doctor chat'
      ],
      timeline: {
        m1: 'Initial appetite reduction; 2–4% weight drop during starter dose (0.25mg).',
        m3: 'Metabolic adaptation and steady weight loss at mid-range maintenance (1.0mg).',
        m6: '10–13% cumulative reduction; noticeable body composition improvements.',
        m12: '15%+ sustained loss; metabolic stabilization and long-term habits established.'
      },
      isHighlighted: false
    },
    optionB: {
      name: 'Tirzepatide Protocol',
      badge: 'Dual GIP / GLP-1 Incretin',
      badgeType: 'primary',
      tagline: 'Next-Gen Dual Mechanism',
      description: 'Simultaneously activates both GIP and GLP-1 hormone receptors for synergistic glucose regulation, fat oxidation, and enhanced satiety.',
      stats: { label: 'Avg Body Weight Loss', value: 'Up to 20.9%' },
      features: [
        'Dual-action peptide molecule targeting both GIP and GLP-1 metabolic pathways',
        'Demonstrated higher peak efficacy in head-to-head trials (SURMOUNT)',
        'Enhanced visceral adiposity reduction and improved insulin sensitivity',
        'Gradual monthly dose escalation monitored by your personal physician',
        'Direct messaging with licensed physician and ongoing monitoring'
      ],
      timeline: {
        m1: 'Rapid reduction in food noise and visceral bloating; 4–6% initial decrease.',
        m3: 'Enhanced metabolic shift with noticeable waistline reduction (5mg–7.5mg).',
        m6: '15–18% cumulative body weight loss; substantial fat mass reduction.',
        m12: 'Up to 20.9% average total weight loss; robust metabolic reset.'
      },
      isHighlighted: true
    }
  },
  {
    id: 'medical-vs-dieting',
    label: 'Medical GLP-1 vs. Restrictive Dieting',
    description: 'Compare biological medical intervention against the traditional willpower and caloric restriction model.',
    optionA: {
      name: 'Caloric Restrictive Dieting',
      badge: 'Willpower-Only Model',
      badgeType: 'muted',
      tagline: 'Fighting Biological Counter-Regulation',
      description: 'Attempting to maintain a caloric deficit solely through restriction while the body responds with hunger hormones.',
      stats: { label: '2-Year Regain Rate', value: '85% – 95%' },
      features: [
        'Ghrelin (hunger hormone) increases by up to 25% to force eating',
        'Metabolic adaptation drops resting basal caloric expenditure',
        'High cognitive fatigue and intrusive "food noise" throughout the day',
        'High risk of muscle loss without physician-guided protein titration'
      ],
      timeline: {
        m1: 'Initial water weight drop followed by surging food cravings and fatigue.',
        m3: 'Weight loss plateau as metabolic adaptation slows resting burn rate.',
        m6: 'Diet fatigue; willpower struggles against biological hunger spikes.',
        m12: 'Majority of lost weight regained due to unaddressed endocrine triggers.'
      },
      isHighlighted: false
    },
    optionB: {
      name: 'Suga.health GLP-1 Protocol',
      badge: 'Physician-Guided Biology',
      badgeType: 'primary',
      tagline: 'Endocrine Realignment',
      description: 'Restores healthy metabolic signaling, silencing constant food preoccupation so portion control happens naturally.',
      stats: { label: 'Sustained Clinical Success', value: 'Over 85%' },
      features: [
        'Directly reprograms satiety signaling in the brain stem and hypothalamus',
        'Blunts the biological starvation reflex that causes chronic rebound',
        'Full physician titration prevents muscular catabolism and digestive distress',
        'Medication acts as a temporary bridge to long-term behavioral changes'
      ],
      timeline: {
        m1: 'Food noise turns off within days; smooth adaptation to smaller portions.',
        m3: 'Steady, predictable fat reduction without constant mental calculation.',
        m6: 'Deep metabolic reprogramming and normalized HbA1c and lipid profiles.',
        m12: 'Safe transition toward minimal maintenance or gradual step-down.'
      },
      isHighlighted: true
    }
  }
];

const HAIR_GROWTH_COMPARISONS: ComparisonDataset[] = [
  {
    id: 'dual-vs-minoxidil',
    label: 'Finasteride + Minoxidil vs. Minoxidil Alone',
    description: 'Compare dual-action attack (DHT block + vascular stimulation) against single stimulation.',
    optionA: {
      name: 'Minoxidil Monotherapy',
      badge: 'Stimulator Only',
      badgeType: 'muted',
      tagline: 'Single Vascular Mechanism',
      description: 'Increases blood micro-circulation around the dermal papilla to temporarily stimulate growth, but does not prevent DHT damage.',
      stats: { label: '5-Year Maintenance', value: '38% Retention' },
      features: [
        'Expands follicular capillaries and prolongs active anagen phase',
        'Does not block DHT—follicles continue to miniaturize underneath',
        'Often requires twice-daily topical application with greasy residue',
        'Results can diminish over years as DHT damage accumulates unchecked'
      ],
      timeline: {
        m1: 'Temporary shedding phase as dormant telogen hairs vacate follicles.',
        m3: 'Early fine vellus hair emergence around hairline and crown.',
        m6: 'Modest improvement in hair shaft thickness in responding areas.',
        m12: 'Plateau reached; underlying DHT continues slow miniaturization.'
      },
      isHighlighted: false
    },
    optionB: {
      name: 'Suga Dual-Action Protocol',
      badge: 'Comprehensive Defense',
      badgeType: 'primary',
      tagline: 'Root Protection + Blood Flow',
      description: 'Oral or topical Finasteride blocks up to 70% of DHT while Minoxidil oxygenates dormant roots for compounded regrowth.',
      stats: { label: 'Trial Success Rate', value: 'Over 94%' },
      features: [
        'Finasteride inhibits 5-alpha reductase to stop follicle destruction at the root',
        'High-potency Minoxidil accelerates robust, pigmented terminal hair growth',
        'Available in convenient 1x daily pill or 2-in-1 quick-dry topical formulation',
        'Doctor-reviewed prescription customized for your degree of Norwood loss'
      ],
      timeline: {
        m1: 'DHT hormone blocked at follicle base; initial shedding stabilizes.',
        m3: 'Active shedding drops to normal baseline; scalp roots feel firmer.',
        m6: 'Noticeable density improvement at vertex crown and temples.',
        m12: 'Full clinical density; continuous protection keeps gains permanent.'
      },
      isHighlighted: true
    }
  },
  {
    id: 'clinical-vs-otc',
    label: 'Clinical Prescription vs. OTC Serums & Biotin',
    description: 'Compare clinically proven prescription medicine against over-the-counter wellness shampoos and gummies.',
    optionA: {
      name: 'OTC Serums & Biotin Gummies',
      badge: 'Cosmetic / Supplement',
      badgeType: 'muted',
      tagline: 'Unregulated OTC Claims',
      description: 'Cosmetic grade oils (rosemary, peppermint) and high-dose vitamins that cannot penetrate the dermal follicle.',
      stats: { label: 'FDA Hair Regrowth Proof', value: '0% (Non-Clinical)' },
      features: [
        'Cannot alter DHT hormone biochemistry or genetic miniaturization',
        'Lack rigorous double-blind randomized clinical trial documentation',
        'Expensive monthly subscriptions for cosmetic surface conditioning only',
        'Delays real medical intervention while hair follicles permanently die'
      ],
      timeline: {
        m1: 'Cosmetic sheen on existing hairs; zero impact on follicle roots.',
        m3: 'Hair loss continues at standard genetic rate unnoticed.',
        m6: 'Continued recession and widening part lines.',
        m12: 'Significant follicle count lost permanently to irreversible fibrosis.'
      },
      isHighlighted: false
    },
    optionB: {
      name: 'Prescription Medical Protocol',
      badge: 'FDA-Approved Medicine',
      badgeType: 'primary',
      tagline: 'Scientifically Validated',
      description: 'Prescription therapeutics evaluated across decades of clinical trials and prescribed by board-certified clinicians.',
      stats: { label: 'Clinical Retention Rate', value: '90%+ In Trials' },
      features: [
        'Directly halts the biochemical trigger of male/female genetic pattern hair loss',
        'Doctor-supervised dosing with options for zero-systemic topical delivery',
        'Compound pharmacy verification ensures medical-grade active ingredient potency',
        'Clear clinical progression with ongoing dermatologist adjustment'
      ],
      timeline: {
        m1: 'Immediate biochemical inhibition of 5-alpha reductase enzyme.',
        m3: 'Follicular miniaturization reversed; scalp shedding normalized.',
        m6: 'Terminal hairs thicken and fill in diffuse thinning zones.',
        m12: 'Maximum scalp density and long-term prevention secured.'
      },
      isHighlighted: true
    }
  }
];

export interface ComparisonProps {
  mode?: 'weight-loss' | 'hair-growth';
  optionA?: ComparisonOption;
  optionB?: ComparisonOption;
  className?: string;
}

export function Comparison({ mode, optionA, optionB, className }: ComparisonProps = {}) {
  // Determine available datasets
  const defaultDatasets = mode === 'hair-growth' 
    ? HAIR_GROWTH_COMPARISONS 
    : mode === 'weight-loss' 
      ? WEIGHT_LOSS_COMPARISONS 
      : null;

  const [selectedDatasetIndex, setSelectedDatasetIndex] = useState(0);
  const [activeLens, setActiveLens] = useState<'features' | 'timeline'>('features');
  const [selectedMonth, setSelectedMonth] = useState<'m1' | 'm3' | 'm6' | 'm12'>('m3');

  // Fallback to direct props if provided and no mode specified
  const currentDataset = defaultDatasets ? defaultDatasets[selectedDatasetIndex] : null;
  const currentOptionA = currentDataset ? currentDataset.optionA : optionA;
  const currentOptionB = currentDataset ? currentDataset.optionB : optionB;

  if (!currentOptionA || !currentOptionB) {
    return null;
  }

  return (
    <div className={cn("w-full space-y-6 sm:space-y-8", className)}>
      {/* Interactive Controls Header (Tabs & Lenses) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-neutral-200/80 pb-5">
        {/* Protocol Selector Tabs (If multiple datasets available) */}
        {defaultDatasets && defaultDatasets.length > 1 && (
          <div className="flex items-center gap-1.5 p-1 bg-neutral-100 rounded-full border border-neutral-200/80 w-full sm:w-auto overflow-x-auto">
            {defaultDatasets.map((dataset, idx) => (
              <button
                key={dataset.id}
                onClick={() => setSelectedDatasetIndex(idx)}
                className={cn(
                  "px-4 py-2 rounded-full text-xs font-bold tracking-wide uppercase transition-all duration-200 whitespace-nowrap cursor-pointer",
                  selectedDatasetIndex === idx
                    ? "bg-neutral-950 text-white shadow-xs"
                    : "text-neutral-600 hover:text-neutral-950 hover:bg-neutral-200/50"
                )}
              >
                {dataset.label}
              </button>
            ))}
          </div>
        )}

        {/* View Mode Toggle: Key Factors vs. Month-by-Month Clinical Timeline */}
        <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-full border border-neutral-200/80 text-xs font-semibold self-center sm:self-auto">
          <button
            onClick={() => setActiveLens('features')}
            className={cn(
              "px-3.5 py-1.5 rounded-full transition-all duration-200 uppercase tracking-wider cursor-pointer",
              activeLens === 'features'
                ? "bg-white text-neutral-950 shadow-xs border border-neutral-200/60"
                : "text-neutral-600 hover:text-neutral-950"
            )}
          >
            Clinical Factors
          </button>
          <button
            onClick={() => setActiveLens('timeline')}
            className={cn(
              "px-3.5 py-1.5 rounded-full transition-all duration-200 uppercase tracking-wider cursor-pointer flex items-center gap-1.5",
              activeLens === 'timeline'
                ? "bg-white text-neutral-950 shadow-xs border border-neutral-200/60"
                : "text-neutral-600 hover:text-neutral-950"
            )}
          >
            <Clock size={13} />
            Progression Timeline
          </button>
        </div>
      </div>

      {/* Optional Dataset Subtitle */}
      {currentDataset && (
        <div className="text-center sm:text-left">
          <p className="text-xs sm:text-sm text-neutral-500 max-w-2xl">
            {currentDataset.description}
          </p>
        </div>
      )}

      {/* If Timeline Lens is active, show interactive month scrubber */}
      <AnimatePresence mode="wait">
        {activeLens === 'timeline' && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="flex flex-wrap items-center justify-center gap-2 py-2 px-3 bg-neutral-100/70 rounded-2xl border border-neutral-200/60"
          >
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 mr-2">
              Select Horizon:
            </span>
            {(['m1', 'm3', 'm6', 'm12'] as const).map((mKey) => {
              const labelMap = {
                m1: 'Month 1',
                m3: 'Month 3',
                m6: 'Month 6',
                m12: 'Month 12+'
              };
              return (
                <button
                  key={mKey}
                  onClick={() => setSelectedMonth(mKey)}
                  className={cn(
                    "px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer",
                    selectedMonth === mKey
                      ? "bg-neutral-950 text-white shadow-xs"
                      : "bg-white text-neutral-700 border border-neutral-200 hover:border-neutral-950"
                  )}
                >
                  {labelMap[mKey]}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Side-by-Side Monochromatic Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
        {/* Option A (Alternative / Comparator) */}
        <motion.div
          key={`optionA-${currentDataset?.id || 'custom'}`}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className={cn(
            "rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-10 border transition-all duration-300 flex flex-col justify-between bg-neutral-50/90 border-neutral-200/90 hover:border-neutral-950 hover:bg-white"
          )}
        >
          <div>
            {/* Header badges */}
            <div className="flex items-center justify-between gap-2 mb-4">
              <span className="text-[11px] font-bold tracking-widest text-neutral-700 uppercase px-3 py-1 bg-neutral-200/80 rounded-full border border-neutral-300/60">
                {currentOptionA.badge || "Alternative Approach"}
              </span>
              {currentOptionA.stats && (
                <span className="text-[11px] font-mono font-bold text-neutral-500">
                  {currentOptionA.stats.label}: <strong className="text-neutral-900">{currentOptionA.stats.value}</strong>
                </span>
              )}
            </div>

            <h4 className="font-sans text-2xl sm:text-3xl font-extrabold mb-2 text-neutral-950 tracking-tight">
              {currentOptionA.name}
            </h4>
            {currentOptionA.tagline && (
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-4">
                {currentOptionA.tagline}
              </p>
            )}
            <p className="text-neutral-600 text-sm sm:text-base mb-6 leading-relaxed">
              {currentOptionA.description}
            </p>

            {/* Mode: Clinical Factors */}
            {activeLens === 'features' && (
              <div className="space-y-3 pt-5 border-t border-neutral-200/80">
                <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 block mb-2">
                  Key Evaluation Parameters
                </span>
                {currentOptionA.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-neutral-200 text-neutral-600 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-xs font-bold">✕</span>
                    </div>
                    <span className="text-xs sm:text-sm text-neutral-700 font-medium leading-relaxed">
                      {feature}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Mode: Timeline Progression */}
            {activeLens === 'timeline' && currentOptionA.timeline && (
              <div className="pt-5 border-t border-neutral-200/80 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-900">
                    Biological Trajectory
                  </span>
                  <span className="text-xs font-mono font-bold text-neutral-500 uppercase">
                    Stage {selectedMonth.toUpperCase()}
                  </span>
                </div>
                <div className="p-4 rounded-2xl bg-white border border-neutral-200">
                  <p className="text-xs sm:text-sm text-neutral-700 leading-relaxed">
                    {currentOptionA.timeline[selectedMonth]}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="pt-6 mt-6 border-t border-neutral-200/60">
            <span className="text-xs text-neutral-500 block">
              Standard non-guided or legacy clinical alternative
            </span>
          </div>
        </motion.div>

        {/* Option B (Suga Protocol / Recommended) */}
        <motion.div
          key={`optionB-${currentDataset?.id || 'custom'}`}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className={cn(
            "rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-10 border transition-all duration-300 flex flex-col justify-between bg-neutral-950 text-white border-neutral-900 hover:border-neutral-700 relative overflow-hidden"
          )}
        >
          {/* Subtle monochromatic clinical stamp */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none -mr-10 -mt-10" />

          <div>
            {/* Header badges */}
            <div className="flex items-center justify-between gap-2 mb-4">
              <span className="text-[11px] font-bold tracking-widest text-white uppercase px-3 py-1 bg-neutral-800 rounded-full border border-neutral-700">
                {currentOptionB.badge || "Suga.health Protocol"}
              </span>
              {currentOptionB.stats && (
                <span className="text-[11px] font-mono font-bold text-neutral-300">
                  {currentOptionB.stats.label}: <strong className="text-white">{currentOptionB.stats.value}</strong>
                </span>
              )}
            </div>

            <h4 className="font-sans text-2xl sm:text-3xl font-extrabold mb-2 text-white tracking-tight">
              {currentOptionB.name}
            </h4>
            {currentOptionB.tagline && (
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-4">
                {currentOptionB.tagline}
              </p>
            )}
            <p className="text-neutral-300 text-sm sm:text-base mb-6 leading-relaxed">
              {currentOptionB.description}
            </p>

            {/* Mode: Clinical Factors */}
            {activeLens === 'features' && (
              <div className="space-y-3 pt-5 border-t border-neutral-800">
                <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block mb-2">
                  Clinical Advantages & Protocol
                </span>
                {currentOptionB.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-white text-neutral-950 flex items-center justify-center shrink-0 mt-0.5">
                      <Check size={12} strokeWidth={2.5} />
                    </div>
                    <span className="text-xs sm:text-sm text-neutral-200 font-medium leading-relaxed">
                      {feature}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Mode: Timeline Progression */}
            {activeLens === 'timeline' && currentOptionB.timeline && (
              <div className="pt-5 border-t border-neutral-800 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-white">
                    Biological Trajectory
                  </span>
                  <span className="text-xs font-mono font-bold text-neutral-400 uppercase">
                    Stage {selectedMonth.toUpperCase()}
                  </span>
                </div>
                <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800">
                  <p className="text-xs sm:text-sm text-neutral-200 leading-relaxed">
                    {currentOptionB.timeline[selectedMonth]}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="pt-6 mt-6 border-t border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-neutral-400">
              <ShieldCheck size={16} className="text-white" />
              <span>US-Licensed Physician Titration Included</span>
            </div>
            <Link
              to="/consultation"
              className="inline-flex items-center justify-center bg-white text-neutral-950 px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider hover:bg-neutral-100 transition-colors shrink-0 group"
            >
              <span>Check Eligibility</span>
              <ArrowRight size={13} className="ml-1.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

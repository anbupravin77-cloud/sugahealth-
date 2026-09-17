import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowRight, 
  Check, 
  ShieldCheck, 
  Star, 
  ChevronDown, 
  Activity, 
  Package, 
  Stethoscope, 
  ArrowUpRight
} from 'lucide-react';
import { Reveal } from '../components/ui/Reveal';
import { GsapHeaderReveal } from '../components/ui/GsapReveal';
import { ParallaxImage } from '../components/ui/Parallax';
import { AnimatedCounter } from '../components/ui/AnimatedCounter';
import { OurProductsSection } from '../components/OurProductsSection';
import { OurDoctorsSection } from '../components/OurDoctorsSection';
import { useContent } from '../context/ContentContext';
import { defaultContent } from '../data/defaultContent';

export default function Home() {
  const { content } = useContent();
  const home = content?.home || defaultContent.home;

  const [timelineCategory, setTimelineCategory] = useState<'weight' | 'hair' | 'sexual'>('weight');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const hero = home.hero;
  const specializationsData = home.specializations || [];
  const pillars = Array.isArray(specializationsData) ? specializationsData : (specializationsData as any)?.items || [];
  const timelineData = (home.timeline as any)?.items || home.timeline || {};
  const faqsRaw = home.faqs || [];
  const faqs = Array.isArray(faqsRaw) ? faqsRaw : (faqsRaw as any)?.items || [];
  const howItWorksRaw = home.howItWorks || [];
  const howItWorksSteps = Array.isArray(howItWorksRaw) ? howItWorksRaw : (howItWorksRaw as any)?.steps || [];
  const accountabilityRaw = home.accountability || [];
  const accountabilityMetrics = Array.isArray(accountabilityRaw) ? accountabilityRaw : (accountabilityRaw as any)?.metrics || [];
  const comparisonRaw = home.comparison || {};
  const comparison = comparisonRaw;
  const traditionalPoints = Array.isArray(comparisonRaw.traditional) ? comparisonRaw.traditional : (comparisonRaw.traditional as any)?.points || [];
  const sugaPoints = Array.isArray(comparisonRaw.sugaModel) ? comparisonRaw.sugaModel : (comparisonRaw.sugaModel || (comparisonRaw as any).suga)?.points || [];
  const ctaBanner = home.ctaBanner;

  const stepIcons = [Activity, Stethoscope, Package];

  return (
    <div className="flex flex-col w-full max-w-full overflow-x-hidden bg-neutral-50/50">
      
      {/* Hero Section */}
      <section className="relative pt-0 pb-10 sm:pb-14 md:pb-16 overflow-hidden bg-[#FAFAFA] border-b border-neutral-200/80 w-full max-w-full">
        {/* Marquee Ticker */}
        <div className="w-full max-w-full bg-[#F5F5F5] py-3.5 overflow-hidden border-b border-neutral-200/80">
          <div className="flex animate-marquee items-center text-[11px] font-bold text-neutral-600 uppercase tracking-widest whitespace-nowrap">
            {Array.from({ length: 4 }).map((_, i) => (
              <span key={i} className="flex items-center shrink-0">
                <span className="px-6">Fully confidential</span> <span className="text-neutral-300">✦</span>
                <span className="px-6">Free and discrete shipping</span> <span className="text-neutral-300">✦</span>
                <span className="px-6">100% online process</span> <span className="text-neutral-300">✦</span>
                <span className="px-6">Used and trusted by millions around the world.</span> <span className="text-neutral-300">✦</span>
              </span>
            ))}
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-20 md:pt-24 pb-8">
          <div className="flex flex-col items-center text-center">
            
            <Reveal delay={0.1} className="w-full flex flex-col items-center justify-center text-center">
              <h1 className="font-sans text-[20px] sm:text-4xl md:text-[2.5rem] lg:text-[2.75rem] font-normal tracking-tight text-neutral-900 leading-[1.4] text-balance text-center mx-auto w-full max-w-2xl">
                Clinically proven, FDA (USA){' '}
                <span className="inline-block sm:inline">approved,</span> <br className="hidden sm:block" />
                treatment{' '}
                <span className="inline-block sm:inline">prescribed</span> by experts.
              </h1>
            </Reveal>

            <Reveal delay={0.2} className="w-full flex justify-center text-center mt-10 sm:mt-14">
              <div className="flex flex-col items-center gap-3.5 w-full max-w-[280px] sm:max-w-[320px] mx-auto">
                <Link
                  to="/weight-loss"
                  className="w-full inline-flex items-center justify-center bg-transparent border border-neutral-300 hover:border-neutral-400 px-6 py-4 rounded-[2rem] text-[15px] text-neutral-800 transition-colors text-center"
                >
                  Medical weight loss
                </Link>
                <Link
                  to="/hair-growth"
                  className="w-full inline-flex items-center justify-center bg-transparent border border-neutral-300 hover:border-neutral-400 px-6 py-4 rounded-[2rem] text-[15px] text-neutral-800 transition-colors text-center"
                >
                  Hair growth
                </Link>
                <Link
                  to="/sexual-health"
                  className="w-full inline-flex items-center justify-center bg-transparent border border-neutral-300 hover:border-neutral-400 px-6 py-4 rounded-[2rem] text-[15px] text-neutral-800 transition-colors text-center"
                >
                  Sexual health
                </Link>
                <Link
                  to="/consultation"
                  className="w-full inline-flex items-center justify-center bg-neutral-950 hover:bg-neutral-800 text-white px-6 py-4 rounded-[2rem] text-[15px] font-medium transition-colors text-center mt-3 shadow-sm"
                >
                  Start consultation
                </Link>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Treatments Section - Modern Bento Cards */}
      <section id="treatments" className="py-10 sm:py-12 lg:py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-12 flex flex-col items-center">
          <GsapHeaderReveal className="flex flex-col items-center text-center">
            <span className="text-xs font-bold tracking-widest text-neutral-500 uppercase block mb-2.5 text-center">
              {(home.specializations as any)?.eyebrow || "Targeted Therapeutics"}
            </span>
            <h2 className="font-sans text-3xl sm:text-4xl md:text-5xl font-extrabold text-neutral-950 tracking-tight leading-[1.15] pb-1 text-balance text-center">
              {(home.specializations as any)?.title || "Focused Clinical Pathways"}
            </h2>
            <p className="mt-3.5 sm:mt-4 text-sm sm:text-base text-neutral-600 max-w-xl mx-auto text-center leading-relaxed">
              {(home.specializations as any)?.subtitle || "Precision treatment protocols designed for sustained biological optimization."}
            </p>
          </GsapHeaderReveal>
        </div>

        {/* 3 Clinical Specializations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {pillars.map((pillar) => (
            <div
              key={pillar.id}
              className="group relative bg-white rounded-2xl sm:rounded-3xl border border-neutral-200/90 hover:border-neutral-950 transition-colors duration-300 flex flex-col overflow-hidden"
            >
              {/* Image Header with Badge Overlay & Parallax */}
              <div className="relative h-56 sm:h-64 w-full overflow-hidden bg-neutral-100">
                <ParallaxImage 
                  src={pillar.img} 
                  alt={pillar.title}
                  offset={20}
                  containerClassName="w-full h-full"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/10 pointer-events-none" />

                <div className="absolute bottom-4 left-4 right-4 text-white pointer-events-none">
                  <span className="text-xs uppercase tracking-widest text-neutral-300 font-semibold block mb-0.5">
                    {pillar.subtitle}
                  </span>
                  <h3 className="font-sans text-2xl font-bold tracking-tight text-white">
                    {pillar.title}
                  </h3>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 sm:p-7 md:p-8 flex flex-col flex-grow justify-between">
                <div>
                  <p className="text-neutral-600 text-sm leading-relaxed mb-5 sm:mb-6">
                    {pillar.desc}
                  </p>

                  {/* Quick Stats Strip */}
                  <div className="grid grid-cols-2 gap-2 mb-5 sm:mb-6 p-3 sm:p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200/80">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">
                        Efficacy Rate
                      </span>
                      <span className="text-xs font-bold text-neutral-900">
                        {pillar.stats}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">
                        Expect Results
                      </span>
                      <span className="text-xs font-bold text-neutral-900">
                        {pillar.timeline}
                      </span>
                    </div>
                  </div>

                  {/* Feature Highlights */}
                  <div className="space-y-2 sm:space-y-2.5 mb-5 sm:mb-8">
                    {pillar.highlights.slice(0, 3).map((item, i) => (
                      <div key={i} className="flex items-start gap-2.5 text-xs text-neutral-700">
                        <div className="w-4 h-4 rounded-full bg-neutral-100 text-neutral-900 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-neutral-900 group-hover:text-white transition-colors">
                          <Check size={11} strokeWidth={2.5} />
                        </div>
                        <span className="font-medium leading-tight">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Link with Hover Reveal */}
                <div className="pt-4 border-t border-neutral-100 flex items-center justify-between">
                  <Link
                    to={pillar?.path || "#"}
                    className="inline-flex items-center text-xs font-bold tracking-wider uppercase text-neutral-950 group-hover:text-neutral-700 transition-colors"
                  >
                    View Protocol Details
                    <ArrowRight size={14} className="ml-1.5 group-hover:translate-x-1.5 transition-transform" />
                  </Link>
                  <Link
                    to="/consultation"
                    className="p-2.5 rounded-full bg-neutral-100 text-neutral-900 group-hover:bg-neutral-950 group-hover:text-white transition-colors"
                    title="Start Consultation"
                  >
                    <ArrowUpRight size={15} />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Interactive Clinical Timeline Section */}
      <section className="py-10 sm:py-12 lg:py-16 bg-white border-y border-neutral-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="max-w-3xl mx-auto text-center mb-8 sm:mb-12 flex flex-col items-center">
            <span className="text-xs font-bold tracking-widest text-neutral-500 uppercase block mb-2 text-center">
              {home.timeline.eyebrow}
            </span>
            <h2 className="font-sans text-3xl sm:text-4xl md:text-5xl font-extrabold text-neutral-950 tracking-tight mb-4 text-center">
              {home.timeline.title}
            </h2>
            <p className="text-neutral-600 text-base sm:text-lg max-w-2xl mx-auto text-center">
              {home.timeline.subtitle}
            </p>

            {/* Timeline Program Toggle */}
            <div className="flex flex-wrap sm:inline-flex justify-center items-center gap-1.5 sm:gap-2 p-1.5 bg-neutral-100 rounded-2xl sm:rounded-full mt-6 sm:mt-8 border border-neutral-200 max-w-full">
              <button
                onClick={() => setTimelineCategory('weight')}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-full text-xs font-bold tracking-wide uppercase transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 cursor-pointer whitespace-nowrap ${
                  timelineCategory === 'weight' ? 'bg-neutral-950 text-white shadow-xs' : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60'
                }`}
              >
                Weight Loss (GLP-1)
              </button>
              <button
                onClick={() => setTimelineCategory('hair')}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-full text-xs font-bold tracking-wide uppercase transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 cursor-pointer whitespace-nowrap ${
                  timelineCategory === 'hair' ? 'bg-neutral-950 text-white shadow-xs' : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60'
                }`}
              >
                Hair Regrowth
              </button>
              <button
                onClick={() => setTimelineCategory('sexual')}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-full text-xs font-bold tracking-wide uppercase transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 cursor-pointer whitespace-nowrap ${
                  timelineCategory === 'sexual' ? 'bg-neutral-950 text-white shadow-xs' : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60'
                }`}
              >
                Sexual Vitality
              </button>
            </div>
          </div>

          {/* Timeline Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {(timelineData[timelineCategory] || []).map((step, idx) => (
              <div 
                key={idx}
                className="group bg-neutral-50/80 rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-neutral-200/90 relative flex flex-col justify-between hover:bg-white hover:border-neutral-950 transition-all duration-300"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className="px-3 py-1 rounded-full bg-neutral-950 text-white text-xs font-bold tracking-wider uppercase">
                      {step.phase}
                    </span>
                    <span className="text-xs font-bold text-neutral-400 group-hover:text-neutral-950 transition-colors">Step 0{idx + 1}</span>
                  </div>
                  <h3 className="font-sans text-xl font-bold text-neutral-950 mb-3 tracking-tight">
                    {step.label}
                  </h3>
                  <p className="text-neutral-600 text-sm leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 sm:mt-10 text-center">
            <Link
              to="/consultation"
              className="inline-flex items-center justify-center bg-neutral-950 border border-neutral-950 px-8 py-3.5 rounded-full text-xs font-bold tracking-wider uppercase text-white hover:bg-neutral-800 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] shadow-xs group"
            >
              See if you qualify today
              <ArrowRight size={14} className="ml-2 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

        </div>
      </section>

      {/* How Suga Works - 3-Step Seamless Process */}
      <section className="py-10 sm:py-12 lg:py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <GsapHeaderReveal className="max-w-2xl mx-auto text-center mb-8 sm:mb-12 flex flex-col items-center">
          <span className="text-xs font-bold tracking-widest text-neutral-500 uppercase block mb-2 text-center">
            {(home.howItWorks as any)?.eyebrow || "Intake Protocol"}
          </span>
          <h2 className="font-sans text-3xl sm:text-4xl md:text-5xl font-extrabold text-neutral-950 tracking-tight leading-[1.15] pb-1 text-center">
            {(home.howItWorks as any)?.title || "Clear. Fast. Confidential."}
          </h2>
          <p className="mt-3.5 sm:mt-4 text-neutral-600 text-base sm:text-lg max-w-xl mx-auto text-center leading-relaxed">
            {(home.howItWorks as any)?.subtitle || "A frictionless medical pathway designed for immediate evaluation and discreet doorstep delivery."}
          </p>
        </GsapHeaderReveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {howItWorksSteps.map((item, idx) => {
            const Icon = stepIcons[idx % stepIcons.length];
            return (
              <div 
                key={idx}
                className="group rounded-2xl sm:rounded-3xl bg-white p-6 sm:p-8 lg:p-10 border border-neutral-200/90 hover:border-neutral-950 transition-colors duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-6 sm:mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-950 group-hover:bg-neutral-950 group-hover:text-white transition-colors">
                      <Icon size={24} />
                    </div>
                    <span className="text-xs font-bold text-neutral-600 bg-neutral-100 px-3 py-1 rounded-full uppercase tracking-wider border border-neutral-200/60">
                      {item.time}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest block mb-2">
                    Step {item.step}
                  </span>
                  <h3 className="font-sans text-2xl font-bold text-neutral-950 mb-3 tracking-tight">
                    {item.title}
                  </h3>
                  <p className="text-neutral-600 text-sm leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Trust Metrics Section */}
      <section className="py-10 sm:py-12 lg:py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <GsapHeaderReveal className="text-center max-w-2xl mx-auto mb-8 sm:mb-12">
          <span className="text-xs font-bold tracking-widest text-neutral-500 uppercase block mb-2">
            {(home.accountability as any)?.eyebrow || "Clinical Standards"}
          </span>
          <h2 className="font-sans text-3xl sm:text-4xl md:text-5xl font-extrabold text-neutral-950 tracking-tight leading-[1.15] pb-1">
            {(home.accountability as any)?.title || "Metrics that matter."}
          </h2>
        </GsapHeaderReveal>

        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 text-center">
          {accountabilityMetrics.map((m, idx) => (
            <div key={idx} className="bg-white p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-neutral-200/90 hover:border-neutral-950 transition-colors duration-300">
              <span className="font-sans text-4xl sm:text-5xl font-extrabold text-neutral-950 block mb-2">
                {m.value}
              </span>
              <span className="text-xs font-bold text-neutral-900 uppercase tracking-widest block mb-2">{m.label || (m as any).title}</span>
              <p className="text-xs text-neutral-500">{m.description || (m as any).desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Comparison: Suga vs Traditional Clinic */}
      <section className="py-10 sm:py-12 lg:py-16 bg-neutral-950 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <GsapHeaderReveal className="text-center max-w-2xl mx-auto mb-8 sm:mb-12 flex flex-col items-center">
            <span className="text-xs font-bold tracking-widest text-neutral-400 uppercase block mb-2 text-center">
              {comparison.eyebrow}
            </span>
            <h2 className="font-sans text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.15] pb-1 text-center">
              {comparison.title}
            </h2>
          </GsapHeaderReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            <div className="group rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-10 bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-colors">
              <span className="text-xs font-bold tracking-wider text-neutral-400 uppercase block mb-4">
                {(home.comparison as any)?.traditional?.title || "Traditional System"}
              </span>
              <ul className="space-y-3.5 text-sm text-neutral-400">
                {traditionalPoints.map((p, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="text-neutral-600 font-bold">✕</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="group rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-10 bg-white text-neutral-950 border border-neutral-200/90 hover:border-neutral-950 transition-colors">
              <span className="text-xs font-bold tracking-wider text-neutral-500 uppercase block mb-4">
                {(home.comparison as any)?.suga?.title || "The Suga Model"}
              </span>
              <ul className="space-y-3.5 text-sm text-neutral-800">
                {sugaPoints.map((p, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-neutral-950 text-white flex items-center justify-center shrink-0 mt-0.5 text-xs group-hover:scale-105 transition-transform">✓</span>
                    <span className="font-medium">{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Our Doctors Section */}
      <OurDoctorsSection />

      {/* Our Products Section */}
      <OurProductsSection />

      {/* Patient FAQ Accordion */}
      <section className="py-10 sm:py-12 lg:py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12 flex flex-col items-center">
          <span className="text-xs font-bold tracking-widest text-neutral-500 uppercase block mb-2 text-center">
            {(home.faqs as any)?.eyebrow || "Patient Education"}
          </span>
          <h2 className="font-sans text-3xl sm:text-4xl md:text-5xl font-extrabold text-neutral-950 tracking-tight text-center">
            {(home.faqs as any)?.title || "Common Questions"}
          </h2>
          <p className="mt-3 text-neutral-600 text-sm sm:text-base text-center max-w-xl mx-auto">
            {(home.faqs as any)?.subtitle || "Straightforward answers about our clinical protocols and prescription process."}
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div 
                key={index}
                className="rounded-2xl bg-white border border-neutral-200/90 hover:border-neutral-950 transition-colors overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 focus:outline-none"
                >
                  <span className="font-sans font-bold text-base sm:text-lg text-neutral-950">
                    {faq.q}
                  </span>
                  <ChevronDown 
                    size={18} 
                    className={`text-neutral-500 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 text-neutral-950' : ''}`}
                  />
                </button>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 sm:px-6 sm:pb-6 text-sm sm:text-base text-neutral-600 leading-relaxed border-t border-neutral-100 pt-4">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </section>

      {/* Final Call to Action Banner */}
      <section className="py-10 sm:py-12 lg:py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="rounded-2xl sm:rounded-3xl bg-neutral-950 text-white p-6 sm:p-10 md:p-14 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 sm:gap-8 border border-neutral-900">
          <div className="max-w-2xl">
            <span className="text-xs font-bold tracking-widest text-neutral-400 uppercase block mb-2 sm:mb-3">
              {ctaBanner.eyebrow}
            </span>
            <h2 className="font-sans text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-3 sm:mb-4">
              {ctaBanner.title}
            </h2>
            <p className="text-neutral-400 text-base sm:text-lg">
              {ctaBanner.subtitle}
            </p>
          </div>
          <div className="shrink-0 w-full sm:w-auto">
            <Link
              to={(ctaBanner as any)?.cta?.path || ctaBanner.buttonLink}
              className="w-full sm:w-auto inline-flex items-center justify-center bg-white text-neutral-950 px-8 py-3.5 sm:py-4 rounded-full text-sm font-bold tracking-wider uppercase hover:bg-neutral-100 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] shadow-sm border border-white group"
            >
              {(ctaBanner as any)?.cta?.label || ctaBanner.buttonText}
              <ArrowRight size={16} className="ml-2.5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}

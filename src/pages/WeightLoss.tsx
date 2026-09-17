import { PageHeader, Section } from '../components/ui/Layout';
import { Reveal } from '../components/ui/Reveal';
import { Comparison } from '../components/ui/Comparison';
import { Link } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import { useContent } from '../context/ContentContext';
import { defaultContent } from '../data/defaultContent';

export default function WeightLoss() {
  const { content } = useContent();
  const wl = content?.weightLoss || defaultContent.weightLoss;

  const header = wl.header;
  const science = wl.science;
  const pillars = wl.pillars;
  const medications = wl.medications;
  const comparison = wl.comparison;
  const ctaBanner = wl.ctaBanner;

  return (
    <div className="bg-background">
      <PageHeader 
        title={header.title}
        subtitle={header.subtitle}
        image={header.image}
      />

      {/* The Science & Core Pillars */}
      <Section background="surface">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          <div className="lg:col-span-5 relative lg:sticky lg:top-32">
            <Reveal>
              <span className="text-xs font-bold tracking-widest text-neutral-500 uppercase block mb-3">
                {science.eyebrow}
              </span>
              <h2 className="font-sans text-3xl sm:text-4xl md:text-5xl font-extrabold text-neutral-950 leading-tight mb-6">
                {science.title}
              </h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="text-neutral-600 text-base sm:text-lg leading-relaxed mb-6">
                {science.description}
              </p>
              <div className="p-5 sm:p-6 rounded-2xl bg-white border border-neutral-200/90">
                <span className="text-xs font-bold text-neutral-950 block mb-1">{science.factLabel}:</span>
                <span className="text-xs text-neutral-600 leading-normal">
                  {science.factText}
                </span>
              </div>
            </Reveal>
          </div>
          
          <div className="lg:col-span-7 space-y-4 sm:space-y-6">
            {(Array.isArray(pillars) ? pillars : (pillars as any)?.items || []).map((item, idx) => (
              <div key={idx}>
                <Reveal delay={0.15 * idx}>
                  <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-neutral-200/90 hover:border-neutral-950 transition-colors duration-300">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-bold px-3 py-1 rounded-full bg-neutral-100 text-neutral-800 border border-neutral-200/60">
                        {item.tag}
                      </span>
                      <span className="font-mono text-sm font-bold text-neutral-400">{item.num}</span>
                    </div>
                    <h3 className="font-sans text-xl sm:text-2xl font-bold mb-2 text-neutral-950">
                      {item.title}
                    </h3>
                    <p className="text-neutral-600 text-sm sm:text-base leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </Reveal>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Medication Options Grid */}
      <Section>
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl mx-auto text-center mb-8 sm:mb-12">
            <span className="text-xs font-bold tracking-widest text-neutral-500 uppercase block mb-2">
              Available Formulations
            </span>
            <h2 className="font-sans text-3xl sm:text-4xl md:text-5xl font-extrabold text-neutral-950 tracking-tight">
              Evidence-based treatments prescribed for you.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 mb-10 sm:mb-12">
            {(Array.isArray(medications) ? medications : (medications as any)?.items || []).map((med, idx) => (
              <div 
                key={idx}
                className={`rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-10 border border-neutral-200/90 hover:border-neutral-950 transition-all duration-300 flex flex-col justify-between ${idx === 1 ? 'bg-white' : 'bg-neutral-50/80 hover:bg-white'}`}
              >
                <div>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-4 inline-block ${idx === 1 ? 'bg-neutral-950 text-white border border-neutral-950' : 'bg-neutral-200 text-neutral-800 border border-neutral-300/50'}`}>
                    {med.tag}
                  </span>
                  <h3 className="font-sans text-2xl sm:text-3xl font-bold text-neutral-950 mb-3">
                    {med.title || (med as any).name}
                  </h3>
                  <p className="text-neutral-600 text-sm leading-relaxed mb-6">
                    {med.desc || (med as any).description}
                  </p>
                  <div className="space-y-2.5 mb-8">
                    {(med.benefits || (med as any).highlights || []).map((hl, hIdx) => (
                      <div key={hIdx} className="flex items-center gap-2.5 text-xs font-medium text-neutral-700">
                        <Check size={14} className="text-neutral-950 shrink-0" />
                        <span>{hl}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <Link
                  to={med.ctaPath}
                  className="w-full text-center py-3.5 rounded-full bg-neutral-950 border border-neutral-950 text-white text-xs font-bold uppercase tracking-wider hover:bg-neutral-800 transition-colors"
                >
                  {med.ctaLabel}
                </Link>
              </div>
            ))}
          </div>

          {/* Interactive Treatment & Protocol Comparison */}
          <div className="mt-12 sm:mt-16 pt-8 sm:pt-12 border-t border-neutral-200/80">
            <div className="max-w-2xl mx-auto text-center mb-6 sm:mb-10">
              <span className="text-xs font-bold tracking-widest text-neutral-500 uppercase block mb-2">
                {comparison.eyebrow}
              </span>
              <h3 className="font-sans text-2xl sm:text-3xl md:text-4xl font-extrabold text-neutral-950 tracking-tight">
                {comparison.title}
              </h3>
              <p className="mt-3 text-neutral-600 text-sm sm:text-base">
                {comparison.subtitle}
              </p>
            </div>
            <Comparison mode="weight-loss" />
          </div>
        </div>
      </Section>

      {/* CTA Footer Section */}
      <Section background="surface">
        <div className="max-w-3xl mx-auto text-center py-4 sm:py-6">
          <Reveal>
            <h2 className="font-sans text-3xl sm:text-4xl md:text-5xl font-extrabold text-neutral-950 mb-4 sm:mb-6 tracking-tight">
              {ctaBanner.title}
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="text-neutral-600 text-base sm:text-lg leading-relaxed mb-6 sm:mb-8 max-w-xl mx-auto">
              {ctaBanner.subtitle}
            </p>
          </Reveal>
          <Reveal delay={0.2}>
            <Link 
              to={ctaBanner.ctaPath} 
              className="inline-flex items-center justify-center bg-neutral-950 border border-neutral-950 px-8 py-3.5 sm:py-4 rounded-full text-xs font-bold tracking-wider uppercase text-white hover:bg-neutral-800 transition-all group"
            >
              {ctaBanner.ctaLabel}
              <ArrowRight size={16} className="ml-2.5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Reveal>
        </div>
      </Section>
    </div>
  );
}

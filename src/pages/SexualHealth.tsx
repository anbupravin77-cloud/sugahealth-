import { PageHeader, Section } from '../components/ui/Layout';
import { Reveal } from '../components/ui/Reveal';
import { Link } from 'react-router-dom';
import { ArrowRight, Lock, EyeOff, Package } from 'lucide-react';
import { useContent } from '../context/ContentContext';
import { defaultContent } from '../data/defaultContent';

export default function SexualHealth() {
  const { content } = useContent();
  const sh = content?.sexualHealth || defaultContent.sexualHealth;

  const header = sh.header;
  const conditions = sh.conditions;
  const cardiovascular = sh.cardiovascular;
  const privacy = sh.privacy;
  const ctaBanner = sh.ctaBanner;

  const privacyIcons = [Package, EyeOff, Lock];

  return (
    <div className="bg-background">
      <PageHeader 
        title={header.title}
        subtitle={header.subtitle}
        image={header.image}
      />

      {/* Conditions Treated Grid */}
      <Section background="surface">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl mx-auto text-center mb-8 sm:mb-12">
            <span className="text-xs font-bold tracking-widest text-neutral-500 uppercase block mb-2">
              {(conditions as any)?.eyebrow || "Treated Conditions"}
            </span>
            <h2 className="font-sans text-3xl sm:text-4xl md:text-5xl font-extrabold text-neutral-950 tracking-tight">
              {(conditions as any)?.title || "Comprehensive Coverage"}
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {(Array.isArray(conditions) ? conditions : (conditions as any)?.items || []).map((item, idx) => (
              <div 
                key={idx}
                className="group bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-neutral-200/90 hover:border-neutral-950 transition-colors duration-300 flex flex-col justify-between"
              >
                <div>
                  <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-neutral-100 text-neutral-800 uppercase tracking-wider mb-4 inline-block border border-neutral-200/60">
                    {item.stat}
                  </span>
                  <h3 className="font-sans text-2xl font-bold mb-3 text-neutral-950">
                    {item.title}
                  </h3>
                  <p className="text-neutral-600 text-sm leading-relaxed mb-6">
                    {item.desc}
                  </p>
                </div>
                <div className="pt-4 border-t border-neutral-100">
                  <span className="text-xs font-semibold text-neutral-900 block mb-3">
                    {item.meds}
                  </span>
                  <Link
                    to="/consultation"
                    className="inline-flex items-center text-xs font-bold uppercase tracking-wider text-neutral-950 group-hover:text-neutral-700 transition-colors"
                  >
                    Assess Eligibility <ArrowRight size={14} className="ml-1.5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Medical Insight Callout */}
      <Section>
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 items-center">
          <div className="md:col-span-7">
            <span className="text-xs font-bold tracking-widest text-neutral-500 uppercase block mb-2">
              {cardiovascular.eyebrow}
            </span>
            <h2 className="font-sans text-3xl sm:text-4xl font-extrabold text-neutral-950 tracking-tight mb-4">
              {cardiovascular.title}
            </h2>
            {cardiovascular.paragraphs && cardiovascular.paragraphs.length > 0 ? (
              cardiovascular.paragraphs.map((para, idx) => (
                <p key={idx} className="text-neutral-600 text-base leading-relaxed mb-4 last:mb-0">
                  {para}
                </p>
              ))
            ) : (
              <>
                <p className="text-neutral-600 text-base leading-relaxed mb-4">
                  {(cardiovascular as any).p1 || 'Penile arteries are among the smallest vascular channels in the body.'}
                </p>
                <p className="text-neutral-600 text-base leading-relaxed">
                  {(cardiovascular as any).p2 || 'Vascular performance is intimately tied to whole-body cardiovascular function.'}
                </p>
              </>
            )}
          </div>
          <div className="md:col-span-5 bg-neutral-950 text-white p-6 sm:p-8 rounded-2xl sm:rounded-3xl text-center border border-neutral-900">
            <span className="text-5xl font-extrabold tracking-tight block mb-2 text-white">
              {cardiovascular.statNumber}
            </span>
            <span className="text-xs font-bold tracking-widest uppercase text-neutral-400 block mb-3">
              {cardiovascular.statLabel}
            </span>
            <p className="text-xs text-neutral-300 leading-relaxed">
              {cardiovascular.statDesc || (cardiovascular as any).statDescription}
            </p>
          </div>
        </div>
      </Section>

      {/* Discretion & Privacy Pillars */}
      <Section background="surface">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl mx-auto text-center mb-8 sm:mb-12">
            <span className="text-xs font-bold tracking-widest text-neutral-500 uppercase block mb-2">
              {(privacy as any)?.eyebrow || "Discretion"}
            </span>
            <h2 className="font-sans text-3xl sm:text-4xl md:text-5xl font-extrabold text-neutral-950 tracking-tight">
              {(privacy as any)?.title || "Total Privacy"}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {(Array.isArray(privacy) ? privacy : (privacy as any)?.items || []).map((item, idx) => {
              const Icon = privacyIcons[idx % privacyIcons.length];
              return (
                <div key={idx} className="p-6 sm:p-8 rounded-2xl sm:rounded-3xl bg-white border border-neutral-200/90 hover:border-neutral-950 transition-colors duration-300">
                  <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-950 mb-6 border border-neutral-200/60">
                    <Icon size={20} />
                  </div>
                  <h3 className="font-sans text-xl font-bold text-neutral-950 mb-2">
                    {item.title}
                  </h3>
                  <p className="text-neutral-600 text-sm leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </Section>

      {/* CTA Footer Section */}
      <Section>
        <div className="max-w-3xl mx-auto text-center py-4 sm:py-6">
          <Reveal>
            <h2 className="font-sans text-3xl sm:text-4xl md:text-5xl font-extrabold text-neutral-950 mb-4 sm:mb-6 tracking-tight">
              {ctaBanner.title}
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="text-neutral-600 text-base sm:text-lg leading-relaxed mb-6 sm:mb-8 max-w-xl mx-auto">
              {ctaBanner.description || (ctaBanner as any).subtitle}
            </p>
          </Reveal>
          <Reveal delay={0.2}>
            <Link 
              to={(ctaBanner as any).ctaPath || ctaBanner.buttonLink} 
              className="inline-flex items-center justify-center bg-neutral-950 border border-neutral-950 px-8 py-3.5 sm:py-4 rounded-full text-xs font-bold tracking-wider uppercase text-white hover:bg-neutral-800 transition-all group"
            >
              {(ctaBanner as any).ctaLabel || ctaBanner.buttonText}
              <ArrowRight size={16} className="ml-2.5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Reveal>
        </div>
      </Section>
    </div>
  );
}

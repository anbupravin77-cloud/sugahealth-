import { PageHeader, Section } from '../components/ui/Layout';
import { Reveal } from '../components/ui/Reveal';
import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, HeartPulse, Stethoscope } from 'lucide-react';
import { AnimatedCounter } from '../components/ui/AnimatedCounter';
import { useContent } from '../context/ContentContext';
import { defaultContent } from '../data/defaultContent';

export default function About() {
  const { content } = useContent();
  const ab = content?.about || defaultContent.about;

  const header = ab.header;
  const mission = ab.mission;
  const standards = ab.standards;
  const safety = ab.safety;
  const metrics = ab.metrics;
  const ctaBanner = ab.ctaBanner;

  const standardIcons = [Stethoscope, ShieldCheck, HeartPulse];

  return (
    <div className="bg-background">
      <PageHeader 
        title={header.title}
        subtitle={header.subtitle}
        image={header.image}
      />

      {/* Philosophy of "Live naturally" */}
      <Section>
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          <div className="lg:col-span-5">
            <Reveal>
              <span className="text-xs font-bold tracking-widest text-neutral-500 uppercase block mb-3">
                {mission.eyebrow}
              </span>
              <h2 className="font-sans text-3xl sm:text-4xl md:text-5xl font-extrabold text-neutral-950 leading-tight mb-4">
                {mission.title}
              </h2>
              <span className="text-lg sm:text-xl font-medium text-neutral-600 block mt-2 tracking-tight">
                {mission.tagline}
              </span>
            </Reveal>
          </div>
          <div className="lg:col-span-7 space-y-4 sm:space-y-6 text-neutral-700 text-base sm:text-lg leading-relaxed">
            <Reveal delay={0.1}>
              <p>
                {mission.p1}
              </p>
            </Reveal>
            <Reveal delay={0.2}>
              <p>
                {mission.p2}
              </p>
            </Reveal>
            <Reveal delay={0.3}>
              <p className="text-neutral-500 font-medium">
                {mission.p3}
              </p>
            </Reveal>
          </div>
        </div>
      </Section>

      {/* Three Core Principles */}
      <Section background="surface">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl mx-auto text-center mb-8 sm:mb-12">
            <span className="text-xs font-bold tracking-widest text-neutral-500 uppercase block mb-2">
              {(standards as any)?.eyebrow || "Clinical Philosophy"}
            </span>
            <h2 className="font-sans text-3xl sm:text-4xl md:text-5xl font-extrabold text-neutral-950 tracking-tight">
              {(standards as any)?.title || "Standard of Care"}
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {(Array.isArray(standards) ? standards : (standards as any)?.items || []).map((item, idx) => {
              const Icon = standardIcons[idx % standardIcons.length];
              return (
                <div key={idx} className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-neutral-200/90 hover:border-neutral-950 transition-colors duration-300">
                  <div className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-950 mb-6 border border-neutral-200/60">
                    <Icon size={24} />
                  </div>
                  <h3 className="font-sans text-xl font-bold text-neutral-950 mb-3">
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

      {/* Safety & Compliance Section */}
      <Section id="safety">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-12 lg:gap-16 items-start">
          <div className="lg:col-span-5 relative lg:sticky lg:top-32">
            <Reveal>
              <span className="text-xs font-bold tracking-widest text-neutral-500 uppercase block mb-3">
                {(safety as any)?.eyebrow || "Pharmacy & Compliance"}
              </span>
              <h2 className="font-sans text-3xl sm:text-4xl md:text-5xl font-extrabold text-neutral-950 leading-tight mb-4">
                {(safety as any)?.title || "Safety Without Compromise"}
              </h2>
              <p className="text-neutral-600 text-base leading-relaxed">
                {safety.subtitle}
              </p>
            </Reveal>
          </div>
          
          <div className="lg:col-span-7 space-y-4 sm:space-y-6">
            {(Array.isArray(safety) ? safety : (safety as any)?.items || []).map((item, idx) => (
              <div key={idx} className="bg-neutral-50/80 p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-neutral-200/90 hover:border-neutral-950 transition-colors duration-300">
                <h3 className="font-sans text-lg font-bold text-neutral-950 mb-2">
                  {item.title}
                </h3>
                <p className="text-neutral-600 text-sm leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Trust Metrics */}
      <Section background="surface">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 text-center">
          {(Array.isArray(metrics) ? metrics : (metrics as any)?.items || []).map((m, idx) => {
            // Extract numeric part for counter if applicable
            const valStr = String(m?.value ?? '');
            const numMatch = valStr.match(/[\d.]+/);
            const num = numMatch ? parseFloat(numMatch[0]) : (typeof m?.value === 'number' ? m.value : 0);
            const prefix = m?.prefix || (valStr.includes('<') ? '< ' : '');
            const suffix = m?.suffix || (valStr.includes('%') ? '%' : valStr.includes('Min') ? ' Min' : valStr.includes('h') ? 'h' : '');

            return (
              <div key={idx} className="bg-white p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-neutral-200/90 hover:border-neutral-950 transition-colors duration-300">
                <span className="font-sans text-4xl sm:text-5xl font-extrabold text-neutral-950 block mb-2">
                  <AnimatedCounter value={num} prefix={prefix} suffix={suffix} duration={1.1} />
                </span>
                <span className="text-xs font-bold text-neutral-900 uppercase tracking-widest block mb-2">{m?.label || m?.title || ''}</span>
                <p className="text-xs text-neutral-500">{m?.desc || ''}</p>
              </div>
            );
          })}
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

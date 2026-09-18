import { PageHeader, Section } from '../components/ui/Layout';
import { Reveal } from '../components/ui/Reveal';
import { Comparison } from '../components/ui/Comparison';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useContent } from '../context/ContentContext';
import { defaultContent } from '../data/defaultContent';

export default function HairGrowth() {
  const { content } = useContent();
  const hg = content?.hairGrowth || defaultContent.hairGrowth;

  const header = hg.header;
  const science = hg.science;
  const pillars = hg.pillars;
  const comparison = hg.comparison;
  const growthCycle = (hg as any).growthCycle || {
    eyebrow: "The Growth Cycle",
    title: "What to expect during the first 12 months.",
    phases: [
      {
        phase: "Months 1–3",
        title: "Follicular Reset",
        desc: "Weak, miniaturized hairs shed to make room for robust new growth. DHT is successfully blocked at the follicle base."
      },
      {
        phase: "Months 4–6",
        title: "Early Regrowth",
        desc: "Fine new hairs emerge. Overall shedding drops dramatically. Hair texture begins feeling thicker and more resilient."
      },
      {
        phase: "Months 9–12+",
        title: "Noticeable Density",
        desc: "Significant improvement in scalp coverage and hair density. Routine maintenance maintains all clinical gains permanently."
      }
    ]
  };
  const ctaBanner = hg.ctaBanner;

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
                <span className="text-xs font-bold text-neutral-950 block mb-1">{(science as any).factLabel || "Clinical Fact"}:</span>
                <span className="text-xs text-neutral-600 leading-normal">
                  {science.clinicalFact || (science as any).factText}
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

      {/* Comparison: Interactive Protocol Comparison */}
      <Section>
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl mx-auto text-center mb-6 sm:mb-10">
            <span className="text-xs font-bold tracking-widest text-neutral-500 uppercase block mb-2">
              {comparison.eyebrow}
            </span>
            <h2 className="font-sans text-3xl sm:text-4xl md:text-5xl font-extrabold text-neutral-950 tracking-tight">
              {comparison.title}
            </h2>
            <p className="mt-3 text-neutral-600 text-sm sm:text-base">
              {comparison.description || (comparison as any).subtitle}
            </p>
          </div>

          <Comparison mode="hair-growth" />
        </div>
      </Section>

      {/* Timeline Expectations */}
      <Section background="surface">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <span className="text-xs font-bold tracking-widest text-neutral-500 uppercase block mb-2">
              {(growthCycle as any)?.eyebrow || "Biological Timeline"}
            </span>
            <h2 className="font-sans text-3xl sm:text-4xl font-extrabold text-neutral-950 tracking-tight">
              {(growthCycle as any)?.title || "The Growth Cycle"}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(Array.isArray(growthCycle) ? growthCycle : (growthCycle as any)?.phases || []).map((item, idx) => (
              <div 
                key={idx} 
                className={`p-6 sm:p-8 rounded-2xl sm:rounded-3xl bg-white border transition-colors ${idx === 2 ? 'border-neutral-950 text-neutral-950 hover:bg-neutral-50/50' : 'border-neutral-200/90 hover:border-neutral-950'}`}
              >
                <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase block w-fit mb-4 ${idx === 2 ? 'bg-neutral-950 text-white' : 'bg-neutral-100 text-neutral-800 border border-neutral-200/60'}`}>
                  {item.phase}
                </span>
                <h4 className="font-sans text-lg font-bold text-neutral-950 mb-2">{item.title}</h4>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
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

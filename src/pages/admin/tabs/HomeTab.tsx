import { useState } from 'react';
import { HomeContent } from '../../../types/content';
import { ImageUploadField } from '../ImageUploadField';
import { Plus, Trash2, ArrowRight } from 'lucide-react';

interface HomeTabProps {
  data: HomeContent;
  onChange: (updated: HomeContent) => void;
}

export function HomeTab(props: HomeTabProps) {
  const data = props?.data || ({} as any);
  const onChange = props?.onChange || (() => {});
  const [activeSection, setActiveSection] = useState<
    'hero' | 'specializations' | 'timeline' | 'howItWorks' | 'accountability' | 'comparison' | 'faqs' | 'cta'
  >('hero');

  const updateHeroTrustMetric = (idx: number, field: string, val: any) => {
    const metrics = [...data.hero.trustMetrics];
    metrics[idx] = { ...metrics[idx], [field]: val };
    onChange({
      ...data,
      hero: { ...data.hero, trustMetrics: metrics },
    });
  };


  const addSpecialization = () => {
    onChange({ ...data, specializations: [...data.specializations, { title: 'New', subtitle: 'Desc', icon: 'Heart', highlights: [] }] });
  };
  const removeSpecialization = (idx: number) => {
    onChange({ ...data, specializations: data.specializations.filter((_, i) => i !== idx) });
  };
  const addTimelineStep = (cat: 'weight' | 'hair' | 'sexual') => {
    const updated = [...data.timeline[cat], { phase: 'Phase', label: 'Label', description: 'Desc' }];
    onChange({ ...data, timeline: { ...data.timeline, [cat]: updated } });
  };
  const removeTimelineStep = (cat: 'weight' | 'hair' | 'sexual', idx: number) => {
    const updated = data.timeline[cat].filter((_, i) => i !== idx);
    onChange({ ...data, timeline: { ...data.timeline, [cat]: updated } });
  };
  const addHowItWorksStep = () => {
    onChange({ ...data, howItWorks: [...data.howItWorks, { time: '01', title: 'New Step', desc: 'Desc' }] });
  };
  const removeHowItWorksStep = (idx: number) => {
    onChange({ ...data, howItWorks: data.howItWorks.filter((_, i) => i !== idx) });
  };
  const addAccountability = () => {
    onChange({ ...data, accountability: [...data.accountability, { value: 0, suffix: '%', title: 'Metric', desc: 'Desc' }] });
  };
  const removeAccountability = (idx: number) => {
    onChange({ ...data, accountability: data.accountability.filter((_, i) => i !== idx) });
  };

  const updateSpecialization = (index: number, field: string, val: any) => {
    const updated = [...data.specializations];
    updated[index] = { ...updated[index], [field]: val };
    onChange({ ...data, specializations: updated });
  };

  const updateHighlight = (itemIdx: number, hlIdx: number, val: string) => {
    const updated = [...data.specializations];
    const hls = [...updated[itemIdx].highlights];
    hls[hlIdx] = val;
    updated[itemIdx] = { ...updated[itemIdx], highlights: hls };
    onChange({ ...data, specializations: updated });
  };

  const updateTimelineStep = (cat: 'weight' | 'hair' | 'sexual', idx: number, field: 'phase' | 'label' | 'description', val: string) => {
    const updatedCat = [...data.timeline[cat]];
    updatedCat[idx] = { ...updatedCat[idx], [field]: val };
    onChange({
      ...data,
      timeline: {
        ...data.timeline,
        [cat]: updatedCat,
      },
    });
  };

  const updateHowItWorksStep = (idx: number, field: 'time' | 'title' | 'desc', val: string) => {
    const updated = [...data.howItWorks];
    updated[idx] = { ...updated[idx], [field]: val };
    onChange({ ...data, howItWorks: updated });
  };

  const updateAccountability = (idx: number, field: string, val: any) => {
    const updated = [...data.accountability];
    updated[idx] = { ...updated[idx], [field]: val };
    onChange({ ...data, accountability: updated });
  };

  const updateComparisonPoint = (side: 'traditional' | 'sugaModel', idx: number, val: string) => {
    const points = [...data.comparison[side]];
    points[idx] = val;
    onChange({
      ...data,
      comparison: {
        ...data.comparison,
        [side]: points,
      },
    });
  };

  const updateFaq = (idx: number, field: 'q' | 'a', val: string) => {
    const updated = [...data.faqs];
    updated[idx] = { ...updated[idx], [field]: val };
    onChange({ ...data, faqs: updated });
  };

  const addFaq = () => {
    const updated = [
      ...data.faqs,
      {
        q: 'New clinical question',
        a: 'Provide a thoughtful medical explanation here.',
      },
    ];
    onChange({ ...data, faqs: updated });
  };

  const removeFaq = (idx: number) => {
    onChange({ ...data, faqs: data.faqs.filter((_, i) => i !== idx) });
  };

  const navButtons = [
    { id: 'hero', label: 'Hero Header' },
    { id: 'specializations', label: 'Specializations (3 Cards)' },
    { id: 'timeline', label: 'Clinical Timelines' },
    { id: 'howItWorks', label: 'How It Works (3 Steps)' },
    { id: 'accountability', label: 'Accountability Stats' },
    { id: 'comparison', label: 'Traditional vs Suga' },
    { id: 'faqs', label: 'Patient FAQs' },
    { id: 'cta', label: 'Bottom CTA Banner' },
  ];

  return (
    <div className="space-y-6">
      
      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-neutral-200/60 rounded-xl">
        {navButtons.map((btn) => (
          <button
            key={btn.id}
            type="button"
            onClick={() => setActiveSection(btn.id as any)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeSection === btn.id
                ? 'bg-white text-neutral-950 shadow-xs'
                : 'text-neutral-600 hover:text-neutral-950'
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Hero Section */}
      {activeSection === 'hero' && (
        <div className="bg-white p-6 rounded-2xl border border-neutral-200 space-y-5">
          <h3 className="font-sans text-base font-bold text-neutral-950">Hero Header Section</h3>
          
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
              Headline
            </label>
            <input
              type="text"
              value={data.hero.title}
              onChange={(e) => onChange({ ...data, hero: { ...data.hero, title: e.target.value } })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:border-neutral-950 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
              Sub-description
            </label>
            <textarea
              rows={3}
              value={data.hero.description}
              onChange={(e) => onChange({ ...data, hero: { ...data.hero, description: e.target.value } })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:border-neutral-950 leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 space-y-2">
              <span className="text-xs font-bold uppercase text-neutral-700">Primary CTA</span>
              <input
                type="text"
                placeholder="Button Label"
                value={data.hero?.primaryCta?.label || ""}
                onChange={(e) => onChange({
                  ...data,
                  hero: { ...data.hero, primaryCta: { ...data.hero.primaryCta, label: e.target.value } },
                })}
                className="w-full px-3 py-1.5 text-xs rounded border border-neutral-300 bg-white"
              />
              <input
                type="text"
                placeholder="Link Target"
                value={data.hero?.primaryCta?.path || ""}
                onChange={(e) => onChange({
                  ...data,
                  hero: { ...data.hero, primaryCta: { ...data.hero.primaryCta, path: e.target.value } },
                })}
                className="w-full px-3 py-1.5 text-xs rounded border border-neutral-300 bg-white font-mono"
              />
            </div>

            <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 space-y-2">
              <span className="text-xs font-bold uppercase text-neutral-700">Secondary CTA</span>
              <input
                type="text"
                placeholder="Button Label"
                value={data.hero?.secondaryCta?.label || ""}
                onChange={(e) => onChange({
                  ...data,
                  hero: { ...data.hero, secondaryCta: { ...data.hero.secondaryCta, label: e.target.value } },
                })}
                className="w-full px-3 py-1.5 text-xs rounded border border-neutral-300 bg-white"
              />
              <input
                type="text"
                placeholder="Link Target"
                value={data.hero?.secondaryCta?.path || ""}
                onChange={(e) => onChange({
                  ...data,
                  hero: { ...data.hero, secondaryCta: { ...data.hero.secondaryCta, path: e.target.value } },
                })}
                className="w-full px-3 py-1.5 text-xs rounded border border-neutral-300 bg-white font-mono"
              />
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-700 block">
              Hero Trust Metrics (4 Cards)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {data.hero.trustMetrics.map((tm, idx) => (
                <div key={idx} className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-2">
                  <div className="flex gap-1">
                    <input
                      type="text"
                      placeholder="Prefix"
                      value={tm.prefix || ''}
                      onChange={(e) => updateHeroTrustMetric(idx, 'prefix', e.target.value)}
                      className="w-1/3 px-2 py-1 text-xs rounded border border-neutral-300 bg-white"
                    />
                    <input
                      type="number"
                      step="any"
                      placeholder="Val"
                      value={tm.value}
                      onChange={(e) => updateHeroTrustMetric(idx, 'value', parseFloat(e.target.value) || 0)}
                      className="w-1/3 px-2 py-1 text-xs rounded border border-neutral-300 bg-white"
                    />
                    <input
                      type="text"
                      placeholder="Suffix"
                      value={tm.suffix || ''}
                      onChange={(e) => updateHeroTrustMetric(idx, 'suffix', e.target.value)}
                      className="w-1/3 px-2 py-1 text-xs rounded border border-neutral-300 bg-white"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Label"
                    value={tm.label}
                    onChange={(e) => updateHeroTrustMetric(idx, 'label', e.target.value)}
                    className="w-full px-2 py-1 text-xs rounded border border-neutral-300 bg-white"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Specializations (3 Cards) */}
      {activeSection === 'specializations' && (
        <div className="space-y-6">
          {data.specializations.map((spec, sIdx) => (
            <div key={spec.id} className="bg-white p-6 rounded-2xl border border-neutral-200 space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <span className="font-sans text-sm font-bold text-neutral-950 uppercase tracking-wider">
                  Specialization {spec.number}: {spec.title}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-100 text-neutral-600">
                  {spec.id}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                    Card Title
                  </label>
                  <input
                    type="text"
                    value={spec.title}
                    onChange={(e) => updateSpecialization(sIdx, 'title', e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                    Subtitle / Protocol Name
                  </label>
                  <input
                    type="text"
                    value={spec.subtitle}
                    onChange={(e) => updateSpecialization(sIdx, 'subtitle', e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  Card Description
                </label>
                <textarea
                  rows={2}
                  value={spec.desc}
                  onChange={(e) => updateSpecialization(sIdx, 'desc', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                    Key Clinical Stat
                  </label>
                  <input
                    type="text"
                    value={spec.stats}
                    onChange={(e) => updateSpecialization(sIdx, 'stats', e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                    Expected Timeline
                  </label>
                  <input
                    type="text"
                    value={spec.timeline}
                    onChange={(e) => updateSpecialization(sIdx, 'timeline', e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300"
                  />
                </div>
              </div>

              <ImageUploadField
                label="Card Background Image"
                value={spec.img}
                onChange={(val) => updateSpecialization(sIdx, 'img', val)}
                description="Use high-resolution portrait or atmospheric editorial photos."
              />

              <div className="space-y-2 pt-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700">
                  Card Bullet Points (4 Highlights)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {spec.highlights.map((hl, hlIdx) => (
                    <input
                      key={hlIdx}
                      type="text"
                      value={hl}
                      onChange={(e) => updateHighlight(sIdx, hlIdx, e.target.value)}
                      className="px-3 py-1.5 text-xs rounded border border-neutral-300 bg-white"
                    />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Clinical Timeline */}
      {activeSection === 'timeline' && (
        <div className="space-y-6">
          {(['weight', 'hair', 'sexual'] as const).map((cat) => (
            <div key={cat} className="bg-white p-6 rounded-2xl border border-neutral-200 space-y-4">
              <h4 className="font-sans text-sm font-bold text-neutral-950 uppercase tracking-wider">
                {cat === 'weight' ? 'Weight Loss Timeline' : cat === 'hair' ? 'Hair Restoration Timeline' : 'Sexual Health Timeline'}
              </h4>

              <div className="space-y-3">
                {data.timeline[cat].map((step, idx) => (
                  <div key={idx} className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-neutral-500 mb-1">Phase (e.g. Month 1)</label>
                        <input
                          type="text"
                          value={step.phase}
                          onChange={(e) => updateTimelineStep(cat, idx, 'phase', e.target.value)}
                          className="w-full px-2.5 py-1 text-xs rounded border border-neutral-300 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-neutral-500 mb-1">Milestone Label</label>
                        <input
                          type="text"
                          value={step.label}
                          onChange={(e) => updateTimelineStep(cat, idx, 'label', e.target.value)}
                          className="w-full px-2.5 py-1 text-xs rounded border border-neutral-300 bg-white"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-neutral-500 mb-1">Description</label>
                      <textarea
                        rows={2}
                        value={step.description}
                        onChange={(e) => updateTimelineStep(cat, idx, 'description', e.target.value)}
                        className="w-full px-2.5 py-1 text-xs rounded border border-neutral-300 bg-white leading-relaxed"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* How It Works */}
      {activeSection === 'howItWorks' && (
        <div className="bg-white p-6 rounded-2xl border border-neutral-200 space-y-5">
          <h3 className="font-sans text-base font-bold text-neutral-950">How It Works (3 Steps)</h3>

          <div className="space-y-4">
            {data.howItWorks.map((st, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-3">
                <span className="text-xs font-bold text-neutral-500 uppercase">Step {st.step}</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-neutral-600 mb-1">Step Title</label>
                    <input
                      type="text"
                      value={st.title}
                      onChange={(e) => updateHowItWorksStep(idx, 'title', e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded border border-neutral-300 bg-white font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-neutral-600 mb-1">Time Expectation</label>
                    <input
                      type="text"
                      value={st.time}
                      onChange={(e) => updateHowItWorksStep(idx, 'time', e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded border border-neutral-300 bg-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-neutral-600 mb-1">Description</label>
                  <textarea
                    rows={2}
                    value={st.desc}
                    onChange={(e) => updateHowItWorksStep(idx, 'desc', e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded border border-neutral-300 bg-white"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Accountability Metrics */}
      {activeSection === 'accountability' && (
        <div className="bg-white p-6 rounded-2xl border border-neutral-200 space-y-5">
          <h3 className="font-sans text-base font-bold text-neutral-950">Accountability Metrics (3 Stats)</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {data.accountability.map((m, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2">
                <div className="flex gap-1">
                  <input
                    type="text"
                    placeholder="Prefix"
                    value={m.prefix || ''}
                    onChange={(e) => updateAccountability(idx, 'prefix', e.target.value)}
                    className="w-1/3 px-2 py-1 text-xs rounded border border-neutral-300 bg-white"
                  />
                  <input
                    type="number"
                    value={m.value}
                    onChange={(e) => updateAccountability(idx, 'value', parseFloat(e.target.value) || 0)}
                    className="w-1/3 px-2 py-1 text-xs rounded border border-neutral-300 bg-white font-bold"
                  />
                  <input
                    type="text"
                    placeholder="Suffix"
                    value={m.suffix || ''}
                    onChange={(e) => updateAccountability(idx, 'suffix', e.target.value)}
                    className="w-1/3 px-2 py-1 text-xs rounded border border-neutral-300 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-neutral-500 mb-1">Title</label>
                  <input
                    type="text"
                    value={m.title}
                    onChange={(e) => updateAccountability(idx, 'title', e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded border border-neutral-300 bg-white font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-neutral-500 mb-1">Description</label>
                  <input
                    type="text"
                    value={m.desc}
                    onChange={(e) => updateAccountability(idx, 'desc', e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded border border-neutral-300 bg-white"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comparison */}
      {activeSection === 'comparison' && (
        <div className="bg-white p-6 rounded-2xl border border-neutral-200 space-y-5">
          <h3 className="font-sans text-base font-bold text-neutral-950">Traditional Healthcare vs Suga Model</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Traditional */}
            <div className="space-y-3">
              <span className="block text-xs font-bold uppercase tracking-wider text-neutral-700">
                Traditional Healthcare (4 Points)
              </span>
              {data.comparison.traditional.map((pt, pIdx) => (
                <input
                  key={pIdx}
                  type="text"
                  value={pt}
                  onChange={(e) => updateComparisonPoint('traditional', pIdx, e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded border border-neutral-300"
                />
              ))}
            </div>

            {/* Suga Model */}
            <div className="space-y-3">
              <span className="block text-xs font-bold uppercase tracking-wider text-neutral-700">
                Suga Modern Care Model (4 Points)
              </span>
              {data.comparison.sugaModel.map((pt, pIdx) => (
                <input
                  key={pIdx}
                  type="text"
                  value={pt}
                  onChange={(e) => updateComparisonPoint('sugaModel', pIdx, e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded border border-neutral-300"
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Patient FAQs */}
      {activeSection === 'faqs' && (
        <div className="bg-white p-6 rounded-2xl border border-neutral-200 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-sans text-base font-bold text-neutral-950">Frequently Asked Questions</h3>
              <p className="text-xs text-neutral-500">Manage patient questions and answers.</p>
            </div>
            <button
              type="button"
              onClick={addFaq}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-neutral-950 text-white text-xs font-bold hover:bg-neutral-800 transition-colors"
            >
              <Plus size={14} />
              Add FAQ
            </button>
          </div>

          <div className="space-y-4">
            {data.faqs.map((faq, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2 relative">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-500 uppercase">Question #{idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeFaq(idx)}
                    className="text-neutral-400 hover:text-red-600 transition-colors p-1"
                    title="Delete question"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <input
                  type="text"
                  value={faq.q}
                  onChange={(e) => updateFaq(idx, 'q', e.target.value)}
                  placeholder="Question text"
                  className="w-full px-3 py-1.5 text-xs rounded border border-neutral-300 font-semibold bg-white"
                />
                <textarea
                  rows={3}
                  value={faq.a}
                  onChange={(e) => updateFaq(idx, 'a', e.target.value)}
                  placeholder="Answer explanation"
                  className="w-full px-3 py-1.5 text-xs rounded border border-neutral-300 bg-white leading-relaxed"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom CTA */}
      {activeSection === 'cta' && (
        <div className="bg-white p-6 rounded-2xl border border-neutral-200 space-y-4">
          <h3 className="font-sans text-base font-bold text-neutral-950">Call to Action Banner</h3>
          
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">Eyebrow</label>
            <input
              type="text"
              value={data.ctaBanner.eyebrow}
              onChange={(e) => onChange({ ...data, ctaBanner: { ...data.ctaBanner, eyebrow: e.target.value } })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">Headline</label>
            <input
              type="text"
              value={data.ctaBanner.title}
              onChange={(e) => onChange({ ...data, ctaBanner: { ...data.ctaBanner, title: e.target.value } })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">Description</label>
            <textarea
              rows={2}
              value={data.ctaBanner.description}
              onChange={(e) => onChange({ ...data, ctaBanner: { ...data.ctaBanner, description: e.target.value } })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">Button Text</label>
              <input
                type="text"
                value={data.ctaBanner.buttonText}
                onChange={(e) => onChange({ ...data, ctaBanner: { ...data.ctaBanner, buttonText: e.target.value } })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">Button Link</label>
              <input
                type="text"
                value={data.ctaBanner.buttonLink}
                onChange={(e) => onChange({ ...data, ctaBanner: { ...data.ctaBanner, buttonLink: e.target.value } })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 font-mono"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

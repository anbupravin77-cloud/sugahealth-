import { Plus, Trash2 } from "lucide-react";
import { GlobalContent } from '../../../types/content';

interface GlobalTabProps {
  data: GlobalContent;
  onChange: (updated: GlobalContent) => void;
}

export function GlobalTab(props: GlobalTabProps) {
  const data = props?.data || ({} as any);
  const onChange = props?.onChange || (() => {});
  const updateField = <K extends keyof GlobalContent>(field: K, val: GlobalContent[K]) => {
    onChange({ ...data, [field]: val });
  };

  const addNavLink = () => {
    const updated = [...data.navLinks, { name: 'New Link', path: '/', desc: 'Description' }];
    updateField('navLinks', updated);
  };
  const removeNavLink = (index: number) => {
    const updated = data.navLinks.filter((_, i) => i !== index);
    updateField('navLinks', updated);
  };
  const updateNavLink = (index: number, field: 'name' | 'path' | 'desc', val: string) => {
    const updated = [...data.navLinks];
    updated[index] = { ...updated[index], [field]: val };
    updateField('navLinks', updated);
  };

  const updateFooterTreatment = (index: number, field: 'label' | 'path', val: string) => {
    const updated = [...data.footer.treatmentLinks];
    updated[index] = { ...updated[index], [field]: val };
    onChange({
      ...data,
      footer: { ...data.footer, treatmentLinks: updated },
    });
  };

  const updateFooterPractice = (index: number, field: 'label' | 'path', val: string) => {
    const updated = [...data.footer.practiceLinks];
    updated[index] = { ...updated[index], [field]: val };
    onChange({
      ...data,
      footer: { ...data.footer, practiceLinks: updated },
    });
  };

  return (
    <div className="space-y-8">
      
      {/* Brand Identity & Header CTA */}
      <div className="bg-white p-6 rounded-2xl border border-neutral-200">
        <h3 className="font-sans text-base font-bold text-neutral-950 mb-1">
          Brand Tagline & Header CTA
        </h3>
        <p className="text-xs text-neutral-500 mb-5">
          Controls the header brand subtitle and the top right action button.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
              Tagline (Under SUGA.HEALTH logo)
            </label>
            <input
              type="text"
              value={data.tagline || ''}
              onChange={(e) => updateField('tagline', e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-950"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
              Header CTA Button Label
            </label>
            <input
              type="text"
              value={data.headerCta?.label || ''}
              onChange={(e) => updateField('headerCta', { ...data.headerCta, label: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-950"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
              Header CTA Link Path
            </label>
            <input
              type="text"
              value={data.headerCta?.path || ''}
              onChange={(e) => updateField('headerCta', { ...data.headerCta, path: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-950 font-mono text-xs"
            />
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="bg-white p-6 rounded-2xl border border-neutral-200">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-sans text-base font-bold text-neutral-950 mb-1">
              Primary Navigation Links
            </h3>
            <p className="text-xs text-neutral-500">
              Links in the top navigation bar and mobile drawer. (Add or remove to toggle page visibility)
            </p>
          </div>
          <button
            type="button"
            onClick={addNavLink}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-neutral-950 text-white text-xs font-bold hover:bg-neutral-800 transition-colors"
          >
            <Plus size={14} /> Add Link
          </button>
        </div>

        <div className="space-y-4">
          {data.navLinks.map((link, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 relative">
              <button
                type="button"
                onClick={() => removeNavLink(idx)}
                className="absolute top-2 right-2 p-1 text-neutral-400 hover:text-red-600 transition-colors"
              >
                <Trash2 size={14} />
              </button>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                  Nav Item Title
                </label>
                <input
                  type="text"
                  value={link.name}
                  onChange={(e) => updateNavLink(idx, 'name', e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-950 bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                  Drawer Subtitle
                </label>
                <input
                  type="text"
                  value={link.desc}
                  onChange={(e) => updateNavLink(idx, 'desc', e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-950 bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                  Route Path
                </label>
                <input
                  type="text"
                  value={link?.path || ""}
                  onChange={(e) => updateNavLink(idx, 'path', e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-950 bg-white font-mono"
                />
              </div></div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Settings & Legal Disclaimers */}
      <div className="bg-white p-6 rounded-2xl border border-neutral-200">
        <h3 className="font-sans text-base font-bold text-neutral-950 mb-1">
          Footer Content & Disclaimers
        </h3>
        <p className="text-xs text-neutral-500 mb-5">
          Controls the footer bio, legal statements, disclaimers, and copyright notices.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
              Footer Description
            </label>
            <textarea
              rows={3}
              value={data.footer.description}
              onChange={(e) => onChange({ ...data, footer: { ...data.footer, description: e.target.value } })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-950 leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
              Telehealth Legal Disclaimer
            </label>
            <textarea
              rows={2}
              value={data.footer.telehealthDisclaimer}
              onChange={(e) => onChange({ ...data, footer: { ...data.footer, telehealthDisclaimer: e.target.value } })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-950 leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
              Pharmacy & Emergency Disclaimer
            </label>
            <textarea
              rows={2}
              value={data.footer.pharmacyDisclaimer}
              onChange={(e) => onChange({ ...data, footer: { ...data.footer, pharmacyDisclaimer: e.target.value } })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-950 leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
              Copyright Text
            </label>
            <input
              type="text"
              value={data.footer.copyright}
              onChange={(e) => onChange({ ...data, footer: { ...data.footer, copyright: e.target.value } })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-950"
            />
          </div>
        </div>
      </div>

    </div>
  );
}

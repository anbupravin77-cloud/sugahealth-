import { SeoContent, SeoMetadata } from '../../../types/content';
import { ImageUploadField } from '../ImageUploadField';
import { useState } from 'react';

interface SeoTabProps {
  data: SeoContent;
  onChange: (updated: SeoContent) => void;
}

export function SeoTab(props: SeoTabProps) {
  const data = props?.data || ({} as any);
  const onChange = props?.onChange || (() => {});
  const [activePage, setActivePage] = useState<keyof SeoContent>('home');

  const pages: Array<{ key: keyof SeoContent; label: string }> = [
    { key: 'home', label: 'Home Page' },
    { key: 'weightLoss', label: 'Weight Loss' },
    { key: 'hairGrowth', label: 'Hair Growth' },
    { key: 'sexualHealth', label: 'Sexual Health' },
    { key: 'about', label: 'About Page' },
  ];

  const currentMeta: SeoMetadata = data[activePage] || {
    title: '',
    description: '',
  };

  const updateCurrentMeta = (field: keyof SeoMetadata, val: string) => {
    onChange({
      ...data,
      [activePage]: {
        ...currentMeta,
        [field]: val,
      },
    });
  };

  return (
    <div className="space-y-6">
      
      {/* Page Selector Tabs */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-neutral-200/60 rounded-xl">
        {pages.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => setActivePage(p.key)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activePage === p.key
                ? 'bg-white text-neutral-950 shadow-xs'
                : 'text-neutral-600 hover:text-neutral-950'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* SEO Card for Selected Page */}
      <div className="bg-white p-6 rounded-2xl border border-neutral-200 space-y-4">
        <h3 className="font-sans text-base font-bold text-neutral-950">
          SEO & Meta Tags — {pages.find(p => p.key === activePage)?.label}
        </h3>
        <p className="text-xs text-neutral-500">
          These settings directly control the browser tab title, search engine snippet preview, and social media share cards.
        </p>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
            Page Title (`&lt;title&gt;` & og:title)
          </label>
          <input
            type="text"
            value={currentMeta.title}
            onChange={(e) => updateCurrentMeta('title', e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300"
          />
          <span className="text-[10px] text-neutral-400 mt-1 block">
            Recommended: 50–60 characters. Current: {currentMeta.title.length} chars.
          </span>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
            Meta Description (Search Snippet & og:description)
          </label>
          <textarea
            rows={3}
            value={currentMeta.description}
            onChange={(e) => updateCurrentMeta('description', e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 leading-relaxed"
          />
          <span className="text-[10px] text-neutral-400 mt-1 block">
            Recommended: 120–160 characters. Current: {currentMeta.description.length} chars.
          </span>
        </div>

        <ImageUploadField
          label="Social Share Image (og:image)"
          value={currentMeta.ogImage || ''}
          onChange={(val) => updateCurrentMeta('ogImage', val)}
          description="Dimensions 1200x630px recommended for optimal Twitter & LinkedIn link previews."
        />

        {/* Live Search Engine SERP Preview */}
        <div className="pt-4 border-t border-neutral-100 space-y-2">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500">
            Google Search Snippet Preview
          </label>
          <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200/80 space-y-1 max-w-xl">
            <span className="text-xs text-neutral-600 block truncate">
              https://suga.health/{activePage === 'home' ? '' : activePage}
            </span>
            <span className="text-sm font-semibold text-blue-700 hover:underline block truncate cursor-pointer">
              {currentMeta.title || 'Page Title'}
            </span>
            <p className="text-xs text-neutral-600 line-clamp-2 leading-relaxed">
              {currentMeta.description || 'Page meta description preview shown in Google results.'}
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}

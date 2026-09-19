import React from 'react';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  badge?: string | number;
  action?: React.ReactNode;
  tagline?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  badge,
  action,
  tagline,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-200">
      <div>
        {tagline && (
          <p className="text-2xs font-semibold tracking-wider text-stone-500 uppercase mb-0.5">
            {tagline}
          </p>
        )}
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-stone-900 font-sans">
            {title}
          </h1>
          {badge !== undefined && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-stone-100 text-stone-700 border border-stone-200">
              {badge}
            </span>
          )}
        </div>
        {subtitle && <p className="text-xs sm:text-sm text-stone-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="flex items-center gap-2 flex-shrink-0">{action}</div>}
    </div>
  );
};

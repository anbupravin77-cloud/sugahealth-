import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';

export type PriorityLevel = 'urgent' | 'high' | 'normal' | 'low';

interface PriorityIndicatorProps {
  priority: PriorityLevel;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

export const PriorityIndicator: React.FC<PriorityIndicatorProps> = ({
  priority,
  showLabel = true,
  size = 'sm',
}) => {
  if (priority === 'urgent') {
    return (
      <span
        className={`inline-flex items-center gap-1 font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-md ${
          size === 'sm' ? 'px-1.5 py-0.5 text-2xs' : 'px-2 py-1 text-xs'
        }`}
        title="Urgent Priority"
      >
        <AlertCircle className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
        {showLabel && <span>Urgent</span>}
      </span>
    );
  }

  if (priority === 'high') {
    return (
      <span
        className={`inline-flex items-center gap-1 font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-md ${
          size === 'sm' ? 'px-1.5 py-0.5 text-2xs' : 'px-2 py-1 text-xs'
        }`}
        title="High Priority"
      >
        <AlertTriangle className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
        {showLabel && <span>High</span>}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 font-medium text-stone-600 bg-stone-100 border border-stone-200 rounded-md ${
        size === 'sm' ? 'px-1.5 py-0.5 text-2xs' : 'px-2 py-1 text-xs'
      }`}
      title="Standard Priority"
    >
      <CheckCircle2 className={size === 'sm' ? 'w-3 h-3 text-stone-400' : 'w-3.5 h-3.5 text-stone-400'} />
      {showLabel && <span>Standard</span>}
    </span>
  );
};

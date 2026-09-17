import { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface CardProps {
  children?: ReactNode;
  className?: string;
  variant?: 'default' | 'inverted' | 'subtle';
  padding?: 'default' | 'spacious' | 'compact';
  badge?: ReactNode;
  title?: ReactNode;
  subtitle?: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  revealAction?: boolean | ReactNode;
  onClick?: () => void;
  id?: string;
}

export function Card({
  children,
  className,
  variant = "default",
  padding = "default",
  badge,
  title,
  subtitle,
  description,
  footer,
  revealAction,
  onClick,
  id,
}: CardProps = {}) {
  const paddingStyles = {
    compact: 'p-5 sm:p-6',
    default: 'p-6 sm:p-8',
    spacious: 'p-7 sm:p-9 lg:p-10',
  }[padding];

  const variantStyles = {
    default: 'bg-white text-neutral-950 border-neutral-200/90 hover:border-neutral-950',
    inverted: 'bg-neutral-950 text-white border-neutral-900 hover:border-neutral-700',
    subtle: 'bg-neutral-50/80 text-neutral-950 border-neutral-200/80 hover:bg-white hover:border-neutral-950',
  }[variant];

  return (
    <div
      id={id}
      onClick={onClick}
      className={cn(
        // Base container with border-only styling (zero drop shadows)
        'group relative rounded-2xl sm:rounded-3xl border transition-all duration-300 flex flex-col justify-between',
        paddingStyles,
        variantStyles,
        onClick && 'cursor-pointer',
        className
      )}
    >
      <div>
        {/* Header with Badge and Reveal Arrow */}
        {(badge || revealAction !== undefined) && (
          <div className="flex items-center justify-between gap-3 mb-5">
            <div>
              {typeof badge === 'string' ? (
                <span
                  className={cn(
                    'inline-block px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase border',
                    variant === 'inverted'
                      ? 'bg-neutral-900 border-neutral-800 text-neutral-200'
                      : 'bg-neutral-100/90 border-neutral-200/80 text-neutral-800'
                  )}
                >
                  {badge}
                </span>
              ) : (
                badge
              )}
            </div>

            {/* Hover-based reveal animation */}
            {revealAction !== false && (
              <div className="flex items-center text-xs font-semibold tracking-wide transition-all duration-300 opacity-60 group-hover:opacity-100 group-hover:translate-x-1">
                {typeof revealAction === 'object' ? (
                  revealAction
                ) : (
                  <ArrowRight
                    size={16}
                    className={cn(
                      'transition-colors',
                      variant === 'inverted' ? 'text-neutral-300' : 'text-neutral-950'
                    )}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* Title and Subtitle Hierarchy */}
        {subtitle && (
          <span
            className={cn(
              'text-xs font-bold uppercase tracking-widest block mb-1.5',
              variant === 'inverted' ? 'text-neutral-400' : 'text-neutral-500'
            )}
          >
            {subtitle}
          </span>
        )}

        {title && (
          <h3
            className={cn(
              'font-sans text-xl sm:text-2xl font-bold tracking-tight mb-3',
              variant === 'inverted' ? 'text-white' : 'text-neutral-950'
            )}
          >
            {title}
          </h3>
        )}

        {description && (
          <p
            className={cn(
              'text-sm sm:text-base leading-relaxed mb-6 font-normal',
              variant === 'inverted' ? 'text-neutral-300' : 'text-neutral-600'
            )}
          >
            {description}
          </p>
        )}

        {children}
      </div>

      {footer && (
        <div
          className={cn(
            'mt-6 pt-5 border-t flex items-center justify-between',
            variant === 'inverted' ? 'border-neutral-800' : 'border-neutral-100'
          )}
        >
          {footer}
        </div>
      )}
    </div>
  );
}

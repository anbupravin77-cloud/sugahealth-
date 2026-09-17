import { cn } from '../../lib/utils';

export interface SkeletonProps {
  className?: string;
}

/**
 * Monochromatic high-end shimmer skeleton
 */
export function Skeleton({ className }: SkeletonProps = {}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-neutral-100/90 rounded-xl before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.8s_infinite] before:bg-gradient-to-r before:from-transparent before:via-neutral-200/50 before:to-transparent",
        className
      )}
    />
  );
}

/**
 * Skeleton screen for treatment cards
 */
export function TreatmentCardSkeleton() {
  return (
    <div className="rounded-2xl sm:rounded-3xl p-6 sm:p-8 bg-white border border-neutral-200/90 flex flex-col justify-between space-y-6">
      <div className="space-y-4">
        <Skeleton className="h-6 w-28 rounded-full" />
        <Skeleton className="h-8 w-3/4 rounded-lg" />
        <div className="space-y-2 pt-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
        <div className="space-y-2.5 pt-4">
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
      <Skeleton className="h-11 w-full rounded-full" />
    </div>
  );
}

/**
 * Skeleton screen for interactive comparison component
 */
export function ComparisonSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-center gap-3">
        <Skeleton className="h-10 w-44 rounded-full" />
        <Skeleton className="h-10 w-44 rounded-full" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
        <div className="rounded-2xl sm:rounded-3xl p-6 sm:p-8 bg-neutral-50/70 border border-neutral-200/80 space-y-5">
          <div className="flex justify-between items-center">
            <Skeleton className="h-5 w-32 rounded-full" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <div className="pt-4 border-t border-neutral-200/60 space-y-3">
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
        <div className="rounded-2xl sm:rounded-3xl p-6 sm:p-8 bg-neutral-900 border border-neutral-800 space-y-5">
          <div className="flex justify-between items-center">
            <Skeleton className="h-5 w-32 rounded-full bg-neutral-800 before:via-neutral-700/50" />
            <Skeleton className="h-4 w-16 bg-neutral-800 before:via-neutral-700/50" />
          </div>
          <Skeleton className="h-8 w-2/3 bg-neutral-800 before:via-neutral-700/50" />
          <Skeleton className="h-4 w-full bg-neutral-800 before:via-neutral-700/50" />
          <div className="pt-4 border-t border-neutral-800 space-y-3">
            <Skeleton className="h-4 w-5/6 bg-neutral-800 before:via-neutral-700/50" />
            <Skeleton className="h-4 w-4/6 bg-neutral-800 before:via-neutral-700/50" />
            <Skeleton className="h-4 w-3/4 bg-neutral-800 before:via-neutral-700/50" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Editorial Photography Skeleton
 */
export function EditorialImageSkeleton({ className }: { className?: string } = {}) {
  return (
    <div className={cn("relative overflow-hidden bg-neutral-100 rounded-2xl", className)}>
      <Skeleton className="w-full h-full" />
    </div>
  );
}

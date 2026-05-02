import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

/**
 * Skeleton — Loading placeholder
 *
 * @example
 *   <Skeleton className="h-4 w-24" />
 *   <SkeletonText lines={3} />
 *   <SkeletonCard />
 *   <SkeletonAvatar size="md" />
 */
export const Skeleton = forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'animate-pulse rounded-md bg-muted',
      'relative overflow-hidden',
      'before:absolute before:inset-0 before:-translate-x-full before:animate-lyn-shimmer',
      'before:bg-gradient-to-r before:from-transparent before:via-white/5 before:to-transparent',
      className,
    )}
    {...props}
  />
));
Skeleton.displayName = 'Skeleton';

export function SkeletonText({ lines = 3, className }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn('h-4', i === lines - 1 ? 'w-3/4' : 'w-full')}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className }) {
  return (
    <div className={cn('rounded-2xl border border-border p-6 space-y-4', className)}>
      <div className="flex items-center gap-3">
        <Skeleton className="h-11 w-11 rounded-xl" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <SkeletonText lines={2} />
    </div>
  );
}

export function SkeletonAvatar({ size = 'md', className }) {
  const sizes = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-14 w-14',
    xl: 'h-20 w-20',
  };
  return <Skeleton className={cn('rounded-full', sizes[size], className)} />;
}

export function SkeletonRow({ className }) {
  return (
    <div className={cn('flex items-center gap-3 p-3', className)}>
      <SkeletonAvatar size="sm" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-8 w-16 rounded-lg" />
    </div>
  );
}

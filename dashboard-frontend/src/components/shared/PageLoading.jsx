import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';

/**
 * PageLoading — Skeleton موحّد للصفحات اللي تحمل بيانات
 * 
 * @example
 *   if (isLoading) return <PageLoading />
 *   if (isLoading) return <PageLoading variant="list" />
 *   if (isLoading) return <PageLoading variant="cards" count={6} />
 */
export function PageLoading({ variant = 'default', count = 3, className }) {
  if (variant === 'list') {
    return (
      <div className={cn('space-y-3', className)}>
        {Array.from({ length: count }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (variant === 'cards') {
    return (
      <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4', className)}>
        {Array.from({ length: count }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (variant === 'table') {
    return (
      <div className={cn('space-y-2', className)}>
        <Skeleton className="h-10 rounded-xl" />
        {Array.from({ length: count }).map((_, i) => (
          <Skeleton key={i} className="h-14 rounded-xl" />
        ))}
      </div>
    );
  }

  // default — settings page
  return (
    <div className={cn('space-y-4', className)}>
      <Skeleton className="h-32 rounded-2xl" />
      <Skeleton className="h-48 rounded-2xl" />
      <Skeleton className="h-24 rounded-2xl" />
    </div>
  );
}
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCompact } from '@/lib/utils';

/**
 * StatCard — بطاقة إحصائية موحدة
 *
 * @example
 *   <StatCard
 *     icon={<Users />}
 *     label="الأعضاء"
 *     value={1247}
 *     change={+12}
 *     gradient="from-violet-500 to-pink-500"
 *   />
 */
export function StatCard({
  icon,
  label,
  value,
  change,
  changeLabel,
  gradient = 'from-violet-500 to-pink-500',
  format = 'compact',
  hint,
  className,
}) {
  const formatValue = (v) => {
    if (typeof v !== 'number') return v;
    if (format === 'compact') return formatCompact(v);
    if (format === 'percent') return `${v}%`;
    return v.toLocaleString('ar');
  };

  const trend = change > 0 ? 'up' : change < 0 ? 'down' : 'flat';
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  const trendColors = {
    up: 'text-emerald-500 bg-emerald-500/10',
    down: 'text-destructive bg-destructive/10',
    flat: 'text-muted-foreground bg-muted',
  };

  return (
    <div
      className={cn(
        'rounded-2xl bg-card border border-border p-5',
        'transition-all hover:border-border/80',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        {icon && (
          <div
            className={cn(
              'w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center',
              gradient,
              '[&>svg]:w-5 [&>svg]:h-5 [&>svg]:text-white',
            )}
          >
            {icon}
          </div>
        )}

        {change !== undefined && change !== null && (
          <div
            className={cn(
              'flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-md',
              trendColors[trend],
            )}
          >
            <TrendIcon className="w-3 h-3" />
            <span className="num">
              {change > 0 ? '+' : ''}
              {change}
              {changeLabel || '%'}
            </span>
          </div>
        )}
      </div>

      <div className="text-2xl font-bold mb-1 num">{formatValue(value)}</div>
      <div className="text-sm text-muted-foreground">{label}</div>

      {hint && (
        <div className="text-xs text-muted-foreground/70 mt-2">{hint}</div>
      )}
    </div>
  );
}

/**
 * StatCardGrid — wrapper لشبكة بطاقات
 */
export function StatCardGrid({ children, className, cols = 4 }) {
  const colClass = {
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-2 lg:grid-cols-3',
    4: 'sm:grid-cols-2 lg:grid-cols-4',
  }[cols] || 'sm:grid-cols-2 lg:grid-cols-4';

  return (
    <div className={cn('grid grid-cols-1 gap-4', colClass, className)}>
      {children}
    </div>
  );
}

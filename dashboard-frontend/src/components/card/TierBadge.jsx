/**
 * ═══════════════════════════════════════════════════════════
 *  Tier Badge — شارة الفئة
 *  المسار: dashboard-frontend/src/components/card/TierBadge.jsx
 * ═══════════════════════════════════════════════════════════
 */

import { cn } from '@/lib/utils';
import { getTier } from '@/lib/cardPlans';

/**
 * شارة فئة الاشتراك (free / basic / advanced / legendary)
 *
 * @param {string} tier - 'free' | 'basic' | 'advanced' | 'legendary'
 * @param {'sm' | 'md' | 'lg'} size
 * @param {boolean} showIcon
 * @param {boolean} showLabel
 */
export function TierBadge({
  tier = 'free',
  size = 'md',
  showIcon = true,
  showLabel = true,
  className,
}) {
  const tierData = getTier(tier);

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-sm px-3 py-1 gap-1.5',
    lg: 'text-base px-4 py-1.5 gap-2',
  };

  // ─── ألوان حسب الفئة ───
  const tierStyles = {
    free: 'bg-slate-500/15 text-slate-600 dark:text-slate-300 border-slate-500/30',
    basic: 'bg-amber-700/15 text-amber-700 dark:text-amber-400 border-amber-700/30',
    advanced: 'bg-slate-400/15 text-slate-600 dark:text-slate-300 border-slate-400/40',
    legendary:
      'bg-gradient-to-r from-yellow-500/20 via-amber-500/20 to-yellow-500/20 text-amber-600 dark:text-yellow-400 border-amber-500/40 shadow-md shadow-amber-500/10',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-bold',
        sizeClasses[size],
        tierStyles[tier],
        className,
      )}
    >
      {showIcon && <span className="leading-none">{tierData.icon}</span>}
      {showLabel && <span>{tierData.name}</span>}
    </span>
  );
}

/**
 * شارة الفئة بحجم كبير مع الوصف (للصفحات)
 */
export function TierBadgeLarge({ tier = 'free', className }) {
  const tierData = getTier(tier);

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-xl border p-3',
        tier === 'legendary' &&
          'bg-gradient-to-r from-yellow-500/10 via-amber-500/10 to-yellow-500/10 border-amber-500/30',
        tier === 'advanced' && 'bg-slate-400/10 border-slate-400/30',
        tier === 'basic' && 'bg-amber-700/10 border-amber-700/30',
        tier === 'free' && 'bg-slate-500/10 border-slate-500/30',
        className,
      )}
    >
      <div className="text-3xl leading-none">{tierData.icon}</div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm">فئة {tierData.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{tierData.description}</p>
      </div>
    </div>
  );
}
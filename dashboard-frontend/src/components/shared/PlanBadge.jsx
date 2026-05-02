import { Badge } from '@/components/ui/Badge';
import { getPlanInfo, PLAN_TIERS } from '@/lib/plans';
import { cn } from '@/lib/utils';

/**
 * PlanBadge — شارة الخطة
 *
 * @example
 *   <PlanBadge plan="gold" />
 *   <PlanBadge plan="silver" size="sm" showIcon />
 */
export function PlanBadge({
  plan = PLAN_TIERS.FREE,
  size = 'default',
  showIcon = true,
  showName = true,
  className,
}) {
  const info = getPlanInfo(plan);

  return (
    <Badge variant={info.color} size={size} className={cn('gap-1', className)}>
      {showIcon && <span>{info.icon}</span>}
      {showName && <span>{info.name}</span>}
    </Badge>
  );
}

/**
 * PlanIndicator — مؤشر مدمج (أيقونة + اسم) — أبسط من Badge
 */
export function PlanIndicator({ plan = PLAN_TIERS.FREE, className }) {
  const info = getPlanInfo(plan);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs font-medium',
        info.color === 'gold' && 'text-amber-500',
        info.color === 'silver' && 'text-slate-400',
        info.color === 'diamond' && 'text-cyan-400',
        info.color === 'free' && 'text-muted-foreground',
        className,
      )}
    >
      <span>{info.icon}</span>
      <span>{info.name}</span>
    </span>
  );
}

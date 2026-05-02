import { PlanBadge } from './PlanBadge';
import { cn } from '@/lib/utils';

/**
 * SettingsPageHeader — Header موحد لكل صفحات الإعدادات
 *
 * @example
 *   <SettingsPageHeader
 *     icon={<Bot />}
 *     title="إعدادات AI"
 *     description="خصص شخصية الذكاء الاصطناعي"
 *     plan="gold"
 *     actions={<Button>إجراء</Button>}
 *   />
 */
export function SettingsPageHeader({
  icon,
  title,
  description,
  plan,
  actions,
  className,
}) {
  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4',
        'pb-6 mb-6 border-b border-border',
        className,
      )}
    >
      <div className="flex items-start gap-4 flex-1 min-w-0">
        {icon && (
          <div className="w-12 h-12 rounded-2xl lyn-gradient flex items-center justify-center flex-shrink-0 lyn-glow">
            <div className="text-white [&>svg]:w-6 [&>svg]:h-6">{icon}</div>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1.5 flex-wrap">
            <h1 className="text-2xl font-bold truncate">{title}</h1>
            {plan && <PlanBadge plan={plan} size="default" />}
          </div>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>

      {actions && (
        <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>
      )}
    </div>
  );
}

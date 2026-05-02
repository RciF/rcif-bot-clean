import { cn } from '@/lib/utils';

/**
 * EmptyState — حالة فارغة (لا توجد بيانات)
 *
 * @example
 *   <EmptyState
 *     icon={<Inbox />}
 *     title="لا توجد تذاكر"
 *     description="لم يتم فتح أي تذاكر بعد"
 *     action={<Button>إنشاء أول تذكرة</Button>}
 *   />
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  size = 'default',
}) {
  const sizes = {
    sm: { padding: 'py-8', iconSize: 'w-12 h-12', iconInner: '[&>svg]:w-6 [&>svg]:h-6', titleSize: 'text-base' },
    default: { padding: 'py-12', iconSize: 'w-16 h-16', iconInner: '[&>svg]:w-8 [&>svg]:h-8', titleSize: 'text-lg' },
    lg: { padding: 'py-16', iconSize: 'w-20 h-20', iconInner: '[&>svg]:w-10 [&>svg]:h-10', titleSize: 'text-xl' },
  };

  const sz = sizes[size] || sizes.default;

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center px-6',
        sz.padding,
        className,
      )}
    >
      {icon && (
        <div
          className={cn(
            'rounded-2xl bg-muted/50 flex items-center justify-center mb-4',
            'text-muted-foreground',
            sz.iconSize,
            sz.iconInner,
          )}
        >
          {icon}
        </div>
      )}

      {title && (
        <h3 className={cn('font-bold mb-1.5', sz.titleSize)}>{title}</h3>
      )}

      {description && (
        <p className="text-sm text-muted-foreground max-w-sm mb-4">{description}</p>
      )}

      {action && <div>{action}</div>}
    </div>
  );
}

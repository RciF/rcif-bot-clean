import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * BulkCheckbox — Checkbox للتحديد الجماعي
 *
 * @example
 *   <BulkCheckbox
 *     checked={isSelected('123')}
 *     onChange={() => toggle('123')}
 *   />
 *
 *   // Master checkbox (with indeterminate state):
 *   <BulkCheckbox
 *     checked={allSelected}
 *     indeterminate={someSelected && !allSelected}
 *     onChange={toggleAll}
 *   />
 */
export function BulkCheckbox({
  checked = false,
  indeterminate = false,
  onChange,
  onClick,
  size = 'md',
  className,
}) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
  };

  const iconSizes = {
    sm: 'w-2.5 h-2.5',
    md: 'w-3 h-3',
  };

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        if (onClick) onClick(e);
        if (onChange) onChange();
      }}
      className={cn(
        sizeClasses[size],
        'rounded-md border-2 flex items-center justify-center transition-colors flex-shrink-0',
        checked || indeterminate
          ? 'bg-primary border-primary'
          : 'border-border hover:border-primary/50',
        className,
      )}
      aria-checked={indeterminate ? 'mixed' : checked}
      role="checkbox"
    >
      {checked && <Check className={cn(iconSizes[size], 'text-white')} />}
      {!checked && indeterminate && (
        <div className="w-2 h-0.5 bg-white" />
      )}
    </button>
  );
}
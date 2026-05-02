import { forwardRef } from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-primary/10 text-primary border border-primary/20',
        secondary: 'bg-secondary text-secondary-foreground',
        outline: 'border border-border text-foreground',
        success: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20',
        warning: 'bg-amber-500/10 text-amber-500 border border-amber-500/20',
        danger: 'bg-destructive/10 text-destructive border border-destructive/20',
        // Plan tiers
        free: 'bg-muted text-muted-foreground border border-border',
        silver: 'bg-slate-400/10 text-slate-400 border border-slate-400/30',
        gold: 'bg-amber-500/10 text-amber-500 border border-amber-500/30',
        diamond: 'bg-cyan-400/10 text-cyan-400 border border-cyan-400/30',
        // Lyn brand
        lyn: 'lyn-gradient text-white border-0',
      },
      size: {
        sm: 'text-[10px] px-2 py-0.5',
        default: 'text-xs px-2.5 py-0.5',
        lg: 'text-sm px-3 py-1',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export const Badge = forwardRef(({ className, variant, size, ...props }, ref) => (
  <span
    ref={ref}
    className={cn(badgeVariants({ variant, size }), className)}
    {...props}
  />
));
Badge.displayName = 'Badge';

export { badgeVariants };

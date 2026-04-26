import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export const Card = forwardRef(({ className, variant = 'default', ...props }, ref) => {
  const variants = {
    default: 'bg-card border border-border',
    glass: 'lyn-glass',
    glow: 'bg-card border border-border lyn-glow',
    animated: 'lyn-border-animated',
  };

  return (
    <div
      ref={ref}
      className={cn('rounded-2xl', variants[variant], className)}
      {...props}
    />
  );
});
Card.displayName = 'Card';

export const CardHeader = forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('p-6 pb-3', className)} {...props} />
));
CardHeader.displayName = 'CardHeader';

export const CardTitle = forwardRef(({ className, ...props }, ref) => (
  <h3 ref={ref} className={cn('text-lg font-bold', className)} {...props} />
));
CardTitle.displayName = 'CardTitle';

export const CardDescription = forwardRef(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />
));
CardDescription.displayName = 'CardDescription';

export const CardContent = forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('p-6 pt-3', className)} {...props} />
));
CardContent.displayName = 'CardContent';

export const CardFooter = forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('p-6 pt-3 flex items-center gap-2', className)} {...props} />
));
CardFooter.displayName = 'CardFooter';

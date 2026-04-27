import { forwardRef } from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';

/**
 * Tabs — Tab navigation
 *
 * @example
 *   <Tabs defaultValue="general">
 *     <TabsList>
 *       <TabsTrigger value="general">عام</TabsTrigger>
 *       <TabsTrigger value="advanced">متقدم</TabsTrigger>
 *     </TabsList>
 *     <TabsContent value="general">...</TabsContent>
 *     <TabsContent value="advanced">...</TabsContent>
 *   </Tabs>
 */
export const Tabs = TabsPrimitive.Root;

export const TabsList = forwardRef(({ className, variant = 'default', ...props }, ref) => {
  const variants = {
    default: 'bg-muted p-1 rounded-xl',
    underline: 'border-b border-border',
    pills: 'gap-2',
  };

  return (
    <TabsPrimitive.List
      ref={ref}
      className={cn(
        'inline-flex items-center text-muted-foreground',
        variants[variant],
        className,
      )}
      {...props}
    />
  );
});
TabsList.displayName = TabsPrimitive.List.displayName;

export const TabsTrigger = forwardRef(
  ({ className, variant = 'default', ...props }, ref) => {
    const variants = {
      default: cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium',
        'ring-offset-background transition-all',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        'data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm',
      ),
      underline: cn(
        'inline-flex items-center justify-center whitespace-nowrap px-4 py-2.5 text-sm font-medium',
        'border-b-2 border-transparent -mb-px',
        'transition-all',
        'hover:text-foreground',
        'data-[state=active]:border-primary data-[state=active]:text-foreground',
      ),
      pills: cn(
        'inline-flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium',
        'transition-all',
        'hover:bg-accent hover:text-accent-foreground',
        'data-[state=active]:lyn-gradient data-[state=active]:text-white data-[state=active]:lyn-glow',
      ),
    };

    return (
      <TabsPrimitive.Trigger ref={ref} className={cn(variants[variant], className)} {...props} />
    );
  },
);
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

export const TabsContent = forwardRef(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      'mt-4 ring-offset-background',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      'animate-lyn-fade-up',
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

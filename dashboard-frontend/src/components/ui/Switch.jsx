import { forwardRef } from 'react';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import { cn } from '@/lib/utils';

/**
 * Switch — Toggle on/off
 *
 * @example
 *   <Switch checked={enabled} onCheckedChange={setEnabled} />
 *   <Switch size="sm" />
 *   <Switch disabled />
 */
export const Switch = forwardRef(
  ({ className, size = 'default', ...props }, ref) => {
    const sizes = {
      sm: {
        root: 'h-5 w-9',
        thumb: 'h-4 w-4 data-[state=checked]:translate-x-[-16px] data-[state=unchecked]:translate-x-0',
      },
      default: {
        root: 'h-6 w-11',
        thumb: 'h-5 w-5 data-[state=checked]:translate-x-[-20px] data-[state=unchecked]:translate-x-0',
      },
      lg: {
        root: 'h-7 w-14',
        thumb: 'h-6 w-6 data-[state=checked]:translate-x-[-28px] data-[state=unchecked]:translate-x-0',
      },
    };

    const sz = sizes[size] || sizes.default;

    return (
      <SwitchPrimitive.Root
        ref={ref}
        className={cn(
          // base
          'peer inline-flex shrink-0 cursor-pointer items-center rounded-full',
          'border-2 border-transparent transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          'disabled:cursor-not-allowed disabled:opacity-50',
          // states
          'data-[state=checked]:lyn-gradient data-[state=checked]:lyn-glow',
          'data-[state=unchecked]:bg-input',
          sz.root,
          className,
        )}
        {...props}
      >
        <SwitchPrimitive.Thumb
          className={cn(
            'pointer-events-none block rounded-full bg-white shadow-lg ring-0',
            'transition-transform duration-200',
            sz.thumb,
          )}
        />
      </SwitchPrimitive.Root>
    );
  },
);

Switch.displayName = 'Switch';

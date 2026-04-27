import { forwardRef } from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { cn } from '@/lib/utils';

/**
 * Slider — شريط رقمي
 *
 * @example
 *   <Slider value={[5]} onValueChange={([v]) => set(v)} min={1} max={20} step={1} />
 *   <Slider value={[1, 10]} ... /> // Range
 */
export const Slider = forwardRef(
  ({ className, showValue = false, valueFormat, ...props }, ref) => {
    const value = props.value || props.defaultValue || [0];

    return (
      <div className="relative w-full">
        <SliderPrimitive.Root
          ref={ref}
          className={cn(
            'relative flex w-full touch-none select-none items-center',
            'data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed',
            className,
          )}
          {...props}
        >
          <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
            <SliderPrimitive.Range className="absolute h-full lyn-gradient" />
          </SliderPrimitive.Track>
          {value.map((_, i) => (
            <SliderPrimitive.Thumb
              key={i}
              className={cn(
                'block h-5 w-5 rounded-full border-2 border-primary bg-background shadow-md',
                'transition-all',
                'hover:scale-110 hover:lyn-glow',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                'disabled:pointer-events-none disabled:opacity-50',
              )}
            />
          ))}
        </SliderPrimitive.Root>

        {showValue && (
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            <span className="num">{props.min ?? 0}</span>
            <span className="num font-semibold text-foreground">
              {valueFormat ? valueFormat(value[0]) : value[0]}
              {value[1] !== undefined && (
                <> — {valueFormat ? valueFormat(value[1]) : value[1]}</>
              )}
            </span>
            <span className="num">{props.max ?? 100}</span>
          </div>
        )}
      </div>
    );
  },
);

Slider.displayName = 'Slider';

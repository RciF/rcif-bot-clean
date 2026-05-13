import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * SectionLoading — لودر بسيط داخل صفحة (مش full page)
 * 
 * @example
 *   {isLoading ? <SectionLoading /> : <ActualContent />}
 */
export function SectionLoading({ message = 'جاري التحميل...', className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 text-muted-foreground', className)}>
      <Loader2 className="w-8 h-8 animate-spin mb-3 text-primary" />
      <p className="text-sm">{message}</p>
    </div>
  );
}
import { useEffect, useState } from 'react';
import { Save, Undo2, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

/**
 * SaveBar — شريط الحفظ السفلي العائم
 *
 * يطلع من تحت لما isDirty=true، فيه زر حفظ + تراجع
 *
 * @example
 *   <SaveBar
 *     isDirty={isDirty}
 *     isSaving={isSaving}
 *     onSave={save}
 *     onReset={reset}
 *     locked={isLocked}
 *     onLockedClick={openLockModal}
 *   />
 */
export function SaveBar({
  isDirty = false,
  isSaving = false,
  onSave,
  onReset,
  locked = false,
  onLockedClick,
  saveLabel = 'حفظ التغييرات',
  resetLabel = 'تراجع',
}) {
  const [show, setShow] = useState(false);

  // إظهار/إخفاء بسلاسة
  useEffect(() => {
    if (isDirty) {
      setShow(true);
    } else {
      const timer = setTimeout(() => setShow(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isDirty]);

  if (!show && !isDirty) return null;

  const handleSave = () => {
    if (locked && onLockedClick) {
      onLockedClick();
    } else {
      onSave?.();
    }
  };

  return (
    <div
      className={cn(
        'fixed bottom-6 inset-x-6 lg:inset-x-auto lg:left-6 lg:right-6 z-30',
        'transition-all duration-300',
        isDirty
          ? 'translate-y-0 opacity-100'
          : 'translate-y-full opacity-0 pointer-events-none',
      )}
    >
      <div
        className={cn(
          'mx-auto max-w-3xl',
          'rounded-2xl border border-border bg-card/95 backdrop-blur-xl shadow-2xl',
          'p-3 sm:p-4',
          'flex items-center gap-3 justify-between',
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={cn(
              'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0',
              locked
                ? 'bg-amber-500/20 text-amber-500'
                : 'bg-amber-500/10 text-amber-500',
            )}
          >
            <AlertCircle className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate">
              {locked
                ? 'يحتاج ترقية الخطة لحفظ التغييرات'
                : 'لديك تغييرات غير محفوظة'}
            </div>
            <div className="text-xs text-muted-foreground hidden sm:block">
              {locked ? 'جربت الإعدادات — للحفظ ترقي' : 'لا تنسى تحفظ قبل المغادرة'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            disabled={isSaving}
            className="hidden sm:inline-flex"
          >
            <Undo2 className="w-4 h-4" />
            {resetLabel}
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جاري الحفظ...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{locked ? 'ترقية للحفظ' : saveLabel}</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

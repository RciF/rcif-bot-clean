import { useState } from 'react';
import { Trash2, X as XIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/Dialog';
import { toast } from 'sonner';

/**
 * BulkDeleteToolbar — Toolbar مبسط للحذف الجماعي
 *
 * يستخدم للصفحات اللي تحتاج حذف فقط (Giveaways, AutoMod Words, Tickets).
 * مش زي BulkActionsToolbar اللي يدير 5 عمليات.
 *
 * @example
 *   <BulkDeleteToolbar
 *     selectedCount={count}
 *     onClear={clear}
 *     onDelete={async () => {
 *       await api.bulkDelete(Array.from(selectedIds));
 *     }}
 *     itemLabel="سحب"
 *     deleteWarning="السحوبات النشطة لن تُحذف"
 *   />
 */
export function BulkDeleteToolbar({
  selectedCount = 0,
  onClear,
  onDelete,
  itemLabel = 'عنصر',
  deleteWarning = null,
  customActions = [],
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [executing, setExecuting] = useState(false);

  if (selectedCount === 0) return null;

  const handleDelete = async () => {
    setExecuting(true);
    try {
      await onDelete();
      setConfirmOpen(false);
      if (onClear) onClear();
    } catch (err) {
      toast.error(err?.message || 'فشل الحذف');
    } finally {
      setExecuting(false);
    }
  };

  return (
    <>
      <div className="fixed bottom-4 inset-x-4 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-auto z-40">
        <div className="bg-card border-2 border-primary/30 shadow-2xl rounded-2xl px-3 py-2 flex items-center gap-2 flex-wrap justify-center backdrop-blur">
          {/* Counter + Clear */}
          <div className="flex items-center gap-2 pe-2 border-l border-border ms-2">
            <Badge variant="secondary" className="lyn-gradient text-white border-0">
              <span className="num">{selectedCount}</span> محدد
            </Badge>
            <button
              onClick={onClear}
              className="text-muted-foreground hover:text-foreground transition-colors"
              title="إلغاء التحديد"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>

          {/* Custom actions (optional) */}
          {customActions.map((action, idx) => {
            const Icon = action.icon;
            return (
              <Button
                key={idx}
                size="sm"
                variant={action.variant || 'outline'}
                onClick={action.onClick}
                disabled={action.disabled}
              >
                {Icon && <Icon className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{action.label}</span>
              </Button>
            );
          })}

          {/* Delete */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setConfirmOpen(true)}
            className="text-destructive border-destructive/30 hover:bg-destructive/10"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">حذف</span>
          </Button>
        </div>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-destructive" />
              </div>
              تأكيد الحذف
            </DialogTitle>
          </DialogHeader>

          <div className="py-2 space-y-3">
            <p className="text-sm">
              هل تريد حذف <strong className="num">{selectedCount}</strong> {itemLabel}؟
            </p>
            <p className="text-xs text-muted-foreground">
              ⚠️ هذا الإجراء لا يمكن التراجع عنه.
            </p>
            {deleteWarning && (
              <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-lg p-2">
                {deleteWarning}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)} disabled={executing}>
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={executing}
              loading={executing}
            >
              <Trash2 className="w-4 h-4" />
              تأكيد الحذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
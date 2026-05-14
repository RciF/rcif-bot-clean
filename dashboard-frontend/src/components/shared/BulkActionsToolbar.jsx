import { useState } from 'react';
import {
  Trash2, Ban, UserMinus, Clock, ShieldPlus, ShieldMinus,
  X as XIcon, ChevronDown, AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/Select';
import { RolePicker } from '@/components/shared/RolePicker';
import { useBulkActions } from '@/hooks/useBulkActions';
import { cn } from '@/lib/utils';

/**
 * BulkActionsToolbar — Toolbar للعمليات الجماعية على الأعضاء
 *
 * يظهر في الأسفل (sticky) لما يكون فيه أعضاء مختارين.
 * يحتوي على:
 *   - عدد المختارين
 *   - زر إلغاء التحديد
 *   - أزرار العمليات (ban / kick / mute / role+ / role-)
 *
 * @example
 *   <BulkActionsToolbar
 *     selectedIds={selectedIds}
 *     onClear={() => setSelectedIds([])}
 *     onSuccess={refresh}
 *   />
 */
export function BulkActionsToolbar({ selectedIds = [], onClear, onSuccess }) {
  const [confirmAction, setConfirmAction] = useState(null); // { type, ... }
  const { bulkBan, bulkKick, bulkMute, bulkAddRole, bulkRemoveRole } = useBulkActions();

  const count = selectedIds.length;
  if (count === 0) return null;

  const handleExecute = async () => {
    if (!confirmAction) return;
    const { type, reason, durationMs, roleId } = confirmAction;

    let result = null;
    if (type === 'ban') result = await bulkBan(selectedIds, { reason });
    else if (type === 'kick') result = await bulkKick(selectedIds, { reason });
    else if (type === 'mute') result = await bulkMute(selectedIds, durationMs, { reason });
    else if (type === 'role_add') result = await bulkAddRole(selectedIds, roleId, { reason });
    else if (type === 'role_remove') result = await bulkRemoveRole(selectedIds, roleId, { reason });

    setConfirmAction(null);
    if (result && onSuccess) onSuccess();
    if (result && onClear) onClear();
  };

  return (
    <>
      {/* Sticky toolbar في الأسفل */}
      <div className="fixed bottom-4 inset-x-4 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-auto z-40">
        <div className="bg-card border-2 border-primary/30 shadow-2xl rounded-2xl px-3 py-2 flex items-center gap-2 flex-wrap justify-center backdrop-blur">
          {/* العداد + Clear */}
          <div className="flex items-center gap-2 pe-2 border-l border-border ms-2">
            <Badge variant="secondary" className="lyn-gradient text-white border-0">
              <span className="num">{count}</span> محدد
            </Badge>
            <button
              onClick={onClear}
              className="text-muted-foreground hover:text-foreground transition-colors"
              title="إلغاء التحديد"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>

          {/* الأزرار */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setConfirmAction({ type: 'mute', durationMs: 600000, reason: '' })}
          >
            <Clock className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">كتم</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setConfirmAction({ type: 'role_add', roleId: null, reason: '' })}
          >
            <ShieldPlus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">إعطاء رتبة</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setConfirmAction({ type: 'role_remove', roleId: null, reason: '' })}
          >
            <ShieldMinus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">سحب رتبة</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setConfirmAction({ type: 'kick', reason: '' })}
            className="text-amber-600 border-amber-500/30 hover:bg-amber-500/10"
          >
            <UserMinus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">طرد</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setConfirmAction({ type: 'ban', reason: '' })}
            className="text-destructive border-destructive/30 hover:bg-destructive/10"
          >
            <Ban className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">حظر</span>
          </Button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmAction && (
        <ConfirmActionDialog
          action={confirmAction}
          count={count}
          onChange={setConfirmAction}
          onConfirm={handleExecute}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </>
  );
}

// ────────────────────────────────────────────────────────────────────
//  Confirmation Dialog
// ────────────────────────────────────────────────────────────────────

const ACTION_LABELS = {
  ban: { title: 'حظر جماعي', verb: 'حظر', icon: Ban, color: 'destructive' },
  kick: { title: 'طرد جماعي', verb: 'طرد', icon: UserMinus, color: 'warning' },
  mute: { title: 'كتم جماعي', verb: 'كتم', icon: Clock, color: 'default' },
  role_add: { title: 'إعطاء رتبة جماعي', verb: 'إعطاء الرتبة لـ', icon: ShieldPlus, color: 'default' },
  role_remove: { title: 'سحب رتبة جماعي', verb: 'سحب الرتبة من', icon: ShieldMinus, color: 'default' },
};

const DURATION_PRESETS = [
  { label: '10 دقايق', ms: 10 * 60 * 1000 },
  { label: 'ساعة', ms: 60 * 60 * 1000 },
  { label: '6 ساعات', ms: 6 * 60 * 60 * 1000 },
  { label: 'يوم', ms: 24 * 60 * 60 * 1000 },
  { label: 'أسبوع', ms: 7 * 24 * 60 * 60 * 1000 },
];

function ConfirmActionDialog({ action, count, onChange, onConfirm, onCancel }) {
  const config = ACTION_LABELS[action.type];
  if (!config) return null;
  const Icon = config.icon;

  const requiresRole = action.type === 'role_add' || action.type === 'role_remove';
  const requiresDuration = action.type === 'mute';
  const isDestructive = action.type === 'ban' || action.type === 'kick';
  const isUndoable = action.type !== 'kick';

  const canConfirm =
    (!requiresRole || action.roleId) &&
    (!requiresDuration || action.durationMs > 0);

  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className={cn(
              'w-9 h-9 rounded-xl flex items-center justify-center',
              isDestructive ? 'bg-destructive/10' : 'bg-primary/10',
            )}>
              <Icon className={cn(
                'w-5 h-5',
                isDestructive ? 'text-destructive' : 'text-primary',
              )} />
            </div>
            {config.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            سيتم {config.verb} <strong className="text-foreground num">{count}</strong> عضو
          </p>

          {/* Duration للـ mute */}
          {requiresDuration && (
            <div>
              <label className="text-xs font-medium mb-1.5 block">المدة</label>
              <Select
                value={String(action.durationMs)}
                onValueChange={(v) => onChange({ ...action, durationMs: parseInt(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_PRESETS.map((p) => (
                    <SelectItem key={p.ms} value={String(p.ms)}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Role picker لـ role_add / role_remove */}
          {requiresRole && (
            <div>
              <label className="text-xs font-medium mb-1.5 block">
                {action.type === 'role_add' ? 'الرتبة المطلوب إعطاؤها' : 'الرتبة المطلوب سحبها'}
              </label>
              <RolePicker
                value={action.roleId}
                onChange={(roleId) => onChange({ ...action, roleId })}
                placeholder="اختر رتبة..."
                excludeManaged
                excludeEveryone
              />
            </div>
          )}

          {/* Reason — اختياري */}
          <div>
            <label className="text-xs font-medium mb-1.5 block">السبب (اختياري)</label>
            <Input
              value={action.reason || ''}
              onChange={(e) => onChange({ ...action, reason: e.target.value.slice(0, 200) })}
              placeholder="مثلاً: مخالفة قوانين السيرفر"
              maxLength={200}
            />
          </div>

          {/* تحذير للـ kick */}
          {!isUndoable && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-600 dark:text-amber-400">
                ⚠️ <strong>الطرد لا يمكن التراجع عنه</strong> — العضو لازم يدخل بنفسه.
              </p>
            </div>
          )}

          {isUndoable && (
            <p className="text-[10px] text-muted-foreground text-center">
              ⏪ يمكن التراجع خلال 30 ثانية بعد التنفيذ
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onCancel}>إلغاء</Button>
          <Button
            variant={isDestructive ? 'destructive' : 'default'}
            onClick={onConfirm}
            disabled={!canConfirm}
          >
            <Icon className="w-4 h-4" />
            تأكيد {config.verb}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
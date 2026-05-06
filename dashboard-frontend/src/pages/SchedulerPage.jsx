import { useEffect, useState, useMemo } from 'react';
import {
  Clock,
  Plus,
  Calendar,
  Repeat,
  Edit3,
  Trash2,
  Hash,
  Sparkles,
  MessageSquare,
  CheckCircle2,
  PlayCircle,
  Save,
  Loader2,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { SettingsPageHeader } from '@/components/shared/SettingsPageHeader';
import { PlanLockBanner, PlanLockModal } from '@/components/shared/PlanLockOverlay';
import { EmptyState } from '@/components/shared/EmptyState';
import { ChannelPicker } from '@/components/shared/ChannelPicker';
import { usePlanGate } from '@/hooks/usePlanGate';
import { useChannel } from '@/hooks/useGuildResources';
import { useGuildStore } from '@/store/guildStore';
import { settingsApi } from '@/api';
import { PLAN_TIERS } from '@/lib/plans';
import { formatRelativeTime, formatDate, cn } from '@/lib/utils';
import { toast } from 'sonner';

const TYPE_ICONS = {
  embed: Sparkles,
  message: MessageSquare,
  command: PlayCircle,
};

const TYPE_LABELS = {
  embed: 'إيمبيد',
  message: 'رسالة',
  command: 'تشغيل أمر',
};

const FREQ_LABELS = {
  daily: 'يومياً',
  weekly: 'أسبوعياً',
  monthly: 'شهرياً',
};

const DAYS_AR = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

const DEFAULT_TASK = {
  name: '',
  type: 'message',
  channel_id: null,
  payload: { content: '' },
  schedule: { type: 'recurring', frequency: 'daily', time: '12:00' },
};

/**
 * تحويل datetime-local إلى ISO
 */
function localToIso(local) {
  if (!local) return null;
  const d = new Date(local);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function isoToLocal(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

/**
 * تطبيع task من DB:
 *   - payload + schedule يجوا JSONB strings أحياناً
 */
function normalizeTask(t) {
  let payload = t.payload;
  if (typeof payload === 'string') {
    try { payload = JSON.parse(payload); } catch { payload = {}; }
  }
  let schedule = t.schedule;
  if (typeof schedule === 'string') {
    try { schedule = JSON.parse(schedule); } catch { schedule = {}; }
  }
  return { ...t, payload: payload || {}, schedule: schedule || {} };
}

export default function SchedulerPage() {
  const { selectedGuildId } = useGuildStore();
  const [tasks, setTasks] = useState(null);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [actioning, setActioning] = useState(false);

  const planGate = usePlanGate('scheduler', PLAN_TIERS.DIAMOND);

  // ─── Load tasks ───
  useEffect(() => {
    let mounted = true;
    if (!selectedGuildId) {
      setTasks([]);
      return;
    }
    setTasks(null);
    settingsApi
      .getScheduler(selectedGuildId)
      .then((rows) => {
        if (!mounted) return;
        const list = (Array.isArray(rows) ? rows : []).map(normalizeTask);
        setTasks(list);
      })
      .catch((err) => {
        if (!mounted) return;
        setTasks([]);
        toast.error(err.message || 'فشل تحميل المهام');
      });
    return () => { mounted = false; };
  }, [selectedGuildId]);

  // ─── Toggle enabled ───
  const handleToggle = async (task) => {
    if (!selectedGuildId) return;
    const newEnabled = !task.enabled;
    try {
      await settingsApi.updateTask(selectedGuildId, task.id, {
        name: task.name,
        channel_id: task.channel_id,
        payload: task.payload,
        schedule: task.schedule,
        enabled: newEnabled,
      });
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, enabled: newEnabled } : t)),
      );
      toast.success(newEnabled ? 'تم تفعيل المهمة' : 'تم إيقاف المهمة');
    } catch (err) {
      if (err.code === 'PLAN_REQUIRED') {
        toast.error('تعديل المُجدول يحتاج خطة Diamond');
      } else {
        toast.error(err.message || 'فشل التحديث');
      }
    }
  };

  // ─── Delete ───
  const handleDelete = async () => {
    if (!confirmDelete || !selectedGuildId) return;
    setActioning(true);
    try {
      await settingsApi.deleteTask(selectedGuildId, confirmDelete.id);
      setTasks((prev) => prev.filter((t) => t.id !== confirmDelete.id));
      setConfirmDelete(null);
      toast.success('تم حذف المهمة');
    } catch (err) {
      toast.error(err.message || 'فشل الحذف');
    } finally {
      setActioning(false);
    }
  };

  // ─── New / Edit ───
  const handleNew = () => {
    setEditing({ task: { ...DEFAULT_TASK }, isNew: true });
  };

  const handleEdit = (task) => {
    // تحويل runAt من ISO إلى local datetime
    const schedule = { ...task.schedule };
    if (schedule.type === 'once' && schedule.runAt) {
      schedule.runAt = isoToLocal(schedule.runAt);
    }
    setEditing({
      task: { ...task, schedule },
      isNew: false,
    });
  };

  const handleSave = async () => {
    if (!selectedGuildId || !editing) return;
    const t = editing.task;

    if (!t.name?.trim()) return toast.error('اسم المهمة مطلوب');
    if (!t.channel_id) return toast.error('اختر قناة');
    if (!t.type) return toast.error('اختر نوع المهمة');
    if (!t.schedule?.type) return toast.error('اختر نوع الجدولة');

    // تحويل runAt من local إلى ISO
    const schedule = { ...t.schedule };
    if (schedule.type === 'once' && schedule.runAt) {
      schedule.runAt = localToIso(schedule.runAt);
      if (!schedule.runAt) return toast.error('تاريخ ووقت غير صالح');
    }

    const payload = {
      name: t.name.trim(),
      type: t.type,
      channel_id: t.channel_id,
      payload: t.payload || {},
      schedule,
    };

    setActioning(true);
    try {
      if (editing.isNew) {
        const created = await settingsApi.createTask(selectedGuildId, payload);
        setTasks((prev) => [normalizeTask(created), ...(prev || [])]);
        toast.success('تم إنشاء المهمة');
      } else {
        await settingsApi.updateTask(selectedGuildId, t.id, {
          ...payload,
          enabled: t.enabled !== undefined ? t.enabled : true,
        });
        setTasks((prev) =>
          prev.map((x) =>
            x.id === t.id
              ? normalizeTask({ ...x, ...payload, id: t.id })
              : x,
          ),
        );
        toast.success('تم حفظ التعديلات');
      }
      setEditing(null);
    } catch (err) {
      if (err.code === 'PLAN_REQUIRED') {
        toast.error('تحتاج خطة Diamond');
      } else {
        toast.error(err.message || 'فشل الحفظ');
      }
    } finally {
      setActioning(false);
    }
  };

  const updateEditField = (path, value) => {
    setEditing((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      const keys = path.split('.');
      let target = next.task;
      for (let i = 0; i < keys.length - 1; i++) {
        if (target[keys[i]] === undefined) target[keys[i]] = {};
        target = target[keys[i]];
      }
      target[keys[keys.length - 1]] = value;
      return next;
    });
  };

  // ─── Stats ───
  const stats = useMemo(() => {
    if (!tasks) return null;
    return {
      total: tasks.length,
      active: tasks.filter((t) => t.enabled).length,
      nextRun: tasks
        .filter((t) => t.enabled && t.next_run_at)
        .sort(
          (a, b) => new Date(a.next_run_at) - new Date(b.next_run_at),
        )[0],
    };
  }, [tasks]);

  return (
    <>
      <SettingsPageHeader
        icon={<Clock />}
        title="المُجدوِل"
        description="جدولة الإيمبيدات والرسائل تلقائياً"
        plan="diamond"
        actions={
          <Button onClick={planGate.gateAction(handleNew)}>
            <Plus className="w-4 h-4" />
            مهمة جديدة
          </Button>
        }
      />

      {planGate.isLocked && (
        <PlanLockBanner
          currentPlan={planGate.currentPlan}
          requiredPlan={planGate.requiredPlan}
          featureName="المُجدوِل"
          className="mb-6"
        />
      )}

      {/* Stats */}
      {stats && stats.total > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Card className="p-4">
            <div className="text-xs text-muted-foreground mb-1">المجموع</div>
            <div className="text-2xl font-bold num">{stats.total}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground mb-1">نشطة</div>
            <div className="text-2xl font-bold num text-emerald-500">
              {stats.active}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground mb-1">التشغيل القادم</div>
            <div className="text-sm font-bold truncate">
              {stats.nextRun ? formatRelativeTime(stats.nextRun.next_run_at) : '—'}
            </div>
          </Card>
        </div>
      )}

      {/* Tasks List */}
      {tasks === null ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <Card className="p-5">
          <EmptyState
            icon={<Clock />}
            title="لا توجد مهام مجدولة"
            description="أنشئ مهمة لإرسال إيمبيدات أو رسائل تلقائياً في أوقات محددة"
            action={
              <Button onClick={planGate.gateAction(handleNew)}>
                <Plus className="w-4 h-4" />
                إنشاء أول مهمة
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <ScheduledTaskCard
              key={task.id}
              task={task}
              onToggle={() => handleToggle(task)}
              onEdit={() => planGate.gateAction(() => handleEdit(task))()}
              onDelete={() => setConfirmDelete(task)}
              planGate={planGate}
            />
          ))}
        </div>
      )}

      <PlanLockModal {...planGate.lockModalProps} />

      {/* ═══ Edit/Create Dialog ═══ */}
      <Dialog
        open={!!editing}
        onOpenChange={(v) => !v && !actioning && setEditing(null)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing?.isNew ? 'مهمة جديدة' : 'تعديل المهمة'}
            </DialogTitle>
            <DialogDescription>
              جدولة رسائل تلقائية في أوقات محددة
            </DialogDescription>
          </DialogHeader>

          {editing && <TaskEditor editing={editing} updateField={updateEditField} />}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditing(null)}
              className="flex-1"
              disabled={actioning}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1"
              disabled={actioning}
            >
              {actioning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  حفظ
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Delete Confirm ═══ */}
      <Dialog
        open={!!confirmDelete}
        onOpenChange={(v) => !v && !actioning && setConfirmDelete(null)}
      >
        <DialogContent>
          <div className="flex justify-center -mt-4 mb-2">
            <div className="w-16 h-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center">
              <Trash2 className="w-8 h-8" />
            </div>
          </div>
          <DialogHeader>
            <DialogTitle className="text-center">حذف المهمة؟</DialogTitle>
            <DialogDescription className="text-center">
              راح يتم حذف{' '}
              <span className="font-bold text-foreground">{confirmDelete?.name}</span>{' '}
              نهائياً
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDelete(null)}
              className="flex-1"
              disabled={actioning}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleDelete}
              className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              disabled={actioning}
            >
              <Trash2 className="w-4 h-4" />
              {actioning ? 'جاري الحذف...' : 'حذف'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ════════════════════════════════════════════════════════════
//  Task Editor (نموذج إنشاء/تعديل)
// ════════════════════════════════════════════════════════════

function TaskEditor({ editing, updateField }) {
  const t = editing.task;
  const schedule = t.schedule || {};

  return (
    <div className="space-y-3">
      <div>
        <label className="text-sm font-medium mb-1.5 block">اسم المهمة *</label>
        <Input
          value={t.name}
          onChange={(e) => updateField('name', e.target.value)}
          placeholder="مثال: تذكير يومي"
          maxLength={80}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium mb-1.5 block">النوع</label>
          <Select
            value={t.type}
            onValueChange={(v) => updateField('type', v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="message">💬 رسالة</SelectItem>
              <SelectItem value="embed">✨ إيمبيد</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">القناة *</label>
          <ChannelPicker
            value={t.channel_id}
            onChange={(v) => updateField('channel_id', v)}
            types={[0, 5]}
            placeholder="اختر قناة..."
          />
        </div>
      </div>

      {/* Payload */}
      {t.type === 'message' && (
        <div>
          <label className="text-sm font-medium mb-1.5 block">المحتوى</label>
          <textarea
            value={t.payload?.content || ''}
            onChange={(e) => updateField('payload.content', e.target.value)}
            placeholder="نص الرسالة..."
            rows={3}
            maxLength={2000}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm resize-y"
          />
        </div>
      )}

      {t.type === 'embed' && (
        <>
          <div>
            <label className="text-sm font-medium mb-1.5 block">عنوان الإيمبيد</label>
            <Input
              value={t.payload?.title || ''}
              onChange={(e) => updateField('payload.title', e.target.value)}
              placeholder="عنوان..."
              maxLength={256}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">وصف الإيمبيد</label>
            <textarea
              value={t.payload?.description || ''}
              onChange={(e) => updateField('payload.description', e.target.value)}
              placeholder="الوصف..."
              rows={3}
              maxLength={2000}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm resize-y"
            />
          </div>
        </>
      )}

      {/* Schedule */}
      <div className="rounded-xl border border-border p-3 space-y-3 bg-muted/20">
        <h4 className="text-sm font-bold flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          الجدولة
        </h4>

        <div>
          <label className="text-xs font-medium mb-1.5 block">نوع التشغيل</label>
          <Select
            value={schedule.type || 'recurring'}
            onValueChange={(v) => updateField('schedule.type', v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="once">⏰ مرة واحدة</SelectItem>
              <SelectItem value="recurring">🔁 متكرر</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {schedule.type === 'once' && (
          <div>
            <label className="text-xs font-medium mb-1.5 block">التاريخ والوقت</label>
            <Input
              type="datetime-local"
              value={schedule.runAt || ''}
              onChange={(e) => updateField('schedule.runAt', e.target.value)}
            />
          </div>
        )}

        {schedule.type === 'recurring' && (
          <>
            <div>
              <label className="text-xs font-medium mb-1.5 block">التكرار</label>
              <Select
                value={schedule.frequency || 'daily'}
                onValueChange={(v) => updateField('schedule.frequency', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">يومياً</SelectItem>
                  <SelectItem value="weekly">أسبوعياً</SelectItem>
                  <SelectItem value="monthly">شهرياً</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {schedule.frequency === 'weekly' && (
              <div>
                <label className="text-xs font-medium mb-1.5 block">يوم الأسبوع</label>
                <Select
                  value={String(schedule.dayOfWeek ?? 0)}
                  onValueChange={(v) => updateField('schedule.dayOfWeek', parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS_AR.map((d, i) => (
                      <SelectItem key={i} value={String(i)}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {schedule.frequency === 'monthly' && (
              <div>
                <label className="text-xs font-medium mb-1.5 block">يوم الشهر (1-28)</label>
                <Input
                  type="number"
                  min={1}
                  max={28}
                  value={schedule.dayOfMonth || 1}
                  onChange={(e) =>
                    updateField('schedule.dayOfMonth', parseInt(e.target.value))
                  }
                  className="num"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-medium mb-1.5 block">الوقت</label>
              <Input
                type="time"
                value={schedule.time || '12:00'}
                onChange={(e) => updateField('schedule.time', e.target.value)}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  Task Card
// ════════════════════════════════════════════════════════════

function ScheduledTaskCard({ task, onToggle, onEdit, onDelete, planGate }) {
  const Icon = TYPE_ICONS[task.type] || Clock;
  const channel = useChannel(task.channel_id);

  const scheduleText = (() => {
    const s = task.schedule || {};
    if (s.type === 'once') {
      return `مرة واحدة • ${formatDate(s.runAt, { hour: '2-digit', minute: '2-digit' })}`;
    }
    const freq = FREQ_LABELS[s.frequency] || 'متكرر';
    let parts = [freq];
    if (s.frequency === 'weekly' && s.dayOfWeek != null) {
      parts.push(`يوم ${DAYS_AR[s.dayOfWeek]}`);
    }
    if (s.frequency === 'monthly' && s.dayOfMonth) {
      parts.push(`يوم ${s.dayOfMonth}`);
    }
    if (s.time) parts.push(`الساعة ${s.time}`);
    return parts.join(' • ');
  })();

  const successRate =
    task.run_count > 0
      ? Math.round((task.success_count / task.run_count) * 100)
      : null;

  return (
    <Card className={cn('p-5 transition-all', !task.enabled && 'opacity-60')}>
      <div className="flex items-start gap-4">
        <div
          className={cn(
            'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0',
            task.enabled ? 'lyn-gradient' : 'bg-muted',
          )}
        >
          <Icon
            className={cn(
              'w-6 h-6',
              task.enabled ? 'text-white' : 'text-muted-foreground',
            )}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="font-bold">{task.name}</h3>
            <Badge variant="default" size="sm">
              {TYPE_LABELS[task.type]}
            </Badge>
            {task.schedule?.type === 'recurring' && (
              <Badge variant="default" size="sm">
                <Repeat className="w-3 h-3" />
                متكرر
              </Badge>
            )}
            {!task.enabled && (
              <Badge variant="warning" size="sm">
                موقوف
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2 flex-wrap">
            <Calendar className="w-3.5 h-3.5" />
            <span>{scheduleText}</span>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
            <Hash className="w-3.5 h-3.5" />
            <span>
              {channel ? `#${channel.name}` : `قناة محذوفة`}
            </span>
          </div>

          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border text-xs flex-wrap">
            {task.next_run_at && task.enabled && (
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-muted-foreground">القادم:</span>
                <span className="font-medium">
                  {formatRelativeTime(task.next_run_at)}
                </span>
              </div>
            )}
            {task.last_run_at && (
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-muted-foreground">آخر تشغيل:</span>
                <span className="font-medium">
                  {formatRelativeTime(task.last_run_at)}
                </span>
              </div>
            )}
            {successRate !== null && (
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">النجاح:</span>
                <span
                  className={cn(
                    'font-bold num',
                    successRate === 100 && 'text-emerald-500',
                    successRate < 100 && successRate >= 80 && 'text-amber-500',
                    successRate < 80 && 'text-destructive',
                  )}
                >
                  {successRate}% ({task.success_count}/{task.run_count})
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <Switch
            checked={task.enabled}
            onCheckedChange={planGate.gateAction(onToggle)}
          />

          <div className="flex items-center gap-1">
            <button
              onClick={onEdit}
              className="w-8 h-8 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
              title="تعديل"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={onDelete}
              className="w-8 h-8 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive flex items-center justify-center transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}
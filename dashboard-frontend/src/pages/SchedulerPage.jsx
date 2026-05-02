import { useEffect, useState } from 'react';
import {
  Clock,
  Plus,
  Calendar,
  Repeat,
  Power,
  Edit3,
  Trash2,
  Hash,
  Sparkles,
  MessageSquare,
  CheckCircle2,
  XCircle,
  PlayCircle,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
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
import { SettingsPageHeader } from '@/components/shared/SettingsPageHeader';
import { PlanLockBanner, PlanLockModal } from '@/components/shared/PlanLockOverlay';
import { EmptyState } from '@/components/shared/EmptyState';
import { usePlanGate } from '@/hooks/usePlanGate';
import { useChannel } from '@/hooks/useGuildResources';
import { mock } from '@/lib/mock';
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

export default function SchedulerPage() {
  const [tasks, setTasks] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const planGate = usePlanGate('scheduler', PLAN_TIERS.SILVER);

  useEffect(() => {
    mock.scheduledTasks().then(setTasks);
  }, []);

  const handleToggle = (id) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, enabled: !t.enabled } : t)),
    );
    toast.success('تم تحديث الحالة');
  };

  const handleDelete = () => {
    setTasks((prev) => prev.filter((t) => t.id !== confirmDelete.id));
    setConfirmDelete(null);
    toast.success('تم حذف المهمة');
  };

  const handleRunNow = (task) => {
    toast.success(`تم تشغيل "${task.name}" يدوياً`);
  };

  const stats = tasks
    ? {
        total: tasks.length,
        active: tasks.filter((t) => t.enabled).length,
        nextRun: tasks
          .filter((t) => t.enabled && t.nextRunAt)
          .sort((a, b) => new Date(a.nextRunAt) - new Date(b.nextRunAt))[0],
      }
    : null;

  return (
    <>
      <SettingsPageHeader
        icon={<Clock />}
        title="المُجدوِل"
        description="جدولة الإيمبيدات والرسائل تلقائياً"
        plan="diamond"
        actions={
          <Button onClick={planGate.gateAction(() => toast.info('قريباً: نموذج إنشاء مهمة'))}>
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
      {stats && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Card className="p-4">
            <div className="text-xs text-muted-foreground mb-1">المجموع</div>
            <div className="text-2xl font-bold num">{stats.total}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground mb-1">نشطة</div>
            <div className="text-2xl font-bold num text-emerald-500">{stats.active}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground mb-1">التشغيل القادم</div>
            <div className="text-sm font-bold truncate">
              {stats.nextRun ? formatRelativeTime(stats.nextRun.nextRunAt) : '—'}
            </div>
          </Card>
        </div>
      )}

      {/* Tasks List */}
      {!tasks ? (
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
              <Button onClick={planGate.gateAction(() => toast.info('قريباً'))}>
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
              onToggle={() => handleToggle(task.id)}
              onDelete={() => setConfirmDelete(task)}
              onRunNow={() => handleRunNow(task)}
              planGate={planGate}
            />
          ))}
        </div>
      )}

      <PlanLockModal {...planGate.lockModalProps} />

      {/* Delete Confirm */}
      <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
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
              <span className="font-bold text-foreground">{confirmDelete?.name}</span> نهائياً
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)} className="flex-1">
              إلغاء
            </Button>
            <Button
              onClick={handleDelete}
              className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              <Trash2 className="w-4 h-4" />
              حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ════════════════════════════════════════════════════════════
//  Task Card
// ════════════════════════════════════════════════════════════

function ScheduledTaskCard({ task, onToggle, onDelete, onRunNow, planGate }) {
  const Icon = TYPE_ICONS[task.type] || Clock;
  const channel = useChannel(task.channel);

  const scheduleText = (() => {
    if (task.schedule.type === 'once') {
      return `مرة واحدة • ${formatDate(task.schedule.runAt, { hour: '2-digit', minute: '2-digit' })}`;
    }
    const freq = FREQ_LABELS[task.schedule.frequency];
    let parts = [freq];
    if (task.schedule.frequency === 'weekly' && task.schedule.dayOfWeek != null) {
      parts.push(`يوم ${DAYS_AR[task.schedule.dayOfWeek]}`);
    }
    if (task.schedule.frequency === 'monthly' && task.schedule.dayOfMonth) {
      parts.push(`يوم ${task.schedule.dayOfMonth}`);
    }
    if (task.schedule.time) parts.push(`الساعة ${task.schedule.time}`);
    return parts.join(' • ');
  })();

  const successRate =
    task.runCount > 0 ? Math.round((task.successCount / task.runCount) * 100) : null;

  return (
    <Card className={cn('p-5 transition-all', !task.enabled && 'opacity-60')}>
      <div className="flex items-start gap-4">
        <div
          className={cn(
            'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0',
            task.enabled ? 'lyn-gradient' : 'bg-muted',
          )}
        >
          <Icon className={cn('w-6 h-6', task.enabled ? 'text-white' : 'text-muted-foreground')} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="font-bold">{task.name}</h3>
            <Badge variant="default" size="sm">
              {TYPE_LABELS[task.type]}
            </Badge>
            {task.schedule.type === 'recurring' && (
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
            <span>{channel ? `#${channel.name}` : `قناة ${task.channel}`}</span>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border text-xs">
            {task.nextRunAt && task.enabled && (
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-muted-foreground">القادم:</span>
                <span className="font-medium">{formatRelativeTime(task.nextRunAt)}</span>
              </div>
            )}
            {task.lastRunAt && (
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-muted-foreground">آخر تشغيل:</span>
                <span className="font-medium">{formatRelativeTime(task.lastRunAt)}</span>
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
                  {successRate}% ({task.successCount}/{task.runCount})
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <Switch
            checked={task.enabled}
            onCheckedChange={planGate.gateAction(onToggle)}
          />

          <div className="flex items-center gap-1">
            <button
              onClick={planGate.gateAction(onRunNow)}
              className="w-8 h-8 rounded-lg hover:bg-accent text-muted-foreground hover:text-emerald-500 flex items-center justify-center transition-colors"
              title="تشغيل الآن"
            >
              <PlayCircle className="w-4 h-4" />
            </button>
            <button
              onClick={planGate.gateAction(() => toast.info('قريباً: تعديل المهمة'))}
              className="w-8 h-8 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
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

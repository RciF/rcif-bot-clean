import { useEffect, useState } from 'react';
import {
  CalendarDays,
  Plus,
  Clock,
  Users,
  Hash,
  Bell,
  Edit3,
  Trash2,
  PartyPopper,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { SettingsPageHeader } from '@/components/shared/SettingsPageHeader';
import { PlanLockBanner } from '@/components/shared/PlanLockOverlay';
import { EmptyState } from '@/components/shared/EmptyState';
import { usePlanGate } from '@/hooks/usePlanGate';
import { mock } from '@/lib/mock';
import { PLAN_TIERS } from '@/lib/plans';
import { formatRelativeTime, formatDate, cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function EventsPage() {
  const [events, setEvents] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const planGate = usePlanGate('events', PLAN_TIERS.GOLD);

  useEffect(() => {
    mock.eventsList().then(setEvents);
  }, []);

  const handleDelete = () => {
    setEvents((prev) => prev.filter((e) => e.id !== confirmDelete.id));
    setConfirmDelete(null);
    toast.success('تم حذف الفعالية');
  };

  const upcoming = events?.filter((e) => e.status === 'upcoming') || [];
  const ended = events?.filter((e) => e.status === 'ended') || [];

  return (
    <>
      <SettingsPageHeader
        icon={<CalendarDays />}
        title="الفعاليات"
        description="نظّم فعاليات تفاعلية مع تذكيرات تلقائية"
        plan="gold"
        actions={
          <Button onClick={planGate.gateAction(() => toast.info('قريباً: نموذج إنشاء الفعاليات'))}>
            <Plus className="w-4 h-4" />
            فعالية جديدة
          </Button>
        }
      />

      {planGate.isLocked && (
        <PlanLockBanner
          currentPlan={planGate.currentPlan}
          requiredPlan={planGate.requiredPlan}
          featureName="نظام الفعاليات"
          className="mb-6"
        />
      )}

      {!events ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <Card className="p-5">
          <EmptyState
            icon={<CalendarDays />}
            title="لا توجد فعاليات بعد"
            description="ابدأ بإنشاء فعالية جديدة لجمع أعضاء سيرفرك"
            action={
              <Button onClick={planGate.gateAction(() => toast.info('قريباً'))}>
                <Plus className="w-4 h-4" />
                إنشاء أول فعالية
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          {/* Upcoming */}
          {upcoming.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-bold text-muted-foreground mb-3 uppercase tracking-wider">
                القادمة ({upcoming.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {upcoming.map((ev) => (
                  <EventCard
                    key={ev.id}
                    event={ev}
                    onDelete={() => setConfirmDelete(ev)}
                    planGate={planGate}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Ended */}
          {ended.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-muted-foreground mb-3 uppercase tracking-wider">
                المنتهية ({ended.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {ended.map((ev) => (
                  <EventCard
                    key={ev.id}
                    event={ev}
                    onDelete={() => setConfirmDelete(ev)}
                    planGate={planGate}
                    ended
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Delete Confirm */}
      <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent>
          <div className="flex justify-center -mt-4 mb-2">
            <div className="w-16 h-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center">
              <Trash2 className="w-8 h-8" />
            </div>
          </div>
          <DialogHeader>
            <DialogTitle className="text-center">حذف الفعالية؟</DialogTitle>
            <DialogDescription className="text-center">
              راح يتم حذف{' '}
              <span className="font-bold text-foreground">{confirmDelete?.title}</span>{' '}
              نهائياً مع كل المسجلين
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
//  Event Card
// ════════════════════════════════════════════════════════════

function EventCard({ event, onDelete, planGate, ended = false }) {
  const fillPercent = (event.registered / event.maxParticipants) * 100;
  const isFull = fillPercent >= 100;

  return (
    <Card className={cn('p-5 hover:border-border/80 transition-colors', ended && 'opacity-70')}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div
            className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0',
              ended ? 'bg-muted text-muted-foreground' : 'lyn-gradient lyn-glow',
            )}
          >
            <PartyPopper className={cn('w-6 h-6', !ended && 'text-white')} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold truncate">{event.title}</h3>
            <Badge
              variant={ended ? 'default' : isFull ? 'success' : 'default'}
              size="sm"
              className="mt-0.5"
            >
              {ended ? 'منتهية' : isFull ? 'مكتملة' : 'متاحة'}
            </Badge>
          </div>
        </div>

        {!ended && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={planGate.gateAction(() => toast.info('قريباً'))}
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
        )}
      </div>

      {/* Description */}
      <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{event.description}</p>

      {/* Date */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2 text-sm">
          <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <span>
            {ended ? 'انتهت ' : 'تبدأ '}
            {ended
              ? formatRelativeTime(event.startsAt)
              : formatDate(event.startsAt, { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Hash className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <span className="text-muted-foreground">قناة #{event.channel}</span>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Bell className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <span className="text-muted-foreground">
            تذكير قبل <span className="num">{event.reminderHours}</span> ساعة
          </span>
        </div>
      </div>

      {/* Participants */}
      <div className="mt-4 pt-3 border-t border-border">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            المسجلون
          </div>
          <span className="text-xs font-bold num">
            {event.registered} / {event.maxParticipants}
          </span>
        </div>
        <div className="h-2 bg-muted/40 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full transition-all',
              isFull ? 'bg-emerald-500' : 'lyn-gradient',
            )}
            style={{ width: `${Math.min(fillPercent, 100)}%` }}
          />
        </div>
      </div>
    </Card>
  );
}

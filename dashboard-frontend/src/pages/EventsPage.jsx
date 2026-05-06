import { useEffect, useState, useMemo } from 'react';
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
  Save,
  Loader2,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
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
import { ChannelPicker } from '@/components/shared/ChannelPicker';
import { usePlanGate } from '@/hooks/usePlanGate';
import { useGuildResources } from '@/hooks/useGuildResources';
import { useGuildStore } from '@/store/guildStore';
import { settingsApi } from '@/api';
import { PLAN_TIERS } from '@/lib/plans';
import { formatRelativeTime, formatDate, cn } from '@/lib/utils';
import { toast } from 'sonner';

const DEFAULT_EVENT = {
  title: '',
  description: '',
  image: '',
  starts_at: '',
  max_participants: 50,
  channel: null,
  reminder_hours: 1,
};

/**
 * تحويل تاريخ ISO إلى صيغة datetime-local (للـ input)
 */
function toLocalDateTimeString(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

/**
 * تطبيع event من الباك اند (يضيف حقول محسوبة محلياً)
 */
function normalizeEvent(e) {
  const startsAt = e.starts_at ? new Date(e.starts_at) : null;
  const isEnded = startsAt && startsAt.getTime() < Date.now();
  return {
    ...e,
    isEnded,
    // ما عندنا attendees count من الباك اند هنا — نخليه 0
    registered: e.registered || 0,
  };
}

export default function EventsPage() {
  const { selectedGuildId } = useGuildStore();
  const [events, setEvents] = useState(null);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [actioning, setActioning] = useState(false);

  const planGate = usePlanGate('events', PLAN_TIERS.GOLD);
  const { channels } = useGuildResources({ types: ['channels'] });

  const getChannelName = (channelId) => {
    const ch = channels?.find((c) => c.id === channelId);
    return ch ? `#${ch.name}` : 'قناة محذوفة';
  };

  // ─── Load events ───
  useEffect(() => {
    let mounted = true;
    if (!selectedGuildId) {
      setEvents([]);
      return;
    }
    setEvents(null);
    settingsApi
      .getEvents(selectedGuildId)
      .then((rows) => {
        if (!mounted) return;
        const list = (Array.isArray(rows) ? rows : []).map(normalizeEvent);
        setEvents(list);
      })
      .catch((err) => {
        if (!mounted) return;
        setEvents([]);
        toast.error(err.message || 'فشل تحميل الفعاليات');
      });
    return () => { mounted = false; };
  }, [selectedGuildId]);

  // ─── Handlers ───
  const handleNew = () => {
    setEditing({ event: { ...DEFAULT_EVENT }, isNew: true });
  };

  const handleEdit = (event) => {
    setEditing({
      event: {
        ...event,
        starts_at: toLocalDateTimeString(event.starts_at),
      },
      isNew: false,
    });
  };

  const handleDelete = async () => {
    if (!confirmDelete || !selectedGuildId) return;
    setActioning(true);
    try {
      await settingsApi.deleteEvent(selectedGuildId, confirmDelete.id);
      setEvents((prev) => prev.filter((e) => e.id !== confirmDelete.id));
      setConfirmDelete(null);
      toast.success('تم حذف الفعالية');
    } catch (err) {
      toast.error(err.message || 'فشل الحذف');
    } finally {
      setActioning(false);
    }
  };

  const handleSave = async () => {
    const ev = editing.event;
    if (!ev.title?.trim()) return toast.error('العنوان مطلوب');
    if (!ev.starts_at) return toast.error('تاريخ البدء مطلوب');
    if (!ev.channel) return toast.error('اختر قناة الفعالية');

    setActioning(true);

    // تحويل datetime-local → ISO
    const payload = {
      title: ev.title.trim(),
      description: ev.description || '',
      image: ev.image || null,
      starts_at: new Date(ev.starts_at).toISOString(),
      max_participants: parseInt(ev.max_participants) || 50,
      channel: ev.channel,
      reminder_hours: parseInt(ev.reminder_hours) || 1,
    };

    try {
      if (editing.isNew) {
        const created = await settingsApi.createEvent(selectedGuildId, payload);
        setEvents((prev) => [normalizeEvent(created), ...(prev || [])]);
        toast.success('تم إنشاء الفعالية');
      } else {
        await settingsApi.updateEvent(selectedGuildId, ev.id, payload);
        setEvents((prev) =>
          prev.map((e) =>
            e.id === ev.id ? normalizeEvent({ ...e, ...payload, id: ev.id }) : e,
          ),
        );
        toast.success('تم تحديث الفعالية');
      }
      setEditing(null);
    } catch (err) {
      if (err.code === 'PLAN_REQUIRED') {
        toast.error('تحتاج خطة Gold أو أعلى');
      } else {
        toast.error(err.message || 'فشل الحفظ');
      }
    } finally {
      setActioning(false);
    }
  };

  const updateEditField = (field, value) => {
    setEditing((prev) => ({ ...prev, event: { ...prev.event, [field]: value } }));
  };

  // ─── Computed ───
  const upcoming = useMemo(
    () => (events || []).filter((e) => !e.isEnded),
    [events],
  );
  const ended = useMemo(
    () => (events || []).filter((e) => e.isEnded),
    [events],
  );

  return (
    <>
      <SettingsPageHeader
        icon={<CalendarDays />}
        title="الفعاليات"
        description="نظّم فعاليات تفاعلية مع تذكيرات تلقائية"
        plan="gold"
        actions={
          <Button onClick={planGate.gateAction(handleNew)}>
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

      {events === null ? (
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
              <Button onClick={planGate.gateAction(handleNew)}>
                <Plus className="w-4 h-4" />
                إنشاء أول فعالية
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-bold text-muted-foreground mb-3 uppercase tracking-wider">
                القادمة (<span className="num">{upcoming.length}</span>)
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {upcoming.map((ev) => (
                  <EventCard
                    key={ev.id}
                    event={ev}
                    channelName={getChannelName(ev.channel)}
                    onEdit={() => planGate.gateAction(() => handleEdit(ev))()}
                    onDelete={() => setConfirmDelete(ev)}
                  />
                ))}
              </div>
            </div>
          )}

          {ended.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-muted-foreground mb-3 uppercase tracking-wider">
                المنتهية (<span className="num">{ended.length}</span>)
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {ended.map((ev) => (
                  <EventCard
                    key={ev.id}
                    event={ev}
                    channelName={getChannelName(ev.channel)}
                    onEdit={() => planGate.gateAction(() => handleEdit(ev))()}
                    onDelete={() => setConfirmDelete(ev)}
                    ended
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ═══ Edit/Create Dialog ═══ */}
      <Dialog open={!!editing} onOpenChange={(v) => !v && !actioning && setEditing(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing?.isNew ? 'فعالية جديدة' : 'تعديل الفعالية'}
            </DialogTitle>
            <DialogDescription>
              {editing?.isNew
                ? 'أنشئ فعالية وحدد القناة والمشاركين'
                : 'عدّل تفاصيل الفعالية'}
            </DialogDescription>
          </DialogHeader>

          {editing && (
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block">العنوان *</label>
                <Input
                  value={editing.event.title}
                  onChange={(e) => updateEditField('title', e.target.value)}
                  placeholder="مثال: نقاش أسبوعي"
                  maxLength={100}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">الوصف</label>
                <textarea
                  value={editing.event.description || ''}
                  onChange={(e) => updateEditField('description', e.target.value)}
                  placeholder="تفاصيل الفعالية..."
                  rows={3}
                  maxLength={500}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm resize-y"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">القناة *</label>
                <ChannelPicker
                  value={editing.event.channel}
                  onChange={(v) => updateEditField('channel', v)}
                  types={[0, 5]}
                  placeholder="اختر قناة الفعالية..."
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">تاريخ ووقت البدء *</label>
                <Input
                  type="datetime-local"
                  value={editing.event.starts_at}
                  onChange={(e) => updateEditField('starts_at', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">الحد الأقصى</label>
                  <Input
                    type="number"
                    min={1}
                    max={1000}
                    value={editing.event.max_participants}
                    onChange={(e) => updateEditField('max_participants', e.target.value)}
                    className="num"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">
                    تذكير قبل (ساعة)
                  </label>
                  <Input
                    type="number"
                    min={0}
                    max={48}
                    value={editing.event.reminder_hours}
                    onChange={(e) => updateEditField('reminder_hours', e.target.value)}
                    className="num"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  رابط الصورة (اختياري)
                </label>
                <Input
                  value={editing.event.image || ''}
                  onChange={(e) => updateEditField('image', e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </div>
          )}

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
                  {editing?.isNew ? 'إنشاء' : 'حفظ'}
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
            <DialogTitle className="text-center">حذف الفعالية؟</DialogTitle>
            <DialogDescription className="text-center">
              راح يتم حذف{' '}
              <span className="font-bold text-foreground">{confirmDelete?.title}</span>{' '}
              نهائياً مع كل المسجلين
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
//  Event Card
// ════════════════════════════════════════════════════════════

function EventCard({ event, channelName, onEdit, onDelete, ended = false }) {
  const max = event.max_participants || 0;
  const fillPercent = max > 0 ? (event.registered / max) * 100 : 0;
  const isFull = fillPercent >= 100;

  return (
    <Card
      className={cn(
        'p-5 hover:border-border/80 transition-colors group',
        ended && 'opacity-70',
      )}
    >
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
              {ended ? 'منتهية' : isFull ? 'ممتلئة' : 'قادمة'}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Edit3 className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="hover:text-destructive"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {event.description && (
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {event.description}
        </p>
      )}

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <span className="text-muted-foreground">
            {ended ? 'انتهت ' : 'تبدأ '}
            {ended
              ? formatRelativeTime(event.starts_at)
              : formatDate(event.starts_at, {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
          </span>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Hash className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <span className="text-muted-foreground truncate">{channelName}</span>
        </div>

        {event.reminder_hours > 0 && !ended && (
          <div className="flex items-center gap-2 text-sm">
            <Bell className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className="text-muted-foreground">
              تذكير قبل <span className="num">{event.reminder_hours}</span> ساعة
            </span>
          </div>
        )}
      </div>

      {/* Participants */}
      <div className="mt-4 pt-3 border-t border-border">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            المسجلون
          </div>
          <span className="text-xs font-bold num">
            {event.registered} / {max}
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
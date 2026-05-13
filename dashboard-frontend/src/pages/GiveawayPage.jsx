import { useState, useEffect } from 'react';
import {
  Gift,
  Plus,
  Trophy,
  Clock,
  Users,
  X as XIcon,
  Shuffle,
  CheckCircle2,
  Trash2,
  ChevronRight,
  Sparkles,
  Filter,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
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
import { RolePicker } from '@/components/shared/RolePicker';
import { usePlanGate } from '@/hooks/usePlanGate';
import { useGuildStore } from '@/store/guildStore';
import { PLAN_TIERS } from '@/lib/plans';
import { apiClient } from '@/api/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ────────────────────────────────────────────────────────────
//  Status styling
// ────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  active: {
    label: 'نشط',
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
  },
  ended: {
    label: 'انتهى',
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
  },
  cancelled: {
    label: 'ملغي',
    color: 'text-slate-500',
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/30',
  },
};

// ────────────────────────────────────────────────────────────
//  Duration parser/formatter
// ────────────────────────────────────────────────────────────

function parseDurationInput(str) {
  if (!str) return null;
  const s = str.trim().toLowerCase();
  const regex = /(\d+)\s*([dhms])/g;
  let total = 0;
  let m;
  while ((m = regex.exec(s)) !== null) {
    const v = parseInt(m[1]);
    if (m[2] === 'd') total += v * 86400000;
    else if (m[2] === 'h') total += v * 3600000;
    else if (m[2] === 'm') total += v * 60000;
    else if (m[2] === 's') total += v * 1000;
  }
  if (total === 0) {
    const n = parseInt(s);
    if (isFinite(n) && n > 0) total = n * 60000;
  }
  return total > 0 ? total : null;
}

function formatTimeLeft(endAt) {
  const now = Date.now();
  const end = new Date(endAt).getTime();
  const diff = end - now;
  if (diff <= 0) return 'انتهى';

  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);

  if (days > 0) return `${days}ي ${hours}س`;
  if (hours > 0) return `${hours}س ${minutes}د`;
  return `${minutes} دقيقة`;
}

// ────────────────────────────────────────────────────────────
//  Page
// ────────────────────────────────────────────────────────────

export default function GiveawayPage() {
  const { selectedGuildId } = useGuildStore();
  const [giveaways, setGiveaways] = useState(null);
  const [filter, setFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null); // { type, giveaway }
  const planGate = usePlanGate('giveaway', PLAN_TIERS.SILVER);

  // ─── Load ───
  const load = async () => {
    if (!selectedGuildId) return;
    setGiveaways(null);
    try {
      const params = filter !== 'all' ? `?status=${filter}` : '';
      const res = await apiClient.get(`/api/guild/${selectedGuildId}/giveaway${params}`);
      setGiveaways(res.giveaways || []);
    } catch (err) {
      setGiveaways([]);
      toast.error(err.message || 'فشل تحميل السحوبات');
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGuildId, filter]);

  // ─── Refresh live timer ───
  useEffect(() => {
    if (!giveaways || giveaways.length === 0) return;
    const hasActive = giveaways.some((g) => g.status === 'active');
    if (!hasActive) return;
    const interval = setInterval(() => {
      setGiveaways((prev) => (prev ? [...prev] : prev));
    }, 60000);
    return () => clearInterval(interval);
  }, [giveaways]);

  // ─── Actions ───
  const handleCreate = planGate.gateAction(() => setShowCreate(true));

  const handleEnd = async (giveaway) => {
    try {
      await apiClient.post(`/api/guild/${selectedGuildId}/giveaway/${giveaway.id}/end`);
      toast.success('تم إنهاء السحب');
      load();
    } catch (err) {
      toast.error(err.message || 'فشل إنهاء السحب');
    }
    setConfirmAction(null);
  };

  const handleCancel = async (giveaway) => {
    try {
      await apiClient.post(`/api/guild/${selectedGuildId}/giveaway/${giveaway.id}/cancel`);
      toast.success('تم إلغاء السحب');
      load();
    } catch (err) {
      toast.error(err.message || 'فشل إلغاء السحب');
    }
    setConfirmAction(null);
  };

  const handleReroll = async (giveaway) => {
    try {
      await apiClient.post(`/api/guild/${selectedGuildId}/giveaway/${giveaway.id}/reroll`, { count: 1 });
      toast.success('تم إعادة السحب');
      load();
    } catch (err) {
      toast.error(err.message || 'فشل إعادة السحب');
    }
    setConfirmAction(null);
  };

  // ─── Stats ───
  const stats = giveaways
    ? {
        active: giveaways.filter((g) => g.status === 'active').length,
        ended: giveaways.filter((g) => g.status === 'ended').length,
        total: giveaways.length,
      }
    : null;

  return (
    <>
      <SettingsPageHeader
        icon={<Gift />}
        title="السحوبات"
        description="نظام السحوبات والجوائز للسيرفر"
        plan="silver"
        action={
          <Button onClick={handleCreate} disabled={!selectedGuildId}>
            <Plus className="w-4 h-4" />
            <span>سحب جديد</span>
          </Button>
        }
      />

      {planGate.isLocked && (
        <PlanLockBanner
          currentPlan={planGate.currentPlan}
          requiredPlan={planGate.requiredPlan}
          featureName="نظام السحوبات"
          className="mb-6"
        />
      )}

      {/* ── Stats ── */}
      {stats && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card className="p-4">
            <div className="text-xs text-muted-foreground mb-1">نشطة</div>
            <div className="text-2xl font-bold num text-amber-500">{stats.active}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground mb-1">منتهية</div>
            <div className="text-2xl font-bold num text-emerald-500">{stats.ended}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground mb-1">إجمالي</div>
            <div className="text-2xl font-bold num">{stats.total}</div>
          </Card>
        </div>
      )}

      {/* ── Filter ── */}
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            <SelectItem value="active">نشطة</SelectItem>
            <SelectItem value="ended">منتهية</SelectItem>
            <SelectItem value="cancelled">ملغية</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ── List ── */}
      {giveaways === null ? (
        <div className="space-y-3">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : giveaways.length === 0 ? (
        <EmptyState
          icon={Gift}
          title={filter === 'active' ? 'لا توجد سحوبات نشطة' : 'لا توجد سحوبات'}
          description="أنشئ سحبك الأول الآن!"
          action={
            <Button onClick={handleCreate}>
              <Plus className="w-4 h-4" />
              <span>سحب جديد</span>
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {giveaways.map((g) => (
            <GiveawayCard
              key={g.id}
              giveaway={g}
              onEnd={() => setConfirmAction({ type: 'end', giveaway: g })}
              onCancel={() => setConfirmAction({ type: 'cancel', giveaway: g })}
              onReroll={() => setConfirmAction({ type: 'reroll', giveaway: g })}
            />
          ))}
        </div>
      )}

      {/* ── Create modal ── */}
      {showCreate && (
        <CreateGiveawayModal
          guildId={selectedGuildId}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            load();
          }}
        />
      )}

      {/* ── Confirm modal ── */}
      <Dialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmAction?.type === 'end' && 'إنهاء السحب'}
              {confirmAction?.type === 'cancel' && 'إلغاء السحب'}
              {confirmAction?.type === 'reroll' && 'إعادة السحب'}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            {confirmAction?.type === 'end' &&
              `سيتم إنهاء السحب "${confirmAction?.giveaway?.prize}" واختيار الفائزين فوراً.`}
            {confirmAction?.type === 'cancel' &&
              `سيتم إلغاء السحب "${confirmAction?.giveaway?.prize}" بدون فائزين.`}
            {confirmAction?.type === 'reroll' &&
              `سيتم اختيار فائز جديد للسحب "${confirmAction?.giveaway?.prize}".`}
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmAction(null)}>
              إلغاء
            </Button>
            <Button
              variant={confirmAction?.type === 'cancel' ? 'destructive' : 'default'}
              onClick={() => {
                if (confirmAction?.type === 'end') handleEnd(confirmAction.giveaway);
                if (confirmAction?.type === 'cancel') handleCancel(confirmAction.giveaway);
                if (confirmAction?.type === 'reroll') handleReroll(confirmAction.giveaway);
              }}
            >
              تأكيد
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PlanLockModal {...planGate.lockModalProps} featureName="نظام السحوبات" />
    </>
  );
}

// ────────────────────────────────────────────────────────────
//  Giveaway Card
// ────────────────────────────────────────────────────────────

function GiveawayCard({ giveaway, onEnd, onCancel, onReroll }) {
  const config = STATUS_CONFIG[giveaway.status] || STATUS_CONFIG.active;
  const winners = Array.isArray(giveaway.winners) ? giveaway.winners : [];

  return (
    <Card className={cn('p-4 border-2 transition-colors', config.border)}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', config.bg)}>
            <Gift className={cn('w-5 h-5', config.color)} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold truncate">{giveaway.prize}</h3>
              <Badge variant="secondary" className={cn(config.bg, config.color, 'border-0')}>
                {config.label}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              #{giveaway.id} · <span className="num">{giveaway.entry_count || 0}</span> مشارك ·{' '}
              <span className="num">{giveaway.winner_count}</span> فائز
            </div>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-3">
        {giveaway.status === 'active' && (
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>يتبقى: {formatTimeLeft(giveaway.end_at)}</span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <ChevronRight className="w-3 h-3" />
          <span>القناة: <code className="text-[10px]">{giveaway.channel_id}</code></span>
        </div>
      </div>

      {/* Winners */}
      {giveaway.status === 'ended' && winners.length > 0 && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-2.5 mb-3">
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-xs font-bold text-emerald-500">الفائزون</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {winners.map((id) => (
              <code key={id} className="text-[10px] bg-background px-2 py-0.5 rounded">
                {id}
              </code>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {giveaway.status === 'active' && (
          <>
            <Button size="sm" variant="secondary" onClick={onEnd}>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>إنهاء الآن</span>
            </Button>
            <Button size="sm" variant="ghost" onClick={onCancel} className="text-destructive">
              <XIcon className="w-3.5 h-3.5" />
              <span>إلغاء</span>
            </Button>
          </>
        )}
        {giveaway.status === 'ended' && (
          <Button size="sm" variant="secondary" onClick={onReroll}>
            <Shuffle className="w-3.5 h-3.5" />
            <span>إعادة السحب</span>
            {giveaway.reroll_count > 0 && (
              <Badge variant="outline" size="sm" className="mr-1">
                {giveaway.reroll_count}
              </Badge>
            )}
          </Button>
        )}
      </div>
    </Card>
  );
}

// ────────────────────────────────────────────────────────────
//  Create modal
// ────────────────────────────────────────────────────────────

function CreateGiveawayModal({ guildId, onClose, onCreated }) {
  const [prize, setPrize] = useState('');
  const [description, setDescription] = useState('');
  const [channelId, setChannelId] = useState(null);
  const [duration, setDuration] = useState('1d');
  const [winnerCount, setWinnerCount] = useState(1);
  const [requiredRole, setRequiredRole] = useState(null);
  const [requiredLevel, setRequiredLevel] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const durationMs = parseDurationInput(duration);
  const isValid = prize.length >= 1 && channelId && durationMs && durationMs >= 60000;

  const submit = async () => {
    if (!isValid) return;
    setSubmitting(true);
    try {
      await apiClient.post(`/api/guild/${guildId}/giveaway`, {
        channel_id: channelId,
        prize: prize.trim(),
        description: description.trim() || null,
        winner_count: winnerCount,
        duration_ms: durationMs,
        required_role: requiredRole || null,
        required_level: requiredLevel || 0,
      });
      toast.success('تم إنشاء السحب!');
      onCreated();
    } catch (err) {
      toast.error(err.message || 'فشل إنشاء السحب');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            سحب جديد
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Prize */}
          <div>
            <label className="text-xs font-medium mb-1.5 block">الجائزة *</label>
            <Input
              value={prize}
              onChange={(e) => setPrize(e.target.value.slice(0, 200))}
              placeholder="مثال: Nitro Classic لشهر"
              maxLength={200}
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-medium mb-1.5 block">الوصف (اختياري)</label>
            <textarea
  value={description}
  onChange={(e) => setDescription(e.target.value.slice(0, 1000))}
  placeholder="تفاصيل إضافية..."
  rows={2}
  maxLength={1000}
  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm resize-y focus:outline-none focus:border-primary/50"
/>
          </div>

          {/* Channel */}
          <div>
            <label className="text-xs font-medium mb-1.5 block">القناة *</label>
            <ChannelPicker value={channelId} onChange={setChannelId} type="text" />
          </div>

          {/* Duration + Winner count */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1.5 block">المدة *</label>
              <Input
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="1d, 12h, 30m"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                أمثلة: 1d, 12h, 30m, 1h30m
              </p>
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block">عدد الفائزين</label>
              <Input
                type="number"
                min={1}
                max={20}
                value={winnerCount}
                onChange={(e) => setWinnerCount(Math.max(1, Math.min(parseInt(e.target.value) || 1, 20)))}
              />
            </div>
          </div>

          {/* Optional requirements */}
          <div className="bg-muted/30 rounded-lg p-3 space-y-3">
            <div className="text-xs font-medium text-muted-foreground">
              شروط اختيارية
            </div>

            <div>
              <label className="text-xs mb-1.5 block">رتبة مطلوبة</label>
              <RolePicker
                value={requiredRole}
                onChange={setRequiredRole}
                placeholder="بدون شرط"
                excludeManaged
                excludeEveryone
              />
            </div>

            <div>
              <label className="text-xs mb-1.5 block">مستوى XP الأدنى</label>
              <Input
                type="number"
                min={0}
                max={500}
                value={requiredLevel}
                onChange={(e) => setRequiredLevel(Math.max(0, Math.min(parseInt(e.target.value) || 0, 500)))}
                placeholder="0 = بدون شرط"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            إلغاء
          </Button>
          <Button onClick={submit} disabled={!isValid || submitting} loading={submitting}>
            <Sparkles className="w-4 h-4" />
            <span>إنشاء السحب</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
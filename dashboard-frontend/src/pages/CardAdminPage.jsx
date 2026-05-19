/**
 * ═══════════════════════════════════════════════════════════
 *  Card Admin Page — لوحة إدارة اشتراكات البطاقة (منفصلة)
 *  المسار: dashboard-frontend/src/pages/CardAdminPage.jsx
 *
 *  ⚠️ مستقلة تماماً عن OwnerAdminPage
 *  ⚠️ Owner only (يستخدم isOwner check)
 *
 *  4 تبويبات:
 *   1. نظرة عامة     — إحصائيات + خصائص ذكية
 *   2. الطلبات       — قبول/رفض طلبات الاشتراك
 *   3. المشتركون     — كل المشتركين + تمديد/إلغاء/تغيير فئة
 *   4. منح هدية      — منح اشتراك مجاني لـ ID محدد
 *   5. السجل         — كل الأحداث (للمراجعة)
 * ═══════════════════════════════════════════════════════════
 */

import { useState, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Crown,
  Clock,
  CheckCircle2,
  XCircle,
  Users,
  Gift,
  TrendingUp,
  AlertTriangle,
  Search,
  Calendar,
  Hash,
  Loader2,
  Plus,
  RotateCcw,
  Ban,
  ArrowUpRight,
  ArrowDownRight,
  Copy,
  Check,
  History,
  FileText,
  Sparkles,
  Palette,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { SettingsPageHeader } from '@/components/shared/SettingsPageHeader';
import { PageLoading } from '@/components/shared/PageLoading';
import { EmptyState } from '@/components/shared/EmptyState';
import { TierBadge } from '@/components/card/TierBadge';
import { useAuthStore } from '@/store/authStore';
import { isOwner } from '@/config/env';
import {
  useCardAdminStats,
  useCardAdminRequests,
  useApproveCardRequest,
  useRejectCardRequest,
  useCardAdminSubscriptions,
  useExtendSubscription,
  useCancelSubscription,
  useChangeTier,
  useGiftSubscription,
  useCardAdminLogs,
} from '@/hooks/useCardData';
import {
  formatPrice,
  formatDate,
  formatDaysLeft,
  ACTION_LABELS,
  ACTION_COLORS,
  getPaidTiers,
} from '@/lib/cardPlans';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ════════════════════════════════════════════════════════════
//  PAGE
// ════════════════════════════════════════════════════════════

export default function CardAdminPage() {
  const { user } = useAuthStore();

  // ─── Owner Guard ───
  if (!user?.isOwner && !isOwner(user?.id)) {
    return <Navigate to="/dashboard" replace />;
  }

  const [activeTab, setActiveTab] = useState('overview');

  return (
    <>
      <SettingsPageHeader
        icon={<Palette />}
        title="إدارة اشتراكات البطاقة"
        description="لوحة منفصلة لإدارة Lyn Premium Card"
        actions={
          <Badge variant="default" className="lyn-gradient text-white">
            <Crown className="w-3 h-3" />
            Owner Only
          </Badge>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList variant="pills" className="flex-wrap gap-2">
          <TabsTrigger value="overview" variant="pills">
            <TrendingUp className="w-4 h-4" />
            <span>نظرة عامة</span>
          </TabsTrigger>

          <TabsTrigger value="requests" variant="pills">
            <Clock className="w-4 h-4" />
            <span>الطلبات</span>
          </TabsTrigger>

          <TabsTrigger value="subscribers" variant="pills">
            <Users className="w-4 h-4" />
            <span>المشتركون</span>
          </TabsTrigger>

          <TabsTrigger value="gift" variant="pills">
            <Gift className="w-4 h-4" />
            <span>منح هدية</span>
          </TabsTrigger>

          <TabsTrigger value="logs" variant="pills">
            <History className="w-4 h-4" />
            <span>السجل</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab />
        </TabsContent>

        <TabsContent value="requests">
          <RequestsTab />
        </TabsContent>

        <TabsContent value="subscribers">
          <SubscribersTab />
        </TabsContent>

        <TabsContent value="gift">
          <GiftTab />
        </TabsContent>

        <TabsContent value="logs">
          <LogsTab />
        </TabsContent>
      </Tabs>
    </>
  );
}

// ════════════════════════════════════════════════════════════
//  TAB 1 — نظرة عامة
// ════════════════════════════════════════════════════════════

function OverviewTab() {
  const { data: stats, isLoading } = useCardAdminStats();

  if (isLoading) return <PageLoading variant="cards" count={6} />;

  return (
    <div className="space-y-6">
      {/* ═══ الإحصائيات الرئيسية ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Clock />}
          label="طلبات معلّقة"
          value={stats?.requests?.pending || 0}
          color="amber"
          urgent={stats?.requests?.pending > 0}
        />
        <StatCard
          icon={<Users />}
          label="مشتركون نشطون"
          value={stats?.activeSubscriptions?.total || 0}
          color="emerald"
        />
        <StatCard
          icon={<TrendingUp />}
          label="إيرادات الشهر"
          value={formatPrice(stats?.monthlyRevenue || 0)}
          color="violet"
          isText
        />
        <StatCard
          icon={<AlertTriangle />}
          label="ينتهي قريباً"
          value={stats?.expiringSoon || 0}
          color="orange"
          warning={stats?.expiringSoon > 0}
        />
      </div>

      {/* ═══ توزيع المشتركين حسب الفئة ═══ */}
      <Card className="p-5">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-500" />
          توزيع المشتركين حسب الفئة
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <TierStatCard
            tier="basic"
            count={stats?.activeSubscriptions?.byTier?.basic || 0}
            total={stats?.activeSubscriptions?.total || 0}
          />
          <TierStatCard
            tier="advanced"
            count={stats?.activeSubscriptions?.byTier?.advanced || 0}
            total={stats?.activeSubscriptions?.total || 0}
          />
          <TierStatCard
            tier="legendary"
            count={stats?.activeSubscriptions?.byTier?.legendary || 0}
            total={stats?.activeSubscriptions?.total || 0}
          />
        </div>
      </Card>

      {/* ═══ هدايا نشطة ═══ */}
      {stats?.activeGifts > 0 && (
        <Card className="p-5 border-pink-500/30 bg-pink-500/5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-pink-500/20 text-pink-500 flex items-center justify-center">
              <Gift className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold">{stats.activeGifts} اشتراكات هدية نشطة</p>
              <p className="text-sm text-muted-foreground">
                مشتركون يستمتعون باشتراكات منحتها لهم
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color, urgent, warning, isText }) {
  const colors = {
    amber: 'border-amber-500/30 bg-amber-500/5 text-amber-500',
    emerald: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-500',
    violet: 'border-violet-500/30 bg-violet-500/5 text-violet-500',
    orange: 'border-orange-500/30 bg-orange-500/5 text-orange-500',
  };

  return (
    <Card
      className={cn(
        'p-4 border-2',
        colors[color],
        urgent && 'ring-2 ring-amber-500/30 animate-pulse',
        warning && 'ring-2 ring-orange-500/30',
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', colors[color])}>
          <div className="[&>svg]:w-5 [&>svg]:h-5">{icon}</div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground mb-1">{label}</p>
          <p className={cn('font-bold', isText ? 'text-lg' : 'text-2xl')}>{value}</p>
        </div>
      </div>
    </Card>
  );
}

function TierStatCard({ tier, count, total }) {
  const tierIcons = { basic: '🥉', advanced: '🥈', legendary: '👑' };
  const tierNames = { basic: 'أساسية', advanced: 'متقدمة', legendary: 'أسطورية' };
  const percent = total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <div className="rounded-xl bg-muted/40 border border-border p-4">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-2xl">{tierIcons[tier]}</span>
        <div className="flex-1">
          <p className="text-sm font-bold">{tierNames[tier]}</p>
          <p className="text-xs text-muted-foreground">{percent}% من الإجمالي</p>
        </div>
      </div>
      <div className="text-2xl font-bold">{count}</div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  TAB 2 — الطلبات
// ════════════════════════════════════════════════════════════

function RequestsTab() {
  const [statusFilter, setStatusFilter] = useState('pending');
  const { data: requests, isLoading } = useCardAdminRequests({ status: statusFilter });
  const { mutate: approve, isPending: approving } = useApproveCardRequest();
  const { mutate: reject, isPending: rejecting } = useRejectCardRequest();

  const [approveDialog, setApproveDialog] = useState(null);
  const [rejectDialog, setRejectDialog] = useState(null);
  const [adminNote, setAdminNote] = useState('');

  const handleApprove = () => {
    if (!approveDialog) return;
    approve(
      { id: approveDialog.id, adminNote },
      {
        onSuccess: () => {
          setApproveDialog(null);
          setAdminNote('');
        },
      },
    );
  };

  const handleReject = () => {
    if (!rejectDialog) return;
    if (!adminNote.trim()) {
      toast.error('يجب كتابة سبب الرفض');
      return;
    }
    reject(
      { id: rejectDialog.id, adminNote },
      {
        onSuccess: () => {
          setRejectDialog(null);
          setAdminNote('');
        },
      },
    );
  };

  return (
    <div className="space-y-4">
      {/* ─── فلتر ─── */}
      <div className="flex items-center gap-2 flex-wrap">
        {['pending', 'approved', 'rejected'].map((s) => (
          <Button
            key={s}
            onClick={() => setStatusFilter(s)}
            variant={statusFilter === s ? 'default' : 'outline'}
            size="sm"
          >
            {s === 'pending' && <Clock className="w-3.5 h-3.5" />}
            {s === 'approved' && <CheckCircle2 className="w-3.5 h-3.5" />}
            {s === 'rejected' && <XCircle className="w-3.5 h-3.5" />}
            {s === 'pending' ? 'المعلقة' : s === 'approved' ? 'المقبولة' : 'المرفوضة'}
          </Button>
        ))}
      </div>

      {/* ─── القائمة ─── */}
      {isLoading ? (
        <PageLoading variant="list" count={3} />
      ) : !Array.isArray(requests) || requests.length === 0 ? (
        <EmptyState
          icon={<FileText className="w-12 h-12" />}
          title="لا توجد طلبات"
          description={
            statusFilter === 'pending'
              ? 'لا توجد طلبات تنتظر المراجعة'
              : 'لا توجد طلبات بهذه الحالة'
          }
        />
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <RequestRow
              key={req.id}
              request={req}
              onApprove={() => setApproveDialog(req)}
              onReject={() => setRejectDialog(req)}
            />
          ))}
        </div>
      )}

      {/* ─── Dialog: قبول ─── */}
      <Dialog open={!!approveDialog} onOpenChange={(o) => !o && setApproveDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              قبول الطلب
            </DialogTitle>
            <DialogDescription>
              سيتم تفعيل اشتراك {approveDialog?.tier} لمدة{' '}
              {approveDialog?.duration === 'yearly' ? 'سنة' : 'شهر'} للمستخدم{' '}
              <span className="font-mono">{approveDialog?.user_id}</span>
              <br />
              سيتم إرسال DM للمستخدم تلقائياً.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <label className="text-sm font-medium">ملاحظات (اختيارية)</label>
            <Input
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              placeholder="مثال: تأكدنا من العملية"
            />
          </div>

          <DialogFooter>
            <Button onClick={() => setApproveDialog(null)} variant="outline" disabled={approving}>
              إلغاء
            </Button>
            <Button onClick={handleApprove} disabled={approving} className="bg-emerald-600 hover:bg-emerald-700">
              {approving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              تأكيد القبول
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Dialog: رفض ─── */}
      <Dialog open={!!rejectDialog} onOpenChange={(o) => !o && setRejectDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-rose-500" />
              رفض الطلب
            </DialogTitle>
            <DialogDescription>
              يجب كتابة سبب الرفض. سيتم إرسال السبب للمستخدم في DM.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <label className="text-sm font-medium">سبب الرفض *</label>
            <Input
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              placeholder="مثال: رقم العملية غير صحيح"
              autoFocus
            />
          </div>

          <DialogFooter>
            <Button onClick={() => setRejectDialog(null)} variant="outline" disabled={rejecting}>
              إلغاء
            </Button>
            <Button onClick={handleReject} variant="destructive" disabled={rejecting || !adminNote.trim()}>
              {rejecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
              تأكيد الرفض
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RequestRow({ request, onApprove, onReject }) {
  const [copied, setCopied] = useState(false);

  const copyId = () => {
    navigator.clipboard.writeText(request.user_id);
    setCopied(true);
    toast.success('تم نسخ الـ ID');
    setTimeout(() => setCopied(false), 2000);
  };

  const isPending = request.status === 'pending';

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <TierBadge tier={request.tier} size="sm" />
            <Badge variant="outline" size="sm">
              {request.duration === 'yearly' ? 'سنوي' : 'شهري'}
            </Badge>
            <span className="font-bold lyn-text-gradient">
              {formatPrice(parseFloat(request.amount))}
            </span>
          </div>

          <div className="flex items-center gap-2 mb-1 text-sm">
            <span className="text-muted-foreground">User:</span>
            <span className="font-mono">{request.user_id}</span>
            <button
              onClick={copyId}
              className="p-1 rounded hover:bg-accent transition-colors"
            >
              {copied ? (
                <Check className="w-3 h-3 text-emerald-500" />
              ) : (
                <Copy className="w-3 h-3 text-muted-foreground" />
              )}
            </button>
          </div>

          {request.username && (
            <p className="text-sm mb-1">@{request.username}</p>
          )}

          <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap mt-1">
            <span className="flex items-center gap-1">
              <Hash className="w-3 h-3" />
              {request.ref_number}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatDate(request.created_at)}
            </span>
          </div>

          {request.user_notes && (
            <p className="text-xs mt-2 pt-2 border-t border-border/50">
              <span className="text-muted-foreground">ملاحظة المستخدم: </span>
              {request.user_notes}
            </p>
          )}

          {request.admin_note && (
            <p className="text-xs mt-2 pt-2 border-t border-border/50">
              <span className="text-muted-foreground">ملاحظات الأدمن: </span>
              {request.admin_note}
            </p>
          )}
        </div>

        {isPending && (
          <div className="flex gap-2 flex-shrink-0">
            <Button onClick={onApprove} size="sm" className="bg-emerald-600 hover:bg-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
              قبول
            </Button>
            <Button onClick={onReject} variant="destructive" size="sm">
              <XCircle className="w-4 h-4" />
              رفض
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

// ════════════════════════════════════════════════════════════
//  TAB 3 — المشتركون
// ════════════════════════════════════════════════════════════

function SubscribersTab() {
  const [filter, setFilter] = useState('active');
  const [search, setSearch] = useState('');
  const { data: subs, isLoading } = useCardAdminSubscriptions({ filter });

  const [extendDialog, setExtendDialog] = useState(null);
  const [cancelDialog, setCancelDialog] = useState(null);
  const [tierDialog, setTierDialog] = useState(null);

  const filtered = useMemo(() => {
    if (!Array.isArray(subs)) return [];
    if (!search.trim()) return subs;
    const q = search.toLowerCase();
    return subs.filter((s) => s.user_id?.includes(q));
  }, [subs, search]);

  return (
    <div className="space-y-4">
      {/* ─── فلتر + بحث ─── */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { id: 'active', label: 'النشطون', icon: CheckCircle2 },
            { id: 'expiring_soon', label: 'ينتهي قريباً', icon: AlertTriangle },
            { id: 'gifts', label: 'هدايا', icon: Gift },
            { id: 'expired', label: 'منتهية', icon: XCircle },
            { id: 'all', label: 'الكل', icon: Users },
          ].map((f) => {
            const Icon = f.icon;
            return (
              <Button
                key={f.id}
                onClick={() => setFilter(f.id)}
                variant={filter === f.id ? 'default' : 'outline'}
                size="sm"
              >
                <Icon className="w-3.5 h-3.5" />
                {f.label}
              </Button>
            );
          })}
        </div>

        <div className="relative flex-1 min-w-[200px] ms-auto">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بـ User ID..."
            className="ps-9"
          />
        </div>
      </div>

      {/* ─── القائمة ─── */}
      {isLoading ? (
        <PageLoading variant="list" count={3} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Users className="w-12 h-12" />}
          title="لا توجد نتائج"
          description="لا يوجد مشتركون يطابقون الفلتر"
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((sub) => (
            <SubscriberRow
              key={sub.id}
              sub={sub}
              onExtend={() => setExtendDialog(sub)}
              onCancel={() => setCancelDialog(sub)}
              onChangeTier={() => setTierDialog(sub)}
            />
          ))}
        </div>
      )}

      {/* ─── Dialogs ─── */}
      <ExtendDialog dialog={extendDialog} onClose={() => setExtendDialog(null)} />
      <CancelDialog dialog={cancelDialog} onClose={() => setCancelDialog(null)} />
      <ChangeTierDialog dialog={tierDialog} onClose={() => setTierDialog(null)} />
    </div>
  );
}

function SubscriberRow({ sub, onExtend, onCancel, onChangeTier }) {
  const [copied, setCopied] = useState(false);

  const copyId = () => {
    navigator.clipboard.writeText(sub.user_id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isExpiringSoon = sub.days_left > 0 && sub.days_left <= 7;

  return (
    <Card
      className={cn(
        'p-4',
        isExpiringSoon && 'border-amber-500/30 bg-amber-500/5',
        sub.is_expired && 'opacity-60',
      )}
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <TierBadge tier={sub.tier} size="sm" />
            {sub.is_gift && (
              <Badge
                variant="default"
                size="sm"
                className="bg-pink-500/15 text-pink-500 border-pink-500/30"
              >
                <Gift className="w-3 h-3" />
                هدية
              </Badge>
            )}
            <Badge variant="outline" size="sm" className={isExpiringSoon ? 'text-amber-500' : ''}>
              {formatDaysLeft(sub.days_left)}
            </Badge>
          </div>

          <div className="flex items-center gap-2 mb-1 text-sm">
            <span className="text-muted-foreground">User:</span>
            <span className="font-mono">{sub.user_id}</span>
            <button onClick={copyId} className="p-1 rounded hover:bg-accent">
              {copied ? (
                <Check className="w-3 h-3 text-emerald-500" />
              ) : (
                <Copy className="w-3 h-3 text-muted-foreground" />
              )}
            </button>
          </div>

          <div className="text-xs text-muted-foreground flex items-center gap-3 flex-wrap mt-1">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              بدأ {formatDate(sub.started_at)}
            </span>
            <span>•</span>
            <span>ينتهي {formatDate(sub.expires_at)}</span>
          </div>

          {sub.gift_reason && (
            <p className="text-xs mt-2 pt-2 border-t border-border/50">
              <span className="text-muted-foreground">سبب الهدية: </span>
              {sub.gift_reason}
            </p>
          )}
        </div>

        <div className="flex gap-2 flex-wrap flex-shrink-0">
          <Button onClick={onExtend} size="sm" variant="outline">
            <Plus className="w-4 h-4" />
            تمديد
          </Button>
          <Button onClick={onChangeTier} size="sm" variant="outline">
            <ArrowUpRight className="w-4 h-4" />
            تغيير
          </Button>
          {sub.status === 'active' && (
            <Button onClick={onCancel} size="sm" variant="destructive">
              <Ban className="w-4 h-4" />
              إلغاء
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

// ─── Extend Dialog ───
function ExtendDialog({ dialog, onClose }) {
  const [days, setDays] = useState(7);
  const [reason, setReason] = useState('');
  const { mutate, isPending } = useExtendSubscription();

  if (!dialog) return null;

  const handleSubmit = () => {
    mutate(
      { userId: dialog.user_id, days, reason },
      {
        onSuccess: () => {
          onClose();
          setDays(7);
          setReason('');
        },
      },
    );
  };

  return (
    <Dialog open={!!dialog} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-emerald-500" />
            تمديد الاشتراك
          </DialogTitle>
          <DialogDescription>
            تمديد اشتراك <span className="font-mono">{dialog.user_id}</span> ({dialog.tier})
            <br />
            سيتم إرسال DM للمستخدم تلقائياً بإشعار التمديد.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">عدد الأيام</label>
            <div className="flex gap-2 flex-wrap">
              {[1, 3, 7, 14, 30, 90].map((d) => (
                <Button
                  key={d}
                  onClick={() => setDays(d)}
                  variant={days === d ? 'default' : 'outline'}
                  size="sm"
                >
                  {d === 1 ? 'يوم' : d === 30 ? 'شهر' : d === 90 ? '3 أشهر' : `${d} أيام`}
                </Button>
              ))}
            </div>
            <Input
              type="number"
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value) || 1)}
              min={1}
              max={730}
              className="num"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">السبب (يظهر للمستخدم)</label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="مثال: تعويض عن انقطاع البوت"
            />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose} variant="outline" disabled={isPending}>
            إلغاء
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            تمديد {days} يوم
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Cancel Dialog ───
function CancelDialog({ dialog, onClose }) {
  const [reason, setReason] = useState('');
  const { mutate, isPending } = useCancelSubscription();

  if (!dialog) return null;

  const handleSubmit = () => {
    mutate(
      { userId: dialog.user_id, reason },
      {
        onSuccess: () => {
          onClose();
          setReason('');
        },
      },
    );
  };

  return (
    <Dialog open={!!dialog} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-rose-500">
            <Ban className="w-5 h-5" />
            إلغاء الاشتراك
          </DialogTitle>
          <DialogDescription>
            هل أنت متأكد من إلغاء اشتراك <span className="font-mono">{dialog.user_id}</span>؟
            <br />
            بطاقته راح ترجع للشكل الافتراضي.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <label className="text-sm font-medium">السبب (يظهر للمستخدم)</label>
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="مثال: مخالفة شروط الاستخدام"
          />
        </div>

        <DialogFooter>
          <Button onClick={onClose} variant="outline" disabled={isPending}>
            إلغاء
          </Button>
          <Button onClick={handleSubmit} variant="destructive" disabled={isPending}>
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
            تأكيد الإلغاء
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Change Tier Dialog ───
function ChangeTierDialog({ dialog, onClose }) {
  const [newTier, setNewTier] = useState('');
  const [reason, setReason] = useState('');
  const { mutate, isPending } = useChangeTier();

  if (!dialog) return null;

  const tiers = getPaidTiers();

  const handleSubmit = () => {
    if (!newTier) {
      toast.error('اختر فئة');
      return;
    }
    mutate(
      { userId: dialog.user_id, tier: newTier, reason },
      {
        onSuccess: () => {
          onClose();
          setNewTier('');
          setReason('');
        },
      },
    );
  };

  return (
    <Dialog open={!!dialog} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowUpRight className="w-5 h-5 text-violet-500" />
            تغيير الفئة
          </DialogTitle>
          <DialogDescription>
            الفئة الحالية: <TierBadge tier={dialog.tier} size="sm" />
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">الفئة الجديدة</label>
            <Select value={newTier} onValueChange={setNewTier}>
              <SelectTrigger>
                <SelectValue placeholder="اختر الفئة الجديدة" />
              </SelectTrigger>
              <SelectContent>
                {tiers.map((t) => (
                  <SelectItem key={t.id} value={t.id} disabled={t.id === dialog.tier}>
                    {t.icon} {t.name} {t.id === dialog.tier && '(الحالية)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">السبب</label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="مثال: ترقية مجانية لمستخدم نشط"
            />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose} variant="outline" disabled={isPending}>
            إلغاء
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || !newTier}>
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUpRight className="w-4 h-4" />}
            تأكيد التغيير
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ════════════════════════════════════════════════════════════
//  TAB 4 — منح هدية
// ════════════════════════════════════════════════════════════

function GiftTab() {
  const [userId, setUserId] = useState('');
  const [tier, setTier] = useState('');
  const [days, setDays] = useState(7);
  const [reason, setReason] = useState('');
  const { mutate, isPending } = useGiftSubscription();

  const tiers = getPaidTiers();

  const validate = () => {
    if (!userId.trim() || !/^\d{15,22}$/.test(userId.trim())) {
      toast.error('User ID غير صالح');
      return false;
    }
    if (!tier) {
      toast.error('اختر فئة');
      return false;
    }
    if (!days || days < 1 || days > 730) {
      toast.error('عدد الأيام بين 1 و 730');
      return false;
    }
    return true;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    mutate(
      { userId: userId.trim(), tier, days, reason },
      {
        onSuccess: () => {
          setUserId('');
          setTier('');
          setDays(7);
          setReason('');
        },
      },
    );
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="p-6 border-pink-500/30 bg-gradient-to-br from-pink-500/5 to-violet-500/5">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center">
            <Gift className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-lg">منح اشتراك هدية</h3>
            <p className="text-sm text-muted-foreground">
              امنح اشتراك مجاني لأي مستخدم — مثالي للفعاليات والمسابقات
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* ─── User ID ─── */}
          <div className="space-y-2">
            <label className="text-sm font-medium block">User ID *</label>
            <Input
              value={userId}
              onChange={(e) => setUserId(e.target.value.replace(/\D/g, ''))}
              placeholder="529320108032786433"
              className="font-mono"
              maxLength={22}
              dir="ltr"
            />
            <p className="text-xs text-muted-foreground">
              اطلب من المستخدم Right-Click على اسمه في Discord واختر "Copy User ID"
            </p>
          </div>

          {/* ─── الفئة ─── */}
          <div className="space-y-2">
            <label className="text-sm font-medium block">الفئة *</label>
            <div className="grid grid-cols-3 gap-2">
              {tiers.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTier(t.id)}
                  className={cn(
                    'p-3 rounded-xl border-2 transition-all text-center',
                    tier === t.id
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/30'
                      : 'border-border hover:border-primary/50',
                  )}
                >
                  <div className="text-2xl mb-1">{t.icon}</div>
                  <div className="text-sm font-bold">{t.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* ─── الأيام ─── */}
          <div className="space-y-2">
            <label className="text-sm font-medium block">عدد الأيام *</label>
            <div className="flex gap-2 flex-wrap mb-2">
              {[1, 3, 7, 14, 30, 60, 90].map((d) => (
                <Button
                  key={d}
                  onClick={() => setDays(d)}
                  variant={days === d ? 'default' : 'outline'}
                  size="sm"
                >
                  {d === 1 ? 'يوم' : d === 30 ? 'شهر' : d === 90 ? '3 أشهر' : `${d} يوم`}
                </Button>
              ))}
            </div>
            <Input
              type="number"
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value) || 1)}
              min={1}
              max={730}
              className="num"
            />
          </div>

          {/* ─── السبب ─── */}
          <div className="space-y-2">
            <label className="text-sm font-medium block">
              السبب (يظهر في DM للمستخدم) *
            </label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="مثال: فوز في مسابقة Discord الشهرية 🎉"
            />
            <p className="text-xs text-muted-foreground">
              💡 رسالة جميلة تخلي المستخدم سعيد ويفتخر بالهدية
            </p>
          </div>

          {/* ─── زر الإرسال ─── */}
          <Button
            onClick={handleSubmit}
            disabled={isPending}
            size="lg"
            className="w-full lyn-gradient text-white"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                جاري المنح...
              </>
            ) : (
              <>
                <Gift className="w-4 h-4" />
                منح الهدية
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  TAB 5 — السجل
// ════════════════════════════════════════════════════════════

function LogsTab() {
  const [actionFilter, setActionFilter] = useState('');
  const [userIdFilter, setUserIdFilter] = useState('');
  const { data: logs, isLoading } = useCardAdminLogs({
    action: actionFilter || undefined,
    user_id: userIdFilter || undefined,
    limit: 100,
  });

  return (
    <div className="space-y-4">
      {/* ─── الفلاتر ─── */}
      <Card className="p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={actionFilter || 'all'} onValueChange={(v) => setActionFilter(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="نوع الحدث" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الأحداث</SelectItem>
              <SelectItem value="created">✅ تفعيل</SelectItem>
              <SelectItem value="renewed">🔄 تجديد</SelectItem>
              <SelectItem value="extended">➕ تمديد</SelectItem>
              <SelectItem value="gifted">🎁 هدية</SelectItem>
              <SelectItem value="upgraded">📈 ترقية</SelectItem>
              <SelectItem value="downgraded">📉 تخفيض</SelectItem>
              <SelectItem value="cancelled">⛔ إلغاء</SelectItem>
              <SelectItem value="expired">⏰ انتهاء</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={userIdFilter}
              onChange={(e) => setUserIdFilter(e.target.value)}
              placeholder="فلتر بـ User ID..."
              className="ps-9"
              dir="ltr"
            />
          </div>
        </div>
      </Card>

      {/* ─── القائمة ─── */}
      {isLoading ? (
        <PageLoading variant="list" count={5} />
      ) : !Array.isArray(logs) || logs.length === 0 ? (
        <EmptyState
          icon={<History className="w-12 h-12" />}
          title="لا توجد أحداث"
          description="لا توجد أحداث تطابق الفلاتر"
        />
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <LogRow key={log.id} log={log} />
          ))}
        </div>
      )}
    </div>
  );
}

function LogRow({ log }) {
  return (
    <Card className="p-3">
      <div className="flex items-start gap-3 flex-wrap">
        <Badge
          variant="default"
          size="sm"
          className={cn('border-0 flex-shrink-0', ACTION_COLORS[log.action])}
        >
          {ACTION_LABELS[log.action]}
        </Badge>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap text-sm">
            <span className="font-mono text-xs">{log.user_id}</span>
            {log.new_tier && (
              <>
                <span className="text-muted-foreground">→</span>
                <TierBadge tier={log.new_tier} size="sm" />
              </>
            )}
            {log.days_added && (
              <span className="text-emerald-500 font-bold">+{log.days_added} يوم</span>
            )}
          </div>

          {log.reason && (
            <p className="text-xs text-muted-foreground mt-1">{log.reason}</p>
          )}

          <p className="text-xs text-muted-foreground mt-1">
            {formatDate(log.created_at)}
          </p>
        </div>
      </div>
    </Card>
  );
}
import { useState, useEffect, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import {
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  Users,
  Search,
  Copy,
  Check,
  Hash,
  Calendar,
  Loader2,
  Crown,
  Ban,
  Sparkles,
  TrendingUp,
  RefreshCw,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
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
import { PlanBadge } from '@/components/shared/PlanBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { useAuthStore } from '@/store/authStore';
import { adminApi, subscriptionApi } from '@/api';
import { isOwner } from '@/config/env';
import { getPlanInfo, PLANS } from '@/lib/plans';
import { formatRelativeTime, formatNumber, cn } from '@/lib/utils';
import { toast } from 'sonner';

// ════════════════════════════════════════════════════════════
//  Constants
// ════════════════════════════════════════════════════════════

const MONTH_OPTIONS = [
  { value: 1,  label: 'شهر واحد',   discount: 0 },
  { value: 3,  label: '3 أشهر',     discount: 0 },
  { value: 6,  label: '6 أشهر',     discount: 0 },
  { value: 12, label: '12 شهر',     discount: 0 },
];

const STATUS_META = {
  pending:  { label: 'قيد المراجعة', icon: Clock,        color: 'text-amber-500',   bg: 'bg-amber-500/10 border-amber-500/30' },
  approved: { label: 'تم القبول',    icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/30' },
  rejected: { label: 'مرفوض',         icon: XCircle,      color: 'text-rose-500',    bg: 'bg-rose-500/10 border-rose-500/30' },
};

// ════════════════════════════════════════════════════════════
//  Page (with owner guard)
// ════════════════════════════════════════════════════════════

export default function OwnerAdminPage() {
  const { user } = useAuthStore();

  // Owner guard — redirect if not owner
  if (!user?.isOwner && !isOwner(user?.id)) {
    return <Navigate to="/dashboard" replace />;
  }

  const [activeTab, setActiveTab] = useState('pending');

  return (
    <>
      <SettingsPageHeader
        icon={<Crown />}
        title="لوحة المالك"
        description="إدارة طلبات الدفع والاشتراكات"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList variant="pills" className="flex-wrap gap-2">
          <TabsTrigger value="pending" variant="pills">
            <Clock className="w-4 h-4" />
            <span>المعلقة</span>
          </TabsTrigger>
          <TabsTrigger value="approved" variant="pills">
            <CheckCircle2 className="w-4 h-4" />
            <span>المقبولة</span>
          </TabsTrigger>
          <TabsTrigger value="rejected" variant="pills">
            <XCircle className="w-4 h-4" />
            <span>المرفوضة</span>
          </TabsTrigger>
          <TabsTrigger value="subscriptions" variant="pills">
            <Users className="w-4 h-4" />
            <span>الاشتراكات</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <PaymentRequestsTab status="pending" />
        </TabsContent>
        <TabsContent value="approved">
          <PaymentRequestsTab status="approved" />
        </TabsContent>
        <TabsContent value="rejected">
          <PaymentRequestsTab status="rejected" />
        </TabsContent>
        <TabsContent value="subscriptions">
          <SubscriptionsTab />
        </TabsContent>
      </Tabs>
    </>
  );
}

// ════════════════════════════════════════════════════════════
//  Tab: Payment Requests
// ════════════════════════════════════════════════════════════

function PaymentRequestsTab({ status }) {
  const [requests, setRequests] = useState(null);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Dialogs state
  const [approveDialog, setApproveDialog] = useState(null);   // payment row
  const [rejectDialog, setRejectDialog]   = useState(null);   // payment row
  const [months, setMonths]               = useState(1);
  const [rejectNotes, setRejectNotes]     = useState('');
  const [working, setWorking]             = useState(false);

  const load = async (silent = false) => {
    if (!silent) setRequests(null);
    try {
      const r = await adminApi.getPaymentRequests(status);
      const list = Array.isArray(r) ? r : (r?.data ?? []);
      setRequests(list);
    } catch (err) {
      console.error('[OwnerAdmin] Load requests failed:', err);
      toast.error('فشل تحميل الطلبات');
      setRequests([]);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
    toast.success('تم التحديث');
  };

  // ─── Stats (only for current tab) ───
  const stats = useMemo(() => {
    if (!Array.isArray(requests)) return { count: 0, revenue: 0 };

    const count = requests.length;

    // Revenue calc only for approved
    let revenue = 0;
    if (status === 'approved') {
      for (const r of requests) {
        const plan = PLANS?.[r.plan_id];
        if (plan?.price) revenue += plan.price;
      }
    }
    return { count, revenue };
  }, [requests, status]);

  const filtered = useMemo(() => {
    if (!Array.isArray(requests)) return [];
    if (!search.trim()) return requests;
    const q = search.trim().toLowerCase();
    return requests.filter(
      (r) =>
        String(r.user_id).includes(q) ||
        String(r.ref_number || '').toLowerCase().includes(q) ||
        String(r.plan_id || '').toLowerCase().includes(q),
    );
  }, [requests, search]);

  // ─── Handlers ───
  const openApprove = (row) => {
    setApproveDialog(row);
    setMonths(1);
  };

  const openReject = (row) => {
    setRejectDialog(row);
    setRejectNotes('');
  };

  const handleApprove = async () => {
    if (!approveDialog) return;
    setWorking(true);
    try {
      await adminApi.approvePayment(approveDialog.id, months);
      toast.success(`تم قبول الطلب — ${months} ${months === 1 ? 'شهر' : 'أشهر'}`);
      setApproveDialog(null);
      load();
    } catch (err) {
      console.error('[OwnerAdmin] Approve failed:', err);
      toast.error(err?.message || 'فشل قبول الطلب');
    } finally {
      setWorking(false);
    }
  };

  const handleReject = async () => {
    if (!rejectDialog) return;
    setWorking(true);
    try {
      await adminApi.rejectPayment(rejectDialog.id, rejectNotes.trim() || null);
      toast.success('تم رفض الطلب');
      setRejectDialog(null);
      load();
    } catch (err) {
      console.error('[OwnerAdmin] Reject failed:', err);
      toast.error(err?.message || 'فشل رفض الطلب');
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* ─── Stats Row ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground mb-1">عدد الطلبات</div>
              <div className="text-2xl font-bold num">{formatNumber(stats.count)}</div>
            </div>
            <div className="w-12 h-12 rounded-xl lyn-gradient flex items-center justify-center lyn-glow">
              <Hash className="w-6 h-6 text-white" />
            </div>
          </div>
        </Card>

        {status === 'approved' && (
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground mb-1">إجمالي الإيرادات</div>
                <div className="text-2xl font-bold num">
                  {formatNumber(stats.revenue)} <span className="text-sm">SAR</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-emerald-500" />
              </div>
            </div>
          </Card>
        )}

        {status !== 'approved' && (
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground mb-1">الحالة</div>
                <div className="text-lg font-semibold">{STATUS_META[status]?.label}</div>
              </div>
              <div
                className={cn(
                  'w-12 h-12 rounded-xl flex items-center justify-center border',
                  STATUS_META[status]?.bg,
                )}
              >
                {(() => {
                  const Icon = STATUS_META[status]?.icon;
                  return Icon ? <Icon className={cn('w-6 h-6', STATUS_META[status]?.color)} /> : null;
                })()}
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* ─── Toolbar ─── */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث برقم الحوالة، أو ID المستخدم، أو الخطة..."
            className="pr-10"
          />
        </div>
        <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
          <span>تحديث</span>
        </Button>
      </div>

      {/* ─── List ─── */}
      {requests === null ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={STATUS_META[status]?.icon || Clock}
          title={search ? 'لا توجد نتائج' : `لا توجد طلبات ${STATUS_META[status]?.label}`}
          description={search ? 'جرب كلمات بحث مختلفة' : 'الطلبات الجديدة ستظهر هنا'}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((req) => (
            <PaymentRequestCard
              key={req.id}
              req={req}
              onApprove={status === 'pending' ? () => openApprove(req) : null}
              onReject={status === 'pending' ? () => openReject(req) : null}
            />
          ))}
        </div>
      )}

      {/* ─── Approve Dialog ─── */}
      <Dialog open={!!approveDialog} onOpenChange={(o) => !o && setApproveDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>قبول طلب الدفع</DialogTitle>
            <DialogDescription>
              اختر مدة الاشتراك. سيتم تفعيله للمستخدم فوراً.
            </DialogDescription>
          </DialogHeader>

          {approveDialog && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="p-4 rounded-xl bg-muted/50 border border-border space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">المستخدم:</span>
                  <code className="text-xs font-mono num">{approveDialog.user_id}</code>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">الخطة:</span>
                  <PlanBadge plan={approveDialog.plan_id} size="sm" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">رقم الحوالة:</span>
                  <code className="text-xs font-mono num">{approveDialog.ref_number}</code>
                </div>
              </div>

              {/* Months selector */}
              <div>
                <div className="text-sm font-medium mb-2">مدة الاشتراك:</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {MONTH_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setMonths(opt.value)}
                      className={cn(
                        'px-3 py-3 rounded-xl border-2 transition-all text-sm font-medium',
                        months === opt.value
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border hover:border-primary/50',
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Total preview */}
              {(() => {
                const plan = PLANS?.[approveDialog.plan_id];
                if (!plan?.price) return null;
                const total = plan.price * months;
                return (
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-emerald-700 dark:text-emerald-400">القيمة المتوقعة:</span>
                      <span className="font-bold text-emerald-700 dark:text-emerald-400 num">
                        {formatNumber(total)} SAR
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialog(null)} disabled={working}>
              إلغاء
            </Button>
            <Button
              onClick={handleApprove}
              disabled={working}
              className="lyn-gradient text-white"
            >
              {working ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>تأكيد القبول</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Reject Dialog ─── */}
      <Dialog open={!!rejectDialog} onOpenChange={(o) => !o && setRejectDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>رفض طلب الدفع</DialogTitle>
            <DialogDescription>
              اكتب سبب الرفض (اختياري) — سيتم إعلام المستخدم.
            </DialogDescription>
          </DialogHeader>

          {rejectDialog && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-muted/50 border border-border space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">المستخدم:</span>
                  <code className="text-xs font-mono num">{rejectDialog.user_id}</code>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">رقم الحوالة:</span>
                  <code className="text-xs font-mono num">{rejectDialog.ref_number}</code>
                </div>
              </div>

              <div>
                <div className="text-sm font-medium mb-2">سبب الرفض:</div>
                <textarea
                  value={rejectNotes}
                  onChange={(e) => setRejectNotes(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="مثلاً: رقم الحوالة غير صحيح، أو المبلغ ناقص..."
                  className={cn(
                    'w-full px-3 py-2 rounded-xl border border-input bg-background',
                    'text-sm placeholder:text-muted-foreground',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    'resize-none',
                  )}
                />
                <div className="text-xs text-muted-foreground mt-1 num">
                  {rejectNotes.length} / 500
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(null)} disabled={working}>
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={working}
            >
              {working ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري...</span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4" />
                  <span>تأكيد الرفض</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  Component: Payment Request Card
// ════════════════════════════════════════════════════════════

function PaymentRequestCard({ req, onApprove, onReject }) {
  const [copiedField, setCopiedField] = useState(null);
  const meta = STATUS_META[req.status] || STATUS_META.pending;
  const StatusIcon = meta.icon;

  const copy = async (text, field) => {
    try {
      await navigator.clipboard.writeText(String(text));
      setCopiedField(field);
      toast.success('تم النسخ');
      setTimeout(() => setCopiedField(null), 1500);
    } catch {
      toast.error('فشل النسخ');
    }
  };

  return (
    <Card className="p-5">
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        {/* Plan icon */}
        <div className="flex-shrink-0">
          <PlanBadge plan={req.plan_id} size="default" />
        </div>

        {/* Main info */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Row 1: User + ref */}
          <div className="flex items-center gap-3 flex-wrap text-sm">
            <button
              onClick={() => copy(req.user_id, `user-${req.id}`)}
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors group"
              title="نسخ ID المستخدم"
            >
              <span className="text-xs">User ID:</span>
              <code className="font-mono text-xs num bg-muted px-2 py-0.5 rounded">
                {req.user_id}
              </code>
              {copiedField === `user-${req.id}` ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Copy className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </button>
          </div>

          {/* Row 2: Ref number */}
          <div className="flex items-center gap-2">
            <Hash className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <button
              onClick={() => copy(req.ref_number, `ref-${req.id}`)}
              className="font-mono font-bold text-base num hover:text-primary transition-colors flex items-center gap-1.5 group"
              title="نسخ رقم الحوالة"
            >
              <span>{req.ref_number}</span>
              {copiedField === `ref-${req.id}` ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Copy className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </button>
          </div>

          {/* Row 3: Dates */}
          <div className="flex items-center gap-4 flex-wrap text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>أنشئ {formatRelativeTime(req.created_at)}</span>
            </div>
            {req.reviewed_at && (
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>روجع {formatRelativeTime(req.reviewed_at)}</span>
              </div>
            )}
          </div>

          {/* Notes (if rejected) */}
          {req.status === 'rejected' && req.notes && (
            <div className="mt-2 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-sm text-rose-700 dark:text-rose-400">
              <span className="font-semibold">سبب الرفض: </span>
              {req.notes}
            </div>
          )}
        </div>

        {/* Right: Status + Actions */}
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <Badge variant="outline" className={cn('gap-1', meta.bg, meta.color, 'border')}>
            <StatusIcon className="w-3.5 h-3.5" />
            <span>{meta.label}</span>
          </Badge>

          {(onApprove || onReject) && (
            <div className="flex gap-2">
              {onReject && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onReject}
                  className="border-rose-500/30 text-rose-500 hover:bg-rose-500/10"
                >
                  <XCircle className="w-4 h-4" />
                  <span>رفض</span>
                </Button>
              )}
              {onApprove && (
                <Button
                  size="sm"
                  onClick={onApprove}
                  className="lyn-gradient text-white"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>قبول</span>
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

// ════════════════════════════════════════════════════════════
//  Tab: Subscriptions Management
// ════════════════════════════════════════════════════════════

function SubscriptionsTab() {
  const [searchId, setSearchId] = useState('');
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [cancelDialog, setCancelDialog] = useState(false);
  const [working, setWorking] = useState(false);

  const handleSearch = async () => {
    const id = searchId.trim();
    if (!id) {
      toast.error('أدخل ID المستخدم');
      return;
    }
    if (!/^\d{15,22}$/.test(id)) {
      toast.error('ID غير صالح — يجب أن يكون أرقام Discord');
      return;
    }

    setLoading(true);
    setSearched(true);
    try {
      const r = await subscriptionApi.get(id);
      const data = r?.data ?? r;
      setSubscription(data);
    } catch (err) {
      console.error('[OwnerAdmin] Search subscription failed:', err);
      toast.error(err?.message || 'فشل البحث');
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!subscription?.user_id) return;
    setWorking(true);
    try {
      await adminApi.cancelSubscription(subscription.user_id);
      toast.success('تم إلغاء الاشتراك');
      setCancelDialog(false);
      // Refresh
      const r = await subscriptionApi.get(subscription.user_id);
      setSubscription(r?.data ?? r);
    } catch (err) {
      console.error('[OwnerAdmin] Cancel failed:', err);
      toast.error(err?.message || 'فشل الإلغاء');
    } finally {
      setWorking(false);
    }
  };

  const isActive = subscription?.status === 'active';

  return (
    <div className="space-y-4">
      {/* ─── Search ─── */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Search className="w-4 h-4 text-primary" />
          </div>
          <div>
            <div className="font-semibold">بحث عن مستخدم</div>
            <div className="text-xs text-muted-foreground">
              أدخل Discord User ID لعرض حالة اشتراكه
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Input
            value={searchId}
            onChange={(e) => setSearchId(e.target.value.replace(/\D/g, ''))}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="529320108032786433"
            className="font-mono num"
            inputMode="numeric"
          />
          <Button onClick={handleSearch} disabled={loading} className="lyn-gradient text-white">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            <span>بحث</span>
          </Button>
        </div>
      </Card>

      {/* ─── Result ─── */}
      {searched && !loading && (
        <>
          {!subscription || subscription?.status === 'inactive' ? (
            <EmptyState
              icon={Sparkles}
              title="لا يوجد اشتراك نشط"
              description={
                searchId
                  ? `المستخدم ${searchId} ليس لديه اشتراك حالياً`
                  : 'ابحث عن مستخدم لعرض اشتراكه'
              }
            />
          ) : (
            <SubscriptionDetailsCard
              subscription={subscription}
              isActive={isActive}
              onCancel={() => setCancelDialog(true)}
            />
          )}
        </>
      )}

      {/* ─── Cancel Dialog ─── */}
      <Dialog open={cancelDialog} onOpenChange={setCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="w-5 h-5 text-rose-500" />
              <span>إلغاء الاشتراك</span>
            </DialogTitle>
            <DialogDescription>
              هل أنت متأكد من إلغاء اشتراك هذا المستخدم؟
              <br />
              <span className="text-rose-500 font-medium">
                سيتم سحب الرتبة وفك ربط أي سيرفر مرتبط.
              </span>
            </DialogDescription>
          </DialogHeader>

          {subscription && (
            <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/20 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">المستخدم:</span>
                <code className="text-xs font-mono num">{subscription.user_id}</code>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">الخطة الحالية:</span>
                <PlanBadge plan={subscription.plan_id} size="sm" />
              </div>
              {subscription.expires_at && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">ينتهي:</span>
                  <span className="font-medium">
                    {new Date(subscription.expires_at).toLocaleDateString('ar')}
                  </span>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialog(false)} disabled={working}>
              تراجع
            </Button>
            <Button variant="destructive" onClick={handleCancel} disabled={working}>
              {working ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري...</span>
                </>
              ) : (
                <>
                  <Ban className="w-4 h-4" />
                  <span>تأكيد الإلغاء</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  Component: Subscription Details Card
// ════════════════════════════════════════════════════════════

function SubscriptionDetailsCard({ subscription, isActive, onCancel }) {
  const planInfo = getPlanInfo(subscription.plan_id);

  const expiresAt = subscription.expires_at ? new Date(subscription.expires_at) : null;
  const daysLeft = expiresAt ? Math.max(0, Math.ceil((expiresAt - Date.now()) / 86_400_000)) : null;

  const statusColor = {
    active:    'text-emerald-500 bg-emerald-500/10 border-emerald-500/30',
    expired:   'text-rose-500 bg-rose-500/10 border-rose-500/30',
    cancelled: 'text-rose-500 bg-rose-500/10 border-rose-500/30',
    inactive:  'text-muted-foreground bg-muted border-border',
  }[subscription.status] || 'text-muted-foreground bg-muted border-border';

  const statusLabel = {
    active:    'نشط',
    expired:   'منتهي',
    cancelled: 'ملغى',
    inactive:  'غير مفعّل',
  }[subscription.status] || subscription.status;

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        {/* Left: User + plan */}
        <div className="space-y-3 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-3xl">{planInfo.icon}</span>
            <h3 className="text-2xl font-bold">{planInfo.name}</h3>
            <Badge className={cn('border', statusColor)}>{statusLabel}</Badge>
          </div>

          <div className="text-sm text-muted-foreground">
            <span>المستخدم:</span>
            <code className="font-mono mx-2 num bg-muted px-2 py-0.5 rounded text-xs">
              {subscription.user_id}
            </code>
          </div>

          {expiresAt && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">ينتهي:</span>
              <span className="font-medium">
                {expiresAt.toLocaleDateString('ar', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
              {daysLeft !== null && isActive && (
                <Badge variant="outline" className="text-xs">
                  {daysLeft > 0 ? `${daysLeft} يوم متبقي` : 'ينتهي اليوم'}
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Right: Action */}
        {isActive && (
          <Button
            variant="outline"
            onClick={onCancel}
            className="border-rose-500/30 text-rose-500 hover:bg-rose-500/10"
          >
            <Ban className="w-4 h-4" />
            <span>إلغاء الاشتراك</span>
          </Button>
        )}
      </div>
    </Card>
  );
}
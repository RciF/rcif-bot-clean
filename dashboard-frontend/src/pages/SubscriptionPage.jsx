import { useEffect, useState } from 'react';
import { CreditCard, CheckCircle2, Clock, XCircle, Sparkles, Copy, Check } from 'lucide-react';
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
import { useAuthStore } from '@/store/authStore';
import { PLANS, PLAN_ORDER, PLAN_TIERS, getPlanInfo } from '@/lib/plans';
import { subscriptionApi } from '@/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ════════════════════════════════════════════════════════════
//  Bank info
// ════════════════════════════════════════════════════════════

const BANK_INFO = {
  bank: 'مصرف الراجحي',
  iban: 'SA0000000000000000000000',
  accountName: 'Lyn Bot',
};

// ════════════════════════════════════════════════════════════
//  Status meta
// ════════════════════════════════════════════════════════════

const STATUS_META = {
  pending:  { label: 'قيد المراجعة', icon: Clock,         color: 'text-amber-500',   bg: 'bg-amber-500/10 border-amber-500/30' },
  approved: { label: 'تم القبول',    icon: CheckCircle2,  color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/30' },
  rejected: { label: 'مرفوض',         icon: XCircle,       color: 'text-rose-500',    bg: 'bg-rose-500/10 border-rose-500/30' },
};

// ════════════════════════════════════════════════════════════
//  Page
// ════════════════════════════════════════════════════════════

export default function SubscriptionPage() {
  const { user } = useAuthStore();

  const [subscription, setSubscription] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [refNumber, setRefNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [copiedField, setCopiedField] = useState(null);

  // ────────────────────────────────────────────────────────
  //  Load subscription + history
  // ────────────────────────────────────────────────────────

  const loadData = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const [subRes, historyRes] = await Promise.all([
        subscriptionApi.get(user.id).catch(() => null),
        subscriptionApi.getMyPayments().catch(() => []),
      ]);

      // apiClient في هذا المشروع يرجع الـ data مباشرة (مو { data })
      const subData = subRes?.data ?? subRes;
      const historyData = historyRes?.data ?? historyRes;

      setSubscription(subData || { plan_id: 'free', status: 'inactive' });
      setHistory(Array.isArray(historyData) ? historyData : []);
    } catch (err) {
      console.error('Load subscription failed:', err);
      toast.error('فشل تحميل بيانات الاشتراك');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // ────────────────────────────────────────────────────────
  //  Submit payment request
  // ────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!selectedPlan || !refNumber.trim()) {
      toast.error('الرجاء إدخال رقم الحوالة');
      return;
    }

    setSubmitting(true);
    try {
      await subscriptionApi.requestPayment({
        plan_id: selectedPlan,
        ref_number: refNumber.trim(),
      });

      toast.success('تم إرسال طلبك — سيتم مراجعته قريباً');
      setDialogOpen(false);
      setRefNumber('');
      setSelectedPlan(null);
      loadData();
    } catch (err) {
      const code = err?.response?.data?.code || err?.code;
      const message = err?.response?.data?.error || err?.message;

      if (code === 'PENDING_EXISTS') {
        toast.error('عندك طلب قيد المراجعة بالفعل');
      } else {
        toast.error(message || 'فشل إرسال الطلب');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const openUpgradeDialog = (planId) => {
    setSelectedPlan(planId);
    setRefNumber('');
    setDialogOpen(true);
  };

  const copyToClipboard = async (text, field) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast.success('تم النسخ');
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast.error('فشل النسخ');
    }
  };

  // ────────────────────────────────────────────────────────
  //  Loading state
  // ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  const currentPlanId = subscription?.plan_id || 'free';
  const currentPlan = getPlanInfo(currentPlanId);
  const isActive = subscription?.status === 'active';

  // ────────────────────────────────────────────────────────
  //  Render
  // ────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <SettingsPageHeader
        icon={<CreditCard />}
        title="الاشتراك"
        description="اختر الخطة المناسبة لسيرفرك"
      />

      {/* الاشتراك الحالي */}
      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl lyn-gradient flex items-center justify-center text-2xl">
              {currentPlan.icon}
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">الخطة الحالية</div>
              <div className="text-xl font-bold">{currentPlan.name}</div>
              {isActive && subscription?.expires_at && (
                <div className="text-xs text-muted-foreground mt-1">
                  تنتهي في: {new Date(subscription.expires_at).toLocaleDateString('ar-SA')}
                </div>
              )}
            </div>
          </div>
          <PlanBadge plan={currentPlanId} size="lg" />
        </div>
      </Card>

      {/* الخطط المتاحة */}
      <div>
        <h2 className="text-xl font-bold mb-4">الخطط المتاحة</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLAN_ORDER.map((planId) => {
            const plan = PLANS[planId];
            const isCurrent = planId === currentPlanId && isActive;
            const isFree = planId === PLAN_TIERS.FREE;

            return (
              <Card
                key={planId}
                className={cn(
                  'p-6 flex flex-col gap-4 transition-all',
                  isCurrent && 'ring-2 ring-purple-500 lyn-glow',
                )}
              >
                <div className="text-center">
                  <div className="text-4xl mb-2">{plan.icon}</div>
                  <h3 className="text-lg font-bold mb-1">{plan.name}</h3>
                  {plan.badge && (
                    <Badge variant="lyn" size="sm">
                      {plan.badge}
                    </Badge>
                  )}
                  <div className="text-2xl font-bold mt-3 lyn-text-gradient num">
                    {plan.priceLabel}
                  </div>
                </div>

                <div className="space-y-2 flex-1 text-sm">
                  {plan.features.slice(0, 5).map((f, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{f}</span>
                    </div>
                  ))}
                  {plan.features.length > 5 && (
                    <div className="text-xs text-muted-foreground pt-1">
                      + {plan.features.length - 5} ميزة أخرى
                    </div>
                  )}
                </div>

                {isCurrent ? (
                  <Button variant="outline" disabled className="w-full">
                    <CheckCircle2 className="w-4 h-4" />
                    خطتك الحالية
                  </Button>
                ) : isFree ? (
                  <Button variant="outline" disabled className="w-full">
                    افتراضي
                  </Button>
                ) : (
                  <Button
                    variant="default"
                    onClick={() => openUpgradeDialog(planId)}
                    className="w-full"
                  >
                    <Sparkles className="w-4 h-4" />
                    ترقية لـ {plan.name}
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      {/* سجل الطلبات */}
      {history.length > 0 && (
        <div>
          <h2 className="text-xl font-bold mb-4">سجل الطلبات</h2>
          <div className="space-y-2">
            {history.map((item) => {
              const meta = STATUS_META[item.status] || STATUS_META.pending;
              const Icon = meta.icon;
              const plan = getPlanInfo(item.plan_id);

              return (
                <Card key={item.id} className={cn('p-4 border', meta.bg)}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Icon className={cn('w-5 h-5', meta.color)} />
                      <div>
                        <div className="font-medium">
                          ترقية {plan.icon} {plan.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          رقم الحوالة: <span className="num">{item.ref_number}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-end">
                      <div className={cn('text-sm font-medium', meta.color)}>
                        {meta.label}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(item.created_at).toLocaleDateString('ar-SA')}
                      </div>
                    </div>
                  </div>
                  {item.notes && (
                    <div className="text-sm mt-3 pt-3 border-t border-border/50">
                      <span className="text-muted-foreground">ملاحظات: </span>
                      {item.notes}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Dialog الترقية */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              ترقية لخطة {selectedPlan && getPlanInfo(selectedPlan).name}
            </DialogTitle>
            <DialogDescription>
              حوّل المبلغ على الحساب البنكي ثم أدخل رقم الحوالة هنا
            </DialogDescription>
          </DialogHeader>

          {/* بيانات البنك */}
          <Card className="p-4 space-y-3 bg-muted/30">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">البنك</div>
                <div className="font-medium">{BANK_INFO.bank}</div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-xs text-muted-foreground">IBAN</div>
                <div className="font-mono text-sm truncate" dir="ltr">
                  {BANK_INFO.iban}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(BANK_INFO.iban, 'iban')}
              >
                {copiedField === 'iban' ? (
                  <Check className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">اسم المستلم</div>
                <div className="font-medium">{BANK_INFO.accountName}</div>
              </div>
            </div>

            <div className="pt-2 border-t border-border/50">
              <div className="text-xs text-muted-foreground">المبلغ</div>
              <div className="text-lg font-bold lyn-text-gradient num">
                {selectedPlan && PLANS[selectedPlan]?.priceLabel}
              </div>
            </div>
          </Card>

          {/* رقم الحوالة */}
          <div className="space-y-2">
            <label className="text-sm font-medium">رقم الحوالة (Reference)</label>
            <Input
              placeholder="أدخل رقم الحوالة من إيصال التحويل"
              value={refNumber}
              onChange={(e) => setRefNumber(e.target.value)}
              dir="ltr"
            />
            <p className="text-xs text-muted-foreground">
              راح نراجع طلبك ونفعّل اشتراكك خلال 24 ساعة
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={submitting}
              className="flex-1"
            >
              إلغاء
            </Button>
            <Button
              variant="default"
              onClick={handleSubmit}
              disabled={submitting || !refNumber.trim()}
              className="flex-1"
            >
              {submitting ? 'جاري الإرسال...' : 'إرسال الطلب'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
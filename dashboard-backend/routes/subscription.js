import { useEffect, useState, useMemo } from 'react';
import {
  CreditCard,
  Calendar,
  Check,
  Receipt,
  Sparkles,
  Crown,
  Diamond,
  Medal,
  Clock,
  XCircle,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
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
import { Input } from '@/components/ui/Input';
import { SettingsPageHeader } from '@/components/shared/SettingsPageHeader';
import { subscriptionApi } from '@/api';
import { useAuthStore } from '@/store/authStore';
import { PLANS, PLAN_TIERS, PLAN_ORDER } from '@/lib/plans';
import { formatDate, formatRelativeTime, cn } from '@/lib/utils';
import { toast } from 'sonner';

const PLAN_ICONS = {
  free: Sparkles,
  silver: Medal,
  gold: Crown,
  diamond: Diamond,
};

const STATUS_CONFIG = {
  pending: {
    label: 'قيد المراجعة',
    icon: Clock,
    badgeVariant: 'warning',
    color: 'text-amber-500',
  },
  approved: {
    label: 'مقبول',
    icon: CheckCircle2,
    badgeVariant: 'success',
    color: 'text-emerald-500',
  },
  rejected: {
    label: 'مرفوض',
    icon: XCircle,
    badgeVariant: 'danger',
    color: 'text-rose-500',
  },
};

/**
 * احسب أيام متبقية من تاريخ انتهاء
 */
function calcDaysRemaining(expiresAt) {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function SubscriptionPage() {
  const { user } = useAuthStore();

  const [subscription, setSubscription] = useState(null);
  const [payments, setPayments] = useState(null);
  const [loading, setLoading] = useState(true);

  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [refNumber, setRefNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ─── Load data ───
  useEffect(() => {
    if (!user?.id) return;
    let mounted = true;

    setLoading(true);
    Promise.allSettled([
      subscriptionApi.get(user.id),
      subscriptionApi.getMyPayments(),
    ]).then(([subRes, payRes]) => {
      if (!mounted) return;

      if (subRes.status === 'fulfilled') {
        setSubscription(subRes.value);
      } else {
        console.error('[SUBSCRIPTION_LOAD]', subRes.reason);
        // ما نعرض toast — الباك اند يرجع free تلقائياً لو ما فيه اشتراك
        setSubscription({ plan_id: 'free', status: 'inactive', expires_at: null });
      }

      if (payRes.status === 'fulfilled') {
        setPayments(payRes.value || []);
      } else {
        console.error('[PAYMENTS_LOAD]', payRes.reason);
        setPayments([]);
      }

      setLoading(false);
    });

    return () => { mounted = false; };
  }, [user?.id]);

  // ─── Computed ───
  const currentPlanId = subscription?.plan_id || 'free';
  const currentPlan = PLANS[currentPlanId] || PLANS.free;
  const isActive = subscription?.status === 'active';
  const isExpired = subscription?.status === 'expired';
  const daysRemaining = calcDaysRemaining(subscription?.expires_at);

  // ─── Has pending request? ───
  const pendingRequest = useMemo(() => {
    return payments?.find((p) => p.status === 'pending') || null;
  }, [payments]);

  // ─── Handlers ───
  const handleSubmitRequest = async () => {
    if (!refNumber.trim() || !selectedPlan) return;
    setSubmitting(true);
    try {
      const result = await subscriptionApi.requestPayment({
        plan_id: selectedPlan,
        ref_number: refNumber.trim(),
      });
      // أضف الطلب الجديد للسجل
      setPayments((prev) => [result, ...(prev || [])]);
      toast.success(`تم إرسال طلب الاشتراك في ${PLANS[selectedPlan].name}`);
      setRefNumber('');
      setShowRequestDialog(false);
      setSelectedPlan(null);
    } catch (err) {
      if (err.code === 'PENDING_EXISTS') {
        toast.error('لديك طلب قيد المراجعة بالفعل');
      } else {
        toast.error(err.message || 'فشل إرسال الطلب');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Loading state ───
  if (loading) {
    return (
      <>
        <SettingsPageHeader
          icon={<CreditCard />}
          title="الاشتراك"
          description="إدارة خطتك ومدفوعاتك"
        />
        <div className="space-y-4">
          <Skeleton className="h-32 rounded-2xl" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-80 rounded-2xl" />
            ))}
          </div>
        </div>
      </>
    );
  }

  const Icon = PLAN_ICONS[currentPlanId] || Sparkles;

  return (
    <>
      <SettingsPageHeader
        icon={<CreditCard />}
        title="الاشتراك"
        description="إدارة خطتك ومدفوعاتك"
      />

      {/* ═══ Pending Request Banner ═══ */}
      {pendingRequest && (
        <Card className="p-4 mb-4 border-amber-500/30 bg-gradient-to-l from-amber-500/10 to-transparent">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-sm mb-0.5">
                طلب اشتراك قيد المراجعة
              </h3>
              <p className="text-xs text-muted-foreground">
                طلبك للاشتراك في خطة <span className="font-semibold">{PLANS[pendingRequest.plan_id]?.name}</span>{' '}
                مرسل بتاريخ {formatRelativeTime(pendingRequest.created_at)} — الإدارة تراجعه
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* ═══ Current Plan Card ═══ */}
      <Card className="p-6 mb-4 lyn-gradient-soft border-border">
        <div className="flex items-start gap-5 flex-wrap">
          <div className="w-16 h-16 rounded-2xl lyn-gradient flex items-center justify-center flex-shrink-0 lyn-glow">
            <Icon className="w-8 h-8 text-white" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h2 className="text-2xl font-bold">
                خطة {currentPlan.name} {currentPlan.icon}
              </h2>
              <Badge variant={isActive ? currentPlan.color : 'default'}>
                {isActive ? 'الحالية' : isExpired ? 'منتهية' : 'غير مفعّلة'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              {currentPlan.description}
            </p>

            <div className="flex items-center gap-4 flex-wrap text-sm">
              {subscription?.expires_at && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {isExpired ? 'انتهت في:' : 'تنتهي في:'}
                  </span>
                  <span className="font-bold">{formatDate(subscription.expires_at)}</span>
                </div>
              )}
              {daysRemaining !== null && isActive && (
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">المتبقي:</span>
                  <Badge
                    variant={daysRemaining <= 7 ? 'warning' : 'success'}
                    size="default"
                  >
                    <span className="num">{daysRemaining}</span> يوم
                  </Badge>
                </div>
              )}
              {!isActive && currentPlanId === 'free' && (
                <div className="text-xs text-muted-foreground">
                  ترقّى الآن للحصول على ميزات إضافية
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* ═══ Plans Comparison ═══ */}
      <h2 className="text-lg font-bold mb-3">قارن الخطط</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {PLAN_ORDER.map((planId) => {
          const plan = PLANS[planId];
          const PlanIcon = PLAN_ICONS[planId];
          const isCurrent = planId === currentPlanId && isActive;
          const isPaid = plan.price > 0;

          return (
            <Card
              key={planId}
              className={cn(
                'p-5 relative transition-all',
                isCurrent && 'ring-2 ring-primary shadow-lg',
                !isCurrent && 'hover:border-border/80',
              )}
            >
              {plan.badge && (
                <div className="absolute -top-2 inset-x-0 flex justify-center">
                  <Badge variant="lyn" size="sm">
                    {plan.badge}
                  </Badge>
                </div>
              )}

              <div className="flex items-center gap-3 mb-3">
                <div
                  className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center',
                    isCurrent ? 'lyn-gradient' : 'bg-muted',
                  )}
                >
                  <PlanIcon
                    className={cn('w-5 h-5', isCurrent ? 'text-white' : 'text-muted-foreground')}
                  />
                </div>
                <div>
                  <div className="font-bold">{plan.name}</div>
                  <div className="text-xs text-muted-foreground">{plan.nameEn}</div>
                </div>
              </div>

              <div className="mb-4">
                <div className="text-2xl font-bold lyn-text-gradient num">
                  {plan.priceLabel}
                </div>
              </div>

              <div className="space-y-1.5 mb-4 min-h-[160px]">
                {plan.features.slice(0, 6).map((feat, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-xs">
                    <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span className="text-muted-foreground line-clamp-1">{feat}</span>
                  </div>
                ))}
                {plan.features.length > 6 && (
                  <div className="text-xs text-muted-foreground/60 ps-5">
                    + {plan.features.length - 6} ميزة أخرى
                  </div>
                )}
              </div>

              {isCurrent ? (
                <Button variant="outline" className="w-full" disabled>
                  خطتك الحالية
                </Button>
              ) : isPaid ? (
                <Button
                  className="w-full"
                  variant={planId === 'diamond' ? 'default' : 'outline'}
                  disabled={!!pendingRequest}
                  onClick={() => {
                    setSelectedPlan(planId);
                    setShowRequestDialog(true);
                  }}
                >
                  {pendingRequest ? 'لديك طلب معلق' : 'اشترك'}
                </Button>
              ) : (
                <Button variant="outline" className="w-full" disabled>
                  مجاني
                </Button>
              )}
            </Card>
          );
        })}
      </div>

      {/* ═══ Payment History ═══ */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Receipt className="w-5 h-5 text-primary" />
          <h2 className="font-bold">سجل المدفوعات</h2>
        </div>

        {!payments || payments.length === 0 ? (
          <div className="py-8 text-center">
            <Receipt className="w-10 h-10 mx-auto mb-2 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">لا توجد طلبات سابقة</p>
          </div>
        ) : (
          <div className="space-y-2">
            {payments.map((payment) => {
              const status = STATUS_CONFIG[payment.status] || STATUS_CONFIG.pending;
              const StatusIcon = status.icon;
              const planInfo = PLANS[payment.plan_id] || PLANS.free;

              return (
                <div
                  key={payment.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-border/80 transition-colors"
                >
                  <div
                    className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                      'bg-muted',
                      status.color,
                    )}
                  >
                    <StatusIcon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="font-bold text-sm">
                        {planInfo.name} {planInfo.icon}
                      </span>
                      <Badge variant={status.badgeVariant} size="sm">
                        {status.label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      <span>
                        رقم العملية:{' '}
                        <span className="num font-mono text-foreground/80">
                          {payment.ref_number}
                        </span>
                      </span>
                      <span>•</span>
                      <span>{formatRelativeTime(payment.created_at)}</span>
                    </div>
                    {payment.notes && payment.status === 'rejected' && (
                      <div className="mt-1 text-xs text-rose-400 flex items-start gap-1">
                        <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                        <span>{payment.notes}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* ═══ Subscribe Dialog ═══ */}
      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent>
          {selectedPlan && (
            <>
              <div className="flex justify-center -mt-4 mb-2">
                <div className="w-16 h-16 rounded-2xl lyn-gradient flex items-center justify-center">
                  <span className="text-3xl">{PLANS[selectedPlan].icon}</span>
                </div>
              </div>
              <DialogHeader>
                <DialogTitle className="text-center">
                  الاشتراك في {PLANS[selectedPlan].name}
                </DialogTitle>
                <DialogDescription className="text-center">
                  ادخل رقم العملية اللي حولت فيها{' '}
                  <span className="font-bold text-foreground num">
                    {PLANS[selectedPlan].priceLabel}
                  </span>
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3">
                <div className="bg-muted/40 rounded-xl p-3 text-sm">
                  <div className="font-semibold mb-1">طرق الدفع المتاحة:</div>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• تحويل بنكي</li>
                    <li>• STC Pay</li>
                    <li>• مدى</li>
                  </ul>
                </div>

                <Input
                  value={refNumber}
                  onChange={(e) => setRefNumber(e.target.value)}
                  placeholder="رقم العملية..."
                  className="num"
                  disabled={submitting}
                />
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowRequestDialog(false)}
                  className="flex-1"
                  disabled={submitting}
                >
                  إلغاء
                </Button>
                <Button
                  onClick={handleSubmitRequest}
                  disabled={!refNumber.trim() || submitting}
                  className="flex-1"
                >
                  <Sparkles className="w-4 h-4" />
                  {submitting ? 'جاري الإرسال...' : 'إرسال الطلب'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
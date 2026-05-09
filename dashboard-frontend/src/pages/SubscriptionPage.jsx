import { useEffect, useState } from 'react';
import {
  CreditCard,
  CheckCircle2,
  Clock,
  XCircle,
  Sparkles,
  Copy,
  Check,
  Building2,
  Smartphone,
  Apple,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Send,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
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
//  Payment Methods Configuration
// ════════════════════════════════════════════════════════════

const ACCOUNT_NAME = 'علي سلمان طاوي الفيفي';

const PAYMENT_METHODS = {
  rajhi: {
    id: 'rajhi',
    label: 'الراجحي',
    icon: Building2,
    color: 'text-violet-500',
    bg: 'bg-violet-500/10 border-violet-500/30',
    info: {
      bank: 'مصرف الراجحي',
      iban: 'SA5580000107608016076681',
      accountName: ACCOUNT_NAME,
    },
    steps: [
      'افتح تطبيق الراجحي',
      'اختر "تحويل لحساب آخر" أو "تحويل بنكي"',
      'انسخ رقم الـ IBAN من الأسفل',
      'حوّل المبلغ المطلوب من خطتك',
      'انسخ رقم العملية (Reference) من إيصال التحويل',
      'الصق رقم العملية في الأسفل واضغط إرسال',
    ],
  },
  stcbank: {
    id: 'stcbank',
    label: 'STC Bank',
    icon: Smartphone,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10 border-emerald-500/30',
    info: {
      bank: 'STC Bank',
      iban: 'SA0478000000001301454291',
      accountName: ACCOUNT_NAME,
    },
    steps: [
      'افتح تطبيق STC Bank',
      'اختر "تحويل" ثم "حساب آخر / IBAN"',
      'انسخ رقم الـ IBAN من الأسفل',
      'حوّل المبلغ المطلوب',
      'انسخ رقم العملية من سجل المعاملات',
      'الصق رقم العملية في الأسفل واضغط إرسال',
    ],
  },
  phone: {
    id: 'phone',
    label: 'تحويل بالجوال',
    icon: Apple,
    color: 'text-pink-500',
    bg: 'bg-pink-500/10 border-pink-500/30',
    info: {
      number: '0509992372',
      accountName: ACCOUNT_NAME,
    },
    steps: [
      'افتح تطبيق البنك أو STC Bank',
      'اختر "تحويل لرقم جوال"',
      'أدخل الرقم: 0509992372',
      'تأكد من الاسم: علي سلمان طاوي الفيفي',
      'حوّل المبلغ المطلوب',
      'الصق رقم العملية في الأسفل واضغط إرسال',
    ],
  },
};

// ════════════════════════════════════════════════════════════
//  Status meta — using JSX elements (NOT component refs)
// ════════════════════════════════════════════════════════════

const STATUS_META = {
  pending:  { label: 'قيد المراجعة', Icon: Clock,        color: 'text-amber-500',   bg: 'bg-amber-500/10 border-amber-500/30' },
  approved: { label: 'تم القبول',    Icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/30' },
  rejected: { label: 'مرفوض',         Icon: XCircle,      color: 'text-rose-500',    bg: 'bg-rose-500/10 border-rose-500/30' },
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
  const [paymentMethod, setPaymentMethod] = useState('rajhi');
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
      toast.error('الرجاء إدخال رقم العملية');
      return;
    }

    setSubmitting(true);
    try {
      await subscriptionApi.requestPayment({
        plan_id: selectedPlan,
        ref_number: refNumber.trim(),
      });

      toast.success('تم إرسال طلبك — سيتم مراجعته خلال 24 ساعة');
      setDialogOpen(false);
      setRefNumber('');
      setSelectedPlan(null);
      setPaymentMethod('rajhi');
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
    setPaymentMethod('rajhi');
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
      <>
        <SettingsPageHeader
          icon={<CreditCard />}
          title="الاشتراك"
          description="إدارة خطتك ودفعاتك"
        />
        <div className="space-y-6">
          <Skeleton className="h-32 rounded-2xl" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Skeleton className="h-80 rounded-2xl" />
            <Skeleton className="h-80 rounded-2xl" />
            <Skeleton className="h-80 rounded-2xl" />
            <Skeleton className="h-80 rounded-2xl" />
          </div>
        </div>
      </>
    );
  }

  const currentPlanId = subscription?.plan_id || 'free';
  const isActive = subscription?.status === 'active';
  const expiresAt = subscription?.expires_at ? new Date(subscription.expires_at) : null;
  const daysLeft = expiresAt ? Math.max(0, Math.ceil((expiresAt - Date.now()) / 86_400_000)) : null;

  return (
    <div className="space-y-8">
      <SettingsPageHeader
        icon={<CreditCard />}
        title="الاشتراك"
        description="إدارة خطتك ودفعاتك"
      />

      {/* ─── Current subscription card ─── */}
      <Card className="p-6 lyn-gradient-soft">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="text-5xl flex-shrink-0">{getPlanInfo(currentPlanId).icon}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h2 className="text-xl font-bold">خطتك: {getPlanInfo(currentPlanId).name}</h2>
                {isActive && (
                  <Badge variant="success" size="sm" className="gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>نشطة</span>
                  </Badge>
                )}
              </div>
              {expiresAt && isActive ? (
                <p className="text-sm text-muted-foreground">
                  تنتهي في{' '}
                  <span className="font-medium">
                    {expiresAt.toLocaleDateString('ar-SA')}
                  </span>
                  {daysLeft !== null && (
                    <span className="text-xs mr-1">
                      ({daysLeft > 0 ? `${daysLeft} يوم متبقي` : 'تنتهي اليوم'})
                    </span>
                  )}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {currentPlanId === 'free'
                    ? 'ترقّى لخطة مدفوعة لتفعيل المزيد من الميزات'
                    : 'اشتراكك غير نشط حالياً'}
                </p>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* ─── Available plans ─── */}
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

      {/* ─── History ─── */}
      {history.length > 0 && (
        <div>
          <h2 className="text-xl font-bold mb-4">سجل الطلبات</h2>
          <div className="space-y-2">
            {history.map((item) => {
              const meta = STATUS_META[item.status] || STATUS_META.pending;
              const StatusIcon = meta.Icon;
              const plan = getPlanInfo(item.plan_id);

              return (
                <Card key={item.id} className={cn('p-4 border', meta.bg)}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <StatusIcon className={cn('w-5 h-5', meta.color)} />
                      <div>
                        <div className="font-medium">
                          ترقية {plan.icon} {plan.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          رقم العملية: <span className="num">{item.ref_number}</span>
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

      {/* ════════════════════════════════════════════════════════════ */}
      {/*  Upgrade Dialog with Payment Methods Tabs                     */}
      {/* ════════════════════════════════════════════════════════════ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <span>
                ترقية لخطة {selectedPlan && getPlanInfo(selectedPlan).name}{' '}
                {selectedPlan && getPlanInfo(selectedPlan).icon}
              </span>
            </DialogTitle>
            <DialogDescription>
              اختر طريقة الدفع المناسبة لك واتبع الخطوات
            </DialogDescription>
          </DialogHeader>

          {/* Price highlight */}
          {selectedPlan && (
            <div className="p-4 rounded-xl lyn-gradient-soft border border-primary/20 text-center">
              <div className="text-xs text-muted-foreground mb-1">المبلغ المطلوب</div>
              <div className="text-3xl font-bold lyn-text-gradient num">
                {PLANS[selectedPlan]?.priceLabel}
              </div>
            </div>
          )}

          {/* Payment Method Tabs */}
          <Tabs value={paymentMethod} onValueChange={setPaymentMethod}>
            <TabsList variant="pills" className="flex-wrap gap-1 w-full">
              {Object.values(PAYMENT_METHODS).map((method) => {
                const MethodIcon = method.icon;
                return (
                  <TabsTrigger
                    key={method.id}
                    value={method.id}
                    variant="pills"
                    className="flex-1 min-w-[100px]"
                  >
                    <MethodIcon className="w-4 h-4" />
                    <span className="text-xs sm:text-sm">{method.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {/* Al-Rajhi Bank Transfer */}
            <TabsContent value="rajhi">
              <PaymentMethodCard
                method={PAYMENT_METHODS.rajhi}
                copiedField={copiedField}
                onCopy={copyToClipboard}
              />
            </TabsContent>

            {/* STC Bank Transfer */}
            <TabsContent value="stcbank">
              <PaymentMethodCard
                method={PAYMENT_METHODS.stcbank}
                copiedField={copiedField}
                onCopy={copyToClipboard}
              />
            </TabsContent>

            {/* Phone Transfer */}
            <TabsContent value="phone">
              <PaymentMethodCard
                method={PAYMENT_METHODS.phone}
                copiedField={copiedField}
                onCopy={copyToClipboard}
              />
            </TabsContent>
          </Tabs>

          {/* Reference Number Input */}
          <div className="space-y-2 pt-2 border-t border-border">
            <label className="text-sm font-semibold flex items-center gap-1.5">
              <Send className="w-4 h-4 text-primary" />
              <span>رقم العملية (Reference)</span>
            </label>
            <Input
              placeholder="مثلاً: FT24230012345"
              value={refNumber}
              onChange={(e) => setRefNumber(e.target.value)}
              dir="ltr"
              className="font-mono num"
            />
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <p>
                ستجد رقم العملية في إيصال التحويل أو سجل المعاملات. سنراجع طلبك
                ونفعّل اشتراكك خلال 24 ساعة كحد أقصى.
              </p>
            </div>
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

// ════════════════════════════════════════════════════════════
//  Component: Payment Method Card
// ════════════════════════════════════════════════════════════

function PaymentMethodCard({ method, copiedField, onCopy }) {
  const MethodIcon = method.icon;

  return (
    <div className="space-y-4">
      {/* Account Info */}
      <Card className={cn('p-4 space-y-3 border', method.bg)}>
        <div className="flex items-center gap-2 pb-2 border-b border-border/50">
          <MethodIcon className={cn('w-5 h-5', method.color)} />
          <span className="font-bold">{method.label}</span>
        </div>

        {/* IBAN-based methods (rajhi, stcbank) */}
        {(method.id === 'rajhi' || method.id === 'stcbank') && (
          <>
            <InfoRow
              label="البنك"
              value={method.info.bank}
              copyable={false}
            />
            <InfoRow
              label="رقم IBAN"
              value={method.info.iban}
              field={`${method.id}-iban`}
              copiedField={copiedField}
              onCopy={onCopy}
              monospace
            />
            <InfoRow
              label="اسم المستلم"
              value={method.info.accountName}
              field={`${method.id}-name`}
              copiedField={copiedField}
              onCopy={onCopy}
            />
          </>
        )}

        {/* Phone-based method */}
        {method.id === 'phone' && (
          <>
            <InfoRow
              label="رقم الجوال"
              value={method.info.number}
              field="phone-number"
              copiedField={copiedField}
              onCopy={onCopy}
              monospace
            />
            <InfoRow
              label="اسم المستلم"
              value={method.info.accountName}
              field="phone-name"
              copiedField={copiedField}
              onCopy={onCopy}
            />
          </>
        )}
      </Card>

      {/* Steps */}
      <div className="space-y-2">
        <div className="text-sm font-semibold flex items-center gap-1.5">
          <span>الخطوات</span>
          <Badge variant="outline" size="sm">
            {method.steps.length}
          </Badge>
        </div>
        <ol className="space-y-2">
          {method.steps.map((step, idx) => (
            <li key={idx} className="flex items-start gap-3 text-sm">
              <div
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0',
                  'text-xs font-bold border',
                  method.bg,
                  method.color,
                )}
              >
                <span className="num">{idx + 1}</span>
              </div>
              <span className="text-muted-foreground pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  Component: Info Row (with copy button)
// ════════════════════════════════════════════════════════════

function InfoRow({ label, value, field, copiedField, onCopy, copyable = true, monospace = false }) {
  const isCopied = field && copiedField === field;

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex-1 min-w-0">
        <div className="text-xs text-muted-foreground mb-0.5">{label}</div>
        <div
          className={cn(
            'text-sm truncate',
            monospace ? 'font-mono num font-semibold' : 'font-medium',
          )}
          dir={monospace ? 'ltr' : 'rtl'}
        >
          {value}
        </div>
      </div>
      {copyable && field && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onCopy(value, field)}
          className="flex-shrink-0"
        >
          {isCopied ? (
            <>
              <Check className="w-4 h-4 text-emerald-500" />
              <span className="text-xs text-emerald-500">تم</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span className="text-xs">نسخ</span>
            </>
          )}
        </Button>
      )}
    </div>
  );
}
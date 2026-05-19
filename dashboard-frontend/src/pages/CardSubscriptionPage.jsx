/**
 * ═══════════════════════════════════════════════════════════
 *  Card Subscription Page — صفحة الاشتراك في تخصيص البطاقة
 *  المسار: dashboard-frontend/src/pages/CardSubscriptionPage.jsx
 *
 *  ✨ مستقلة تماماً عن SubscriptionPage (اشتراكات البوت)
 *
 *  - عرض 3 فئات (basic / advanced / legendary)
 *  - تبديل شهري / سنوي مع توفير ملحوظ
 *  - مقارنة المميزات
 *  - dialog الدفع مع 3 طرق
 *  - عرض الاشتراك الحالي
 *  - عرض الطلبات السابقة
 * ═══════════════════════════════════════════════════════════
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Crown,
  Sparkles,
  Check,
  X,
  Clock,
  CheckCircle2,
  XCircle,
  Building2,
  Smartphone,
  Apple,
  Copy,
  Send,
  Loader2,
  ArrowLeft,
  Gift,
  TrendingUp,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
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
import { PageLoading } from '@/components/shared/PageLoading';
import { EmptyState } from '@/components/shared/EmptyState';
import { TierBadge } from '@/components/card/TierBadge';
import {
  useCardMe,
  useMyCardRequests,
  useCreateCardRequest,
} from '@/hooks/useCardData';
import {
  getPaidTiers,
  formatPrice,
  formatDate,
  formatDaysLeft,
  REQUEST_STATUS_LABELS,
  REQUEST_STATUS_COLORS,
} from '@/lib/cardPlans';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ════════════════════════════════════════════════════════════
//  PAYMENT CONFIG
// ════════════════════════════════════════════════════════════

const ACCOUNT_NAME = 'علي سلمان طاوي الفيفي';

const PAYMENT_METHODS = {
  rajhi: {
    id: 'rajhi',
    label: 'الراجحي',
    icon: Building2,
    color: 'text-violet-500',
    info: {
      bank: 'مصرف الراجحي',
      iban: 'SA5580000107608016076681',
      accountName: ACCOUNT_NAME,
    },
    steps: [
      'افتح تطبيق الراجحي وحوّل المبلغ للـ IBAN',
      'انسخ رقم العملية من إشعار التحويل',
      'الصق رقم العملية في الخانة أدناه واضغط إرسال',
    ],
  },
  stc: {
    id: 'stc',
    label: 'STC Pay',
    icon: Smartphone,
    color: 'text-pink-500',
    info: {
      phone: '0509999999',
      accountName: ACCOUNT_NAME,
    },
    steps: [
      'افتح تطبيق STC Pay وحوّل المبلغ للرقم',
      'انسخ رقم العملية من إشعار التحويل',
      'الصق رقم العملية في الخانة أدناه واضغط إرسال',
    ],
  },
  applepay: {
    id: 'applepay',
    label: 'Apple Pay',
    icon: Apple,
    color: 'text-slate-300',
    info: {
      note: 'استخدم نفس بيانات الراجحي عبر Apple Pay',
    },
    steps: [
      'افتح Apple Pay واختر بطاقة الراجحي',
      'حوّل المبلغ للـ IBAN في تبويب الراجحي',
      'انسخ رقم العملية والصقها في الخانة أدناه',
    ],
  },
};

// ════════════════════════════════════════════════════════════
//  PAGE
// ════════════════════════════════════════════════════════════

export default function CardSubscriptionPage() {
  const { data: cardData, isLoading: cardLoading } = useCardMe();
  const { data: requests, isLoading: requestsLoading } = useMyCardRequests();
  const { mutate: createRequest, isPending: submitting } =
    useCreateCardRequest();

  const [duration, setDuration] = useState('monthly');
  const [selectedTier, setSelectedTier] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('rajhi');
  const [refNumber, setRefNumber] = useState('');
  const [copiedField, setCopiedField] = useState(null);

  if (cardLoading) return <PageLoading variant="default" />;

  const currentTier = cardData?.currentTier || 'free';
  const subscription = cardData?.subscription;
  const isPremium = currentTier !== 'free';

  const paidTiers = getPaidTiers();

  // ════════════════════════════════════════════
  //  Handlers
  // ════════════════════════════════════════════

  const handleSelectTier = (tier) => {
    setSelectedTier(tier);
    setPaymentMethod('rajhi');
    setRefNumber('');
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!selectedTier || !refNumber.trim()) {
      toast.error('الرجاء إدخال رقم العملية');
      return;
    }

    createRequest(
      {
        tier: selectedTier.id,
        duration,
        ref_number: refNumber.trim(),
      },
      {
        onSuccess: () => {
          setDialogOpen(false);
          setRefNumber('');
          setSelectedTier(null);
        },
      },
    );
  };

  const copyToClipboard = (value, field) => {
    navigator.clipboard.writeText(value);
    setCopiedField(field);
    toast.success('تم النسخ');
    setTimeout(() => setCopiedField(null), 2000);
  };

  // ════════════════════════════════════════════
  //  Render
  // ════════════════════════════════════════════

  return (
    <>
      <SettingsPageHeader
        icon={<Crown />}
        title="اشتراك تخصيص البطاقة"
        description="افتح ميزات أسطورية لبطاقة المستوى الخاصة بك"
        actions={
          <Button asChild variant="outline" size="default">
            <Link to="/dashboard/card">
              <ArrowLeft className="w-4 h-4" />
              العودة للتخصيص
            </Link>
          </Button>
        }
      />

      {/* ═══════════════════════════════════════════
         الاشتراك الحالي (لو موجود)
      ═══════════════════════════════════════════ */}
      {isPremium && (
        <CurrentSubscriptionCard
          subscription={subscription}
          currentTier={currentTier}
        />
      )}

      {/* ═══════════════════════════════════════════
         Toggle: شهري / سنوي
      ═══════════════════════════════════════════ */}
      <div className="flex items-center justify-center mb-8">
        <div className="inline-flex items-center bg-card border border-border rounded-full p-1">
          <button
            onClick={() => setDuration('monthly')}
            className={cn(
              'px-6 py-2 rounded-full text-sm font-bold transition-all',
              duration === 'monthly'
                ? 'lyn-gradient text-white shadow-lg'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            شهري
          </button>
          <button
            onClick={() => setDuration('yearly')}
            className={cn(
              'px-6 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2',
              duration === 'yearly'
                ? 'lyn-gradient text-white shadow-lg'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            سنوي
            <Badge
              variant="default"
              size="sm"
              className={cn(
                'text-[10px] px-1.5',
                duration === 'yearly'
                  ? 'bg-white/20 text-white'
                  : 'bg-emerald-500/15 text-emerald-500',
              )}
            >
              وفر 40%
            </Badge>
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════
         بطاقات الفئات (3 فئات)
      ═══════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        {paidTiers.map((tier) => (
          <TierCard
            key={tier.id}
            tier={tier}
            duration={duration}
            currentTier={currentTier}
            onSelect={() => handleSelectTier(tier)}
          />
        ))}
      </div>

      {/* ═══════════════════════════════════════════
         طلباتي السابقة
      ═══════════════════════════════════════════ */}
      <MyRequests requests={requests} isLoading={requestsLoading} />

      {/* ═══════════════════════════════════════════
         Dialog: الدفع
      ═══════════════════════════════════════════ */}
      <PaymentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        selectedTier={selectedTier}
        duration={duration}
        paymentMethod={paymentMethod}
        onPaymentMethodChange={setPaymentMethod}
        refNumber={refNumber}
        onRefNumberChange={setRefNumber}
        copiedField={copiedField}
        onCopy={copyToClipboard}
        onSubmit={handleSubmit}
        submitting={submitting}
      />
    </>
  );
}

// ════════════════════════════════════════════════════════════
//  Current Subscription Card
// ════════════════════════════════════════════════════════════

function CurrentSubscriptionCard({ subscription, currentTier }) {
  const daysLeft = subscription?.days_left || 0;
  const isExpiringSoon = daysLeft > 0 && daysLeft <= 7;
  const isGift = subscription?.is_gift;

  return (
    <Card
      className={cn(
        'mb-6 p-5 border-2',
        currentTier === 'legendary' &&
          'border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-amber-500/10',
        currentTier === 'advanced' && 'border-slate-400/40 bg-slate-400/5',
        currentTier === 'basic' && 'border-amber-700/40 bg-amber-700/5',
      )}
    >
      <div className="flex items-start gap-4 flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl bg-background/60">
            {currentTier === 'legendary' && '👑'}
            {currentTier === 'advanced' && '🥈'}
            {currentTier === 'basic' && '🥉'}
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-1">اشتراكك الحالي</p>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-lg">
                فئة {currentTier === 'legendary' ? 'الأسطورية' : currentTier === 'advanced' ? 'المتقدمة' : 'الأساسية'}
              </h3>
              <TierBadge tier={currentTier} size="sm" />
              {isGift && (
                <Badge
                  variant="default"
                  size="sm"
                  className="bg-pink-500/15 text-pink-500 border-pink-500/30"
                >
                  <Gift className="w-3 h-3" />
                  هدية
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 ms-auto">
          <p className="text-xs text-muted-foreground">المتبقي</p>
          <p
            className={cn(
              'font-bold text-xl',
              isExpiringSoon && 'text-amber-500',
            )}
          >
            {formatDaysLeft(daysLeft)}
          </p>
          {subscription?.expires_at && (
            <p className="text-xs text-muted-foreground">
              ينتهي {formatDate(subscription.expires_at)}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

// ════════════════════════════════════════════════════════════
//  Tier Card
// ════════════════════════════════════════════════════════════

function TierCard({ tier, duration, currentTier, onSelect }) {
  const price = tier.pricing[duration];
  const monthlyEquivalent =
    duration === 'yearly' ? (price / 12).toFixed(2) : price.toFixed(2);
  const yearlyDiscount = tier.pricing.yearlyDiscount;

  const isCurrent = currentTier === tier.id;
  const isLegendary = tier.id === 'legendary';
  const isRecommended = tier.recommended;

  return (
    <Card
      className={cn(
        'relative p-6 transition-all hover:scale-[1.02] border-2',
        isLegendary &&
          'border-amber-500/40 bg-gradient-to-br from-amber-500/5 via-yellow-500/5 to-amber-500/5',
        tier.id === 'advanced' &&
          'border-violet-500/40 bg-gradient-to-br from-violet-500/5 to-pink-500/5',
        tier.id === 'basic' && 'border-border',
        isCurrent && 'ring-2 ring-emerald-500/50',
      )}
    >
      {/* ─── Badge موصى به / حالياً ─── */}
      {(isRecommended || isCurrent) && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          {isCurrent ? (
            <Badge
              variant="default"
              className="bg-emerald-500 text-white border-emerald-500"
            >
              <CheckCircle2 className="w-3 h-3" />
              اشتراكك الحالي
            </Badge>
          ) : (
            <Badge
              variant="default"
              className="lyn-gradient text-white border-0 shadow-lg"
            >
              <Sparkles className="w-3 h-3" />
              الأكثر شعبية
            </Badge>
          )}
        </div>
      )}

      {/* ─── Header ─── */}
      <div className="text-center mb-5">
        <div className="text-5xl mb-2">{tier.icon}</div>
        <h3 className="font-bold text-xl mb-1">فئة {tier.name}</h3>
        <p className="text-xs text-muted-foreground">{tier.description}</p>
      </div>

      {/* ─── السعر ─── */}
      <div className="text-center mb-5 pb-5 border-b border-border">
        <div className="flex items-baseline justify-center gap-1 mb-1">
          <span className="text-4xl font-bold">{formatPrice(price)}</span>
          <span className="text-sm text-muted-foreground">
            /{duration === 'yearly' ? 'سنة' : 'شهر'}
          </span>
        </div>

        {duration === 'yearly' && (
          <p className="text-xs text-emerald-500 font-medium">
            ≈ ${monthlyEquivalent}/شهر · وفر {yearlyDiscount}%
          </p>
        )}
      </div>

      {/* ─── المميزات ─── */}
      <ul className="space-y-2.5 mb-6">
        {tier.perks?.map((perk, idx) => (
          <li key={idx} className="flex items-start gap-2 text-sm">
            <Check
              className={cn(
                'w-4 h-4 mt-0.5 flex-shrink-0',
                isLegendary ? 'text-amber-500' : 'text-emerald-500',
              )}
            />
            <span>{perk}</span>
          </li>
        ))}
      </ul>

      {/* ─── زر الاشتراك ─── */}
      <Button
        onClick={onSelect}
        disabled={isCurrent}
        size="lg"
        className={cn(
          'w-full',
          isLegendary &&
            'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white',
          tier.id === 'advanced' && !isCurrent && 'lyn-gradient text-white',
          tier.id === 'basic' && !isCurrent && '',
        )}
        variant={tier.id === 'basic' ? 'outline' : 'default'}
      >
        {isCurrent ? (
          <>
            <CheckCircle2 className="w-4 h-4" />
            اشتراكك الحالي
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            اشترك الآن
          </>
        )}
      </Button>
    </Card>
  );
}

// ════════════════════════════════════════════════════════════
//  Payment Dialog
// ════════════════════════════════════════════════════════════

function PaymentDialog({
  open,
  onOpenChange,
  selectedTier,
  duration,
  paymentMethod,
  onPaymentMethodChange,
  refNumber,
  onRefNumberChange,
  copiedField,
  onCopy,
  onSubmit,
  submitting,
}) {
  if (!selectedTier) return null;

  const price = selectedTier.pricing[duration];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <span>
              اشتراك {selectedTier.name} {selectedTier.icon}
            </span>
          </DialogTitle>
          <DialogDescription>
            اختر طريقة الدفع، حوّل المبلغ، ثم الصق رقم العملية
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* ═══ ملخص ═══ */}
          <div className="rounded-xl bg-muted/40 border border-border p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">المبلغ المطلوب</span>
              <span className="text-2xl font-bold lyn-text-gradient num">
                {formatPrice(price)}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              مدة الاشتراك: {duration === 'yearly' ? 'سنة واحدة' : 'شهر واحد'}
            </div>
          </div>

          {/* ═══ طرق الدفع ═══ */}
          <Tabs value={paymentMethod} onValueChange={onPaymentMethodChange}>
            <TabsList variant="pills" className="grid grid-cols-3 w-full">
              {Object.values(PAYMENT_METHODS).map((m) => {
                const Icon = m.icon;
                return (
                  <TabsTrigger key={m.id} value={m.id} variant="pills">
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{m.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {Object.values(PAYMENT_METHODS).map((method) => (
              <TabsContent key={method.id} value={method.id} className="space-y-3 mt-4">
                <div className="space-y-2 pb-3 border-b border-border">
                  {method.info.bank && <InfoRow label="البنك" value={method.info.bank} />}
                  {method.info.iban && (
                    <InfoRow
                      label="IBAN"
                      value={method.info.iban}
                      mono
                      onCopy={() => onCopy(method.info.iban, `${method.id}-iban`)}
                      copied={copiedField === `${method.id}-iban`}
                    />
                  )}
                  {method.info.phone && (
                    <InfoRow
                      label="الجوال"
                      value={method.info.phone}
                      mono
                      onCopy={() => onCopy(method.info.phone, `${method.id}-phone`)}
                      copied={copiedField === `${method.id}-phone`}
                    />
                  )}
                  {method.info.accountName && (
                    <InfoRow label="الاسم" value={method.info.accountName} />
                  )}
                  {method.info.note && (
                    <div className="text-xs text-muted-foreground">{method.info.note}</div>
                  )}
                </div>

                <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
                  {method.steps.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ol>
              </TabsContent>
            ))}
          </Tabs>

          {/* ═══ رقم العملية ═══ */}
          <div className="space-y-2 pt-2 border-t border-border">
            <label className="text-sm font-medium block">رقم العملية</label>
            <Input
              value={refNumber}
              onChange={(e) => onRefNumberChange(e.target.value)}
              placeholder="مثال: 123456789"
              className="num text-center font-mono"
              maxLength={50}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              💡 رقم العملية يظهر في إشعار التحويل من البنك أو التطبيق
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            إلغاء
          </Button>
          <Button onClick={onSubmit} disabled={submitting || !refNumber.trim()}>
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                جاري الإرسال...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                إرسال الطلب
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InfoRow({ label, value, mono, onCopy, copied }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span
          className={cn('text-sm font-medium', mono && 'font-mono')}
          dir={mono ? 'ltr' : 'auto'}
        >
          {value}
        </span>
        {onCopy && (
          <button
            onClick={onCopy}
            className="p-1 rounded hover:bg-accent transition-colors"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-muted-foreground" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  My Requests
// ════════════════════════════════════════════════════════════

function MyRequests({ requests, isLoading }) {
  if (isLoading) {
    return <PageLoading variant="list" count={2} />;
  }

  if (!Array.isArray(requests) || requests.length === 0) {
    return null;
  }

  return (
    <div className="mt-8">
      <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
        <Clock className="w-5 h-5 text-muted-foreground" />
        طلباتي السابقة
        <Badge variant="outline" size="sm">
          {requests.length}
        </Badge>
      </h3>

      <div className="space-y-3">
        {requests.map((req) => {
          const StatusIcon =
            req.status === 'approved'
              ? CheckCircle2
              : req.status === 'rejected'
              ? XCircle
              : Clock;

          return (
            <Card key={req.id} className="p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                      req.status === 'approved' && 'bg-emerald-500/15 text-emerald-500',
                      req.status === 'rejected' && 'bg-rose-500/15 text-rose-500',
                      req.status === 'pending' && 'bg-amber-500/15 text-amber-500',
                    )}
                  >
                    <StatusIcon className="w-5 h-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <TierBadge tier={req.tier} size="sm" />
                      <Badge
                        variant="default"
                        size="sm"
                        className={cn('border', REQUEST_STATUS_COLORS[req.status])}
                      >
                        {REQUEST_STATUS_LABELS[req.status]}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {req.duration === 'yearly' ? 'سنوي' : 'شهري'}
                      </span>
                    </div>

                    <div className="text-xs text-muted-foreground flex items-center gap-3 flex-wrap">
                      <span>{formatPrice(parseFloat(req.amount))}</span>
                      <span>•</span>
                      <span>رقم العملية: {req.ref_number}</span>
                      <span>•</span>
                      <span>{formatDate(req.created_at)}</span>
                    </div>

                    {req.admin_note && (
                      <p className="text-xs mt-2 pt-2 border-t border-border/50 text-muted-foreground">
                        <span className="font-medium">ملاحظات الإدارة:</span>{' '}
                        {req.admin_note}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
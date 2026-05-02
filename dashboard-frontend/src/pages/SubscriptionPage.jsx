import { useEffect, useState } from 'react';
import {
  CreditCard,
  Calendar,
  Check,
  X,
  Receipt,
  Sparkles,
  Crown,
  Diamond,
  Medal,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Switch } from '@/components/ui/Switch';
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
import { mock } from '@/lib/mock';
import { PLANS, PLAN_TIERS, PLAN_ORDER } from '@/lib/plans';
import { formatDate, formatRelativeTime, cn } from '@/lib/utils';
import { toast } from 'sonner';

const PLAN_ICONS = {
  free: Sparkles,
  silver: Medal,
  gold: Crown,
  diamond: Diamond,
};

export default function SubscriptionPage() {
  const [data, setData] = useState(null);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [transactionId, setTransactionId] = useState('');

  useEffect(() => {
    mock.subscriptionInfo().then(setData);
  }, []);

  const handleSubmitRequest = () => {
    if (!transactionId.trim()) return;
    toast.success(`تم إرسال طلب الاشتراك في ${PLANS[selectedPlan].name}`);
    setTransactionId('');
    setShowRequestDialog(false);
    setSelectedPlan(null);
  };

  const handleToggleAutoRenew = (value) => {
    setData((prev) => ({ ...prev, autoRenew: value }));
    toast.success(value ? 'تم تفعيل التجديد التلقائي' : 'تم إيقاف التجديد التلقائي');
  };

  if (!data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-80 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const currentPlan = PLANS[data.currentPlan];
  const Icon = PLAN_ICONS[data.currentPlan];

  return (
    <>
      <SettingsPageHeader
        icon={<CreditCard />}
        title="الاشتراك"
        description="إدارة خطتك ومدفوعاتك"
      />

      {/* Current Plan Card */}
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
              <Badge variant={currentPlan.color}>الحالية</Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              {currentPlan.description}
            </p>

            <div className="flex items-center gap-4 flex-wrap text-sm">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">ينتهي:</span>
                <span className="font-bold">{formatDate(data.expiresAt)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">المتبقي:</span>
                <Badge
                  variant={data.daysRemaining <= 7 ? 'warning' : 'success'}
                  size="default"
                >
                  <span className="num">{data.daysRemaining}</span> يوم
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-card/60 backdrop-blur">
            <div>
              <div className="text-sm font-medium">التجديد التلقائي</div>
              <div className="text-xs text-muted-foreground">
                {data.autoRenew ? 'مفعّل' : 'معطّل'}
              </div>
            </div>
            <Switch
              checked={data.autoRenew}
              onCheckedChange={handleToggleAutoRenew}
            />
          </div>
        </div>
      </Card>

      {/* Plans Comparison */}
      <h2 className="text-lg font-bold mb-3">قارن الخطط</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {PLAN_ORDER.map((planId) => {
          const plan = PLANS[planId];
          const PlanIcon = PLAN_ICONS[planId];
          const isCurrent = planId === data.currentPlan;
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
                  onClick={() => {
                    setSelectedPlan(planId);
                    setShowRequestDialog(true);
                  }}
                >
                  اشترك
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

      {/* Payment History */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Receipt className="w-5 h-5 text-primary" />
          <h2 className="font-bold">سجل المدفوعات</h2>
        </div>

        {data.paymentHistory.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            لا توجد مدفوعات سابقة
          </p>
        ) : (
          <div className="space-y-2">
            {data.paymentHistory.map((payment) => {
              const plan = PLANS[payment.plan];
              return (
                <div
                  key={payment.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border"
                >
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center flex-shrink-0">
                    <Check className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">
                      {plan.name} {plan.icon}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      منذ {formatRelativeTime(payment.date)} • TX:{' '}
                      <span className="ltr font-mono">{payment.txId}</span>
                    </div>
                  </div>
                  <div className="text-end">
                    <div className="font-bold num">
                      {payment.amount > 0 ? `${payment.amount} ريال` : 'مجاناً'}
                    </div>
                    <Badge variant="success" size="sm">
                      مكتمل
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Subscribe Dialog */}
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
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  placeholder="رقم العملية..."
                  className="num"
                />
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowRequestDialog(false)}
                  className="flex-1"
                >
                  إلغاء
                </Button>
                <Button
                  onClick={handleSubmitRequest}
                  disabled={!transactionId.trim()}
                  className="flex-1"
                >
                  <Sparkles className="w-4 h-4" />
                  إرسال الطلب
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

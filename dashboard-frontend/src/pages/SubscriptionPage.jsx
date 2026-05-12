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
  Link2,
  Link2Off,
  Server,
  Loader2,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
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
import { apiClient } from '@/api/client';
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
      'افتح تطبيق الراجحي وحوّل المبلغ للـ IBAN أعلاه',
      'انسخ رقم العملية من إشعار التحويل',
      'الصق رقم العملية في الخانة أدناه واضغط إرسال',
    ],
  },
  stc: {
    id: 'stc',
    label: 'STC Pay',
    icon: Smartphone,
    color: 'text-pink-500',
    bg: 'bg-pink-500/10 border-pink-500/30',
    info: {
      phone: '0509999999',
      accountName: ACCOUNT_NAME,
    },
    steps: [
      'افتح تطبيق STC Pay وحوّل المبلغ للرقم أعلاه',
      'انسخ رقم العملية من إشعار التحويل',
      'الصق رقم العملية في الخانة أدناه واضغط إرسال',
    ],
  },
  applepay: {
    id: 'applepay',
    label: 'Apple Pay',
    icon: Apple,
    color: 'text-slate-300',
    bg: 'bg-slate-500/10 border-slate-500/30',
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

const STATUS_META = {
  pending:  { label: 'قيد المراجعة', Icon: Clock,        color: 'text-amber-500',   bg: 'bg-amber-500/10 border-amber-500/30' },
  approved: { label: 'تم القبول',    Icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/30' },
  rejected: { label: 'مرفوض',         Icon: XCircle,      color: 'text-rose-500',    bg: 'bg-rose-500/10 border-rose-500/30' },
};

// ════════════════════════════════════════════════════════════
//  Page
// ════════════════════════════════════════════════════════════

export default function SubscriptionPage() {
  const { user, guilds: storeGuilds } = useAuthStore();

  const [subscription, setSubscription] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('rajhi');
  const [refNumber, setRefNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [copiedField, setCopiedField] = useState(null);

  // ── Guild linking state ──
  const [guilds, setGuilds] = useState(null);
  const [botGuildIds, setBotGuildIds] = useState([]);
  const [linkedGuildId, setLinkedGuildId] = useState(null);
  const [selectedGuildToLink, setSelectedGuildToLink] = useState('');
  const [linkBusy, setLinkBusy] = useState(false);
  const [unlinkDialog, setUnlinkDialog] = useState(false);

  // ────────────────────────────────────────────────────────
  //  Load subscription + history + guilds
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

  // ── جلب البوت guilds + إيدي السيرفر المربوط ──
  const loadGuilds = async () => {
    try {
      const userGuilds = storeGuilds || [];
      const botIds = await apiClient.get('/api/bot/guilds').catch(() => []);
      const botList = Array.isArray(botIds) ? botIds : [];

      console.log('[LINK] user guilds:', userGuilds.length);
      console.log('[LINK] bot guilds:', botList.length);
      console.log('[LINK] sample user guild:', userGuilds[0]);

      setBotGuildIds(botList);
      setGuilds(Array.isArray(userGuilds) ? userGuilds : []);

      // ابحث عن السيرفر المربوط حالياً
      const eligible = userGuilds.filter((g) => botList.includes(g.id));

      for (const g of eligible) {
        try {
          const planData = await apiClient.get(`/api/guild/${g.id}/plan`).catch(() => null);
          const linkedOwner = planData?.owner_id || planData?.linked_owner_id;
          if (linkedOwner === user.id) {
            setLinkedGuildId(g.id);
            break;
          }
        } catch {
          // skip
        }
      }
    } catch (err) {
      console.error('Load guilds failed:', err);
      setGuilds([]);
    }
  };

  useEffect(() => {
    loadData();
    loadGuilds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, storeGuilds]);

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
  //  Guild linking handlers
  // ────────────────────────────────────────────────────────

  const handleLink = async () => {
    if (!selectedGuildToLink) {
      toast.error('اختر سيرفر أولاً');
      return;
    }

    setLinkBusy(true);
    try {
      await subscriptionApi.linkGuild(selectedGuildToLink);
      toast.success('تم ربط الاشتراك بالسيرفر بنجاح');
      setLinkedGuildId(selectedGuildToLink);
      setSelectedGuildToLink('');
    } catch (err) {
      const code = err?.code;
      if (code === 'NO_SUBSCRIPTION') {
        toast.error('ما عندك اشتراك نشط');
      } else if (code === 'ALREADY_LINKED') {
        toast.error('اشتراكك مربوط بسيرفر آخر — فك الربط أولاً');
      } else {
        toast.error(err?.message || 'فشل الربط');
      }
    } finally {
      setLinkBusy(false);
    }
  };

  const handleUnlink = async () => {
    if (!linkedGuildId) return;

    setLinkBusy(true);
    try {
      await subscriptionApi.unlinkGuild(linkedGuildId);
      toast.success('تم فك ربط الاشتراك');
      setLinkedGuildId(null);
      setUnlinkDialog(false);
    } catch (err) {
      toast.error(err?.message || 'فشل فك الربط');
    } finally {
      setLinkBusy(false);
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

  // ── سيرفرات اللي يقدر يربط فيها ──
  // الشرط: البوت موجود + (owner أو admin أو manage_guild)
  const eligibleGuilds = (guilds || []).filter((g) => {
    if (!botGuildIds.includes(g.id)) return false;
    if (g.id === linkedGuildId) return false;

    // مالك السيرفر
    if (g.owner === true) return true;

    // فحص الصلاحيات
    try {
      const perms = BigInt(g.permissions || g.permissions_new || 0);
      const ADMINISTRATOR = BigInt(0x8);
      const MANAGE_GUILD = BigInt(0x20);
      if ((perms & ADMINISTRATOR) === ADMINISTRATOR) return true;
      if ((perms & MANAGE_GUILD) === MANAGE_GUILD) return true;
    } catch {
      // permissions غير صالحة — استبعد
    }

    return false;
  });

  const linkedGuild = linkedGuildId
    ? (guilds || []).find((g) => g.id === linkedGuildId)
    : null;

  // ── هل يقدر يربط؟ (لازم يكون مشترك مدفوع) ──
  const canLink = isActive && currentPlanId !== 'free';

  return (
    <div className="space-y-8">
      <SettingsPageHeader
        icon={<CreditCard />}
        title="الاشتراك"
        description="إدارة خطتك ودفعاتك وربطها بسيرفرك"
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

      {/* ════════════════════════════════════════════════════════ */}
      {/*  Guild Linking Card                                       */}
      {/* ════════════════════════════════════════════════════════ */}
      <Card className="p-6">
        <div className="flex items-start gap-3 mb-5">
          <div
            className={cn(
              'w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0',
              linkedGuild
                ? 'bg-emerald-500/10 text-emerald-500'
                : canLink
                  ? 'lyn-gradient text-white'
                  : 'bg-muted text-muted-foreground',
            )}
          >
            <Server className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold mb-1">ربط الاشتراك بسيرفر</h3>
            <p className="text-sm text-muted-foreground">
              اربط اشتراكك بسيرفر واحد لتفعيل ميزات الخطة فيه (اشتراك واحد = سيرفر واحد)
            </p>
          </div>
        </div>

        {/* ── حالة 1: ما عنده اشتراك مدفوع ── */}
        {!canLink && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-sm mb-1">تحتاج اشتراك مدفوع</p>
                <p className="text-xs text-muted-foreground">
                  ترقّى لخطة فضي، ذهبي، أو ماسي أولاً، بعدها تقدر تربط الاشتراك بسيرفرك
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── حالة 2: مربوط بسيرفر ── */}
        {canLink && linkedGuild && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
            <div className="flex items-center gap-3 mb-3">
              {linkedGuild.icon ? (
                <img
                  src={`https://cdn.discordapp.com/icons/${linkedGuild.id}/${linkedGuild.icon}.png?size=64`}
                  alt={linkedGuild.name}
                  className="w-12 h-12 rounded-xl"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl lyn-gradient flex items-center justify-center text-white text-sm font-bold">
                  {linkedGuild.name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-emerald-500" />
                  <span className="font-bold truncate">{linkedGuild.name}</span>
                </div>
                <p className="text-xs text-muted-foreground font-mono num">
                  {linkedGuild.id}
                </p>
              </div>
              <Badge variant="success" size="sm">
                {getPlanInfo(currentPlanId).name}
              </Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUnlinkDialog(true)}
              className="w-full"
              disabled={linkBusy}
            >
              <Link2Off className="w-4 h-4" />
              فك الربط
            </Button>
          </div>
        )}

        {/* ── حالة 3: مشترك لكن ما ربط أي سيرفر ── */}
        {canLink && !linkedGuild && (
          <div className="space-y-3">
            {eligibleGuilds.length === 0 ? (
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm mb-1">ما في سيرفر متاح للربط</p>
                    <p className="text-xs text-muted-foreground">
                      تحتاج تكون مالك أو إدمن في سيرفر فيه البوت Lyn. أضف البوت لسيرفرك من صفحة السيرفرات.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <label className="text-sm font-medium block">اختر السيرفر</label>
                <Select
                  value={selectedGuildToLink}
                  onValueChange={setSelectedGuildToLink}
                  disabled={linkBusy}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر سيرفر..." />
                  </SelectTrigger>
                  <SelectContent>
                    {eligibleGuilds.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  onClick={handleLink}
                  disabled={!selectedGuildToLink || linkBusy}
                  className="w-full"
                >
                  {linkBusy ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      جاري الربط...
                    </>
                  ) : (
                    <>
                      <Link2 className="w-4 h-4" />
                      اربط الاشتراك بهذا السيرفر
                    </>
                  )}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  💡 تقدر تفك الربط وتنقل الاشتراك لسيرفر ثاني في أي وقت
                </p>
              </>
            )}
          </div>
        )}
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
              اختر طريقة الدفع وحوّل المبلغ، ثم الصق رقم العملية
            </DialogDescription>
          </DialogHeader>

          {selectedPlan && (
            <div className="space-y-4 py-2">
              {/* Plan Summary */}
              <div className="rounded-xl bg-muted/40 border border-border p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">المبلغ المطلوب</span>
                  <span className="text-2xl font-bold lyn-text-gradient num">
                    {getPlanInfo(selectedPlan).priceLabel}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  مدة الاشتراك: شهر واحد — قابل للتجديد
                </div>
              </div>

              {/* Payment Method Tabs */}
              <Tabs value={paymentMethod} onValueChange={setPaymentMethod}>
                <TabsList variant="pills" className="grid grid-cols-3 w-full">
                  {Object.values(PAYMENT_METHODS).map((m) => {
                    const Icon = m.icon;
                    return (
                      <TabsTrigger key={m.id} value={m.id} variant="pills">
                        <Icon className="w-4 h-4" />
                        <span>{m.label}</span>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>

                {Object.values(PAYMENT_METHODS).map((method) => {
                  const Icon = method.icon;
                  return (
                    <TabsContent key={method.id} value={method.id} className="space-y-3 mt-4">
                      <div
                        className={cn(
                          'rounded-xl border p-4 space-y-3',
                          method.bg,
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <Icon className={cn('w-5 h-5', method.color)} />
                          <span className="font-bold">{method.label}</span>
                        </div>

                        {method.info.bank && (
                          <InfoRow
                            label="البنك"
                            value={method.info.bank}
                            onCopy={() => copyToClipboard(method.info.bank, `${method.id}-bank`)}
                            copied={copiedField === `${method.id}-bank`}
                          />
                        )}
                        {method.info.iban && (
                          <InfoRow
                            label="IBAN"
                            value={method.info.iban}
                            mono
                            onCopy={() => copyToClipboard(method.info.iban, `${method.id}-iban`)}
                            copied={copiedField === `${method.id}-iban`}
                          />
                        )}
                        {method.info.phone && (
                          <InfoRow
                            label="الرقم"
                            value={method.info.phone}
                            mono
                            onCopy={() => copyToClipboard(method.info.phone, `${method.id}-phone`)}
                            copied={copiedField === `${method.id}-phone`}
                          />
                        )}
                        {method.info.accountName && (
                          <InfoRow
                            label="الاسم"
                            value={method.info.accountName}
                          />
                        )}
                        {method.info.note && (
                          <div className="text-xs text-muted-foreground">
                            {method.info.note}
                          </div>
                        )}
                      </div>

                      <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
                        {method.steps.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ol>
                    </TabsContent>
                  );
                })}
              </Tabs>

              {/* Reference Number Input */}
              <div className="space-y-2 pt-2 border-t border-border">
                <label className="text-sm font-medium block">رقم العملية</label>
                <Input
                  value={refNumber}
                  onChange={(e) => setRefNumber(e.target.value)}
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
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
              إلغاء
            </Button>
            <Button onClick={handleSubmit} disabled={submitting || !refNumber.trim()}>
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

      {/* ── Unlink confirm dialog ── */}
      <Dialog open={unlinkDialog} onOpenChange={setUnlinkDialog}>
        <DialogContent>
          <div className="flex justify-center -mt-4 mb-2">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Link2Off className="w-8 h-8" />
            </div>
          </div>
          <DialogHeader>
            <DialogTitle className="text-center">فك ربط الاشتراك؟</DialogTitle>
            <DialogDescription className="text-center">
              راح يرجع السيرفر <span className="font-bold">{linkedGuild?.name}</span> للخطة المجانية،
              وتقدر تربط الاشتراك بسيرفر ثاني بعدها
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnlinkDialog(false)} disabled={linkBusy} className="flex-1">
              إلغاء
            </Button>
            <Button onClick={handleUnlink} disabled={linkBusy} className="flex-1" variant="destructive">
              {linkBusy ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Link2Off className="w-4 h-4" />
              )}
              تأكيد فك الربط
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  Sub-components
// ════════════════════════════════════════════════════════════

function InfoRow({ label, value, mono = false, onCopy, copied }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-muted-foreground">{label}:</span>
      <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
        <span className={cn('text-sm truncate', mono && 'font-mono num')}>{value}</span>
        {onCopy && (
          <button
            onClick={onCopy}
            className="p-1 rounded hover:bg-background/50 transition-colors flex-shrink-0"
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
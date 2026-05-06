import { useState } from 'react';
import {
  Layers,
  Sparkles,
  Check,
  AlertTriangle,
  Star,
  Loader2,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
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
import { usePlanGate } from '@/hooks/usePlanGate';
import { useGuildStore } from '@/store/guildStore';
import { settingsApi } from '@/api';
import { PLAN_TIERS } from '@/lib/plans';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ════════════════════════════════════════════════════════════
//  PRESETS — قوالب جاهزة (client-side)
//  كل preset يحدد إعدادات كل نظام يأثر عليه + apply() يطبقها
// ════════════════════════════════════════════════════════════

const PRESETS = [
  {
    id: 'gaming',
    name: 'سيرفر جيمنج',
    icon: '🎮',
    gradient: 'from-violet-500 to-purple-600',
    popular: true,
    description: 'إعدادات مثالية لسيرفرات الألعاب — حماية متوسطة + xp فعّال + لوقات أساسية',
    changes: [
      'تفعيل XP بمعدل x1.2',
      'حماية ضد Spam (5 رسائل/5ث)',
      'حماية ضد Raid (10 انضمام/30ث)',
      'لوقات أساسية مفعّلة',
    ],
    systemsAffected: ['XP', 'الحماية', 'اللوق'],
    requiredPlan: 'silver',
    apply: async (guildId) => {
      await Promise.all([
        settingsApi.saveXp(guildId, {
          enabled: true,
          xp_multiplier: 1.2,
          min_xp_per_message: 15,
          max_xp_per_message: 25,
          cooldown: 60,
        }),
        settingsApi.saveProtection(guildId, {
          anti_spam: { enabled: true, maxMessages: 5, timeWindow: 5, action: 'mute' },
          anti_raid: { enabled: true, maxJoins: 10, timeWindow: 30, action: 'lockdown' },
          anti_nuke: { enabled: false },
        }),
        settingsApi.saveLogs(guildId, {
          enabled: true,
          events: {
            messageDelete: { enabled: true },
            messageEdit: { enabled: true },
            memberJoin: { enabled: true },
            memberLeave: { enabled: true },
          },
        }),
      ]);
    },
  },
  {
    id: 'community',
    name: 'سيرفر مجتمع',
    icon: '👥',
    gradient: 'from-pink-500 to-rose-500',
    popular: true,
    description: 'مثالي للمجتمعات النشطة — XP، اقتصاد، ترحيب جذاب',
    changes: [
      'XP مفعّل (معدل عادي)',
      'اقتصاد كامل بمكافآت يومية',
      'ترحيب وأودعة مفعّلين',
      'حماية متوسطة',
    ],
    systemsAffected: ['XP', 'الاقتصاد', 'الترحيب', 'الحماية'],
    requiredPlan: 'gold',
    apply: async (guildId) => {
      await Promise.all([
        settingsApi.saveXp(guildId, {
          enabled: true,
          xp_multiplier: 1,
          min_xp_per_message: 15,
          max_xp_per_message: 25,
        }),
        settingsApi.saveEconomy(guildId, {
          enabled: true,
          currency_symbol: '🪙',
          currency_name: 'كوينز',
          daily_reward: { min: 100, max: 500 },
          weekly_reward: { min: 1000, max: 5000 },
          starting_balance: 100,
        }),
        settingsApi.saveWelcome(guildId, {
          enabled: true,
          leave_enabled: true,
          mention_user: true,
        }),
        settingsApi.saveProtection(guildId, {
          anti_spam: { enabled: true, maxMessages: 7, timeWindow: 5, action: 'mute' },
          anti_raid: { enabled: true, maxJoins: 15, timeWindow: 60, action: 'lockdown' },
        }),
      ]);
    },
  },
  {
    id: 'security',
    name: 'حماية قصوى',
    icon: '🛡️',
    gradient: 'from-rose-500 to-red-600',
    description: 'لما تبي أعلى مستوى حماية — مناسب للسيرفرات الكبيرة المعرضة للهجوم',
    changes: [
      'Anti-Spam صارم (3 رسائل/5ث)',
      'Anti-Raid قوي (5 انضمام/30ث)',
      'Anti-Nuke مفعّل بالكامل',
      'لوقات شاملة لكل الأحداث',
    ],
    systemsAffected: ['الحماية', 'اللوق'],
    requiredPlan: 'gold',
    apply: async (guildId) => {
      await Promise.all([
        settingsApi.saveProtection(guildId, {
          anti_spam: { enabled: true, maxMessages: 3, timeWindow: 5, action: 'mute' },
          anti_raid: { enabled: true, maxJoins: 5, timeWindow: 30, action: 'lockdown' },
          anti_nuke: {
            enabled: true,
            maxChannelDeletes: 2,
            maxRoleDeletes: 2,
            maxBans: 3,
          },
        }),
        settingsApi.saveLogs(guildId, {
          enabled: true,
          events: {
            messageDelete: { enabled: true },
            messageEdit: { enabled: true },
            memberJoin: { enabled: true },
            memberLeave: { enabled: true },
            memberBan: { enabled: true },
            memberKick: { enabled: true },
            roleCreate: { enabled: true },
            roleDelete: { enabled: true },
            channelCreate: { enabled: true },
            channelDelete: { enabled: true },
          },
        }),
      ]);
    },
  },
  {
    id: 'minimal',
    name: 'بسيط ونظيف',
    icon: '✨',
    gradient: 'from-slate-400 to-slate-600',
    description: 'إعدادات خفيفة بدون تعقيد — مناسب للسيرفرات الصغيرة',
    changes: [
      'حماية أساسية ضد Spam',
      'ترحيب مفعّل',
      'بدون XP أو اقتصاد',
      'لوقات أساسية فقط',
    ],
    systemsAffected: ['الحماية', 'الترحيب', 'اللوق'],
    requiredPlan: 'silver',
    apply: async (guildId) => {
      await Promise.all([
        settingsApi.saveProtection(guildId, {
          anti_spam: { enabled: true, maxMessages: 8, timeWindow: 10, action: 'mute' },
          anti_raid: { enabled: false },
          anti_nuke: { enabled: false },
        }),
        settingsApi.saveWelcome(guildId, {
          enabled: true,
          mention_user: true,
        }),
        settingsApi.saveLogs(guildId, {
          enabled: true,
          events: {
            memberJoin: { enabled: true },
            memberLeave: { enabled: true },
            memberBan: { enabled: true },
          },
        }),
      ]);
    },
  },
];

export default function TemplatesPage() {
  const { selectedGuildId } = useGuildStore();
  const [confirmApply, setConfirmApply] = useState(null);
  const [applying, setApplying] = useState(false);

  const planGate = usePlanGate('templates', PLAN_TIERS.SILVER);

  const handleApply = async () => {
    if (!confirmApply || !selectedGuildId) return;
    setApplying(true);
    try {
      await confirmApply.apply(selectedGuildId);
      toast.success(`تم تطبيق قالب "${confirmApply.name}"`);
      setConfirmApply(null);
    } catch (err) {
      if (err.code === 'PLAN_REQUIRED') {
        toast.error('بعض الإعدادات تحتاج خطة أعلى');
      } else {
        toast.error(err.message || 'فشل تطبيق القالب');
      }
    } finally {
      setApplying(false);
    }
  };

  return (
    <>
      <SettingsPageHeader
        icon={<Layers />}
        title="القوالب الجاهزة"
        description="طبّق إعدادات سيرفر كاملة بضغطة واحدة"
        plan="silver"
      />

      {planGate.isLocked && (
        <PlanLockBanner
          currentPlan={planGate.currentPlan}
          requiredPlan={planGate.requiredPlan}
          featureName="القوالب"
          className="mb-6"
        />
      )}

      {!selectedGuildId ? (
        <Card className="p-8">
          <EmptyState
            icon={<Layers />}
            title="اختر سيرفر أولاً"
            description="ارجع لصفحة السيرفرات واختر سيرفر لتطبيق القوالب عليه"
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PRESETS.map((tpl) => (
            <Card
              key={tpl.id}
              className="overflow-hidden hover:border-border/80 transition-colors group"
            >
              <div
                className={cn(
                  'h-24 bg-gradient-to-br relative flex items-center justify-center',
                  tpl.gradient,
                )}
              >
                <div className="text-5xl">{tpl.icon}</div>
                {tpl.popular && (
                  <Badge variant="lyn" size="sm" className="absolute top-3 end-3">
                    <Star className="w-3 h-3" />
                    شائع
                  </Badge>
                )}
              </div>

              <div className="p-5">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-bold text-lg">{tpl.name}</h3>
                  {tpl.requiredPlan && tpl.requiredPlan !== 'silver' && (
                    <Badge variant="warning" size="sm">
                      {tpl.requiredPlan}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {tpl.description}
                </p>

                <div className="space-y-1.5 mb-4">
                  {tpl.changes.map((change, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                      <span className="text-muted-foreground">{change}</span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-1.5 mb-4">
                  {tpl.systemsAffected.map((sys) => (
                    <Badge key={sys} variant="default" size="sm">
                      {sys}
                    </Badge>
                  ))}
                </div>

                <Button
                  className="w-full"
                  onClick={planGate.gateAction(() => setConfirmApply(tpl))}
                >
                  <Sparkles className="w-4 h-4" />
                  تطبيق القالب
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ═══ Apply Confirm ═══ */}
      <Dialog
        open={!!confirmApply}
        onOpenChange={(v) => !v && !applying && setConfirmApply(null)}
      >
        <DialogContent className="sm:max-w-md">
          <div className="flex justify-center -mt-4 mb-2">
            <div
              className={cn(
                'w-16 h-16 rounded-2xl bg-gradient-to-br flex items-center justify-center text-3xl',
                confirmApply?.gradient,
              )}
            >
              {confirmApply?.icon}
            </div>
          </div>
          <DialogHeader>
            <DialogTitle className="text-center">
              تطبيق قالب "{confirmApply?.name}"؟
            </DialogTitle>
            <DialogDescription className="text-center">
              راح تتغير الإعدادات التالية
            </DialogDescription>
          </DialogHeader>

          <div className="bg-amber-500/5 border border-amber-500/30 rounded-xl p-3 my-2 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              هذا القالب راح يستبدل إعدادات الأنظمة:{' '}
              <span className="font-bold text-foreground">
                {confirmApply?.systemsAffected?.join('، ')}
              </span>
              . إعداداتك الحالية في هذي الأنظمة راح تنحفظ في سجل الأنشطة قبل الاستبدال.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmApply(null)}
              className="flex-1"
              disabled={applying}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleApply}
              className="flex-1"
              disabled={applying}
            >
              {applying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  جاري التطبيق...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  نعم، طبّق
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
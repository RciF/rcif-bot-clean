import { Shield, ShieldCheck, ShieldAlert, Lock } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { Separator } from '@/components/ui/Separator';
import { SettingsPageHeader } from '@/components/shared/SettingsPageHeader';
import { SaveBar } from '@/components/shared/SaveBar';
import { PlanLockBanner, PlanLockModal } from '@/components/shared/PlanLockOverlay';
import { ChannelPicker } from '@/components/shared/ChannelPicker';
import { RolePicker } from '@/components/shared/RolePicker';
import { MemberPicker } from '@/components/shared/MemberPicker';
import { useGuildSettings } from '@/hooks/useGuildSettings';
import { usePlanGate } from '@/hooks/usePlanGate';
import { mock } from '@/lib/mock';
import { PLAN_TIERS } from '@/lib/plans';
import { cn } from '@/lib/utils';

import { AntiSpamCard } from './protection/AntiSpamCard';
import { AntiRaidCard } from './protection/AntiRaidCard';
import { AntiNukeCard } from './protection/AntiNukeCard';
import { LockdownCard } from './protection/LockdownCard';

export default function ProtectionPage() {
  const { data, setData, updateField, isLoading, isSaving, isDirty, save, reset } =
    useGuildSettings({ section: 'protection', fetcher: mock.protectionSettings });

  const planGate = usePlanGate('protection', PLAN_TIERS.SILVER);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-start gap-4 pb-6 mb-6 border-b border-border">
          <Skeleton className="w-12 h-12 rounded-2xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (!data) return null;
  const handleSave = planGate.gateAction(save);

  const activeShieldsCount = [data.antiSpam.enabled, data.antiRaid.enabled, data.antiNuke.enabled].filter(Boolean).length;

  return (
    <>
      <SettingsPageHeader
        icon={<Shield />}
        title="نظام الحماية"
        description="حماية شاملة من السبام والريد والهجمات"
        plan="gold"
      />

      {planGate.isLocked && (
        <PlanLockBanner
          currentPlan={planGate.currentPlan}
          requiredPlan={planGate.requiredPlan}
          featureName="نظام الحماية"
          className="mb-6"
        />
      )}

      {/* Server Status */}
      <Card
        className={cn(
          'p-5 mb-4 border-2',
          data.isLocked ? 'border-destructive/50 bg-destructive/5'
            : activeShieldsCount === 3 ? 'border-emerald-500/50 bg-emerald-500/5'
            : 'border-amber-500/50 bg-amber-500/5',
        )}
      >
        <div className="flex items-center gap-4">
          <div
            className={cn(
              'w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0',
              data.isLocked ? 'bg-destructive/20 text-destructive'
                : activeShieldsCount === 3 ? 'bg-emerald-500/20 text-emerald-500'
                : 'bg-amber-500/20 text-amber-500',
            )}
          >
            {data.isLocked ? <Lock className="w-7 h-7" /> : activeShieldsCount === 3 ? <ShieldCheck className="w-7 h-7" /> : <ShieldAlert className="w-7 h-7" />}
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="font-bold text-lg">
                {data.isLocked ? 'السيرفر في وضع الإغلاق' : activeShieldsCount === 3 ? 'السيرفر محمي بالكامل' : 'الحماية جزئية'}
              </h3>
              <Badge variant={data.isLocked ? 'danger' : activeShieldsCount === 3 ? 'success' : 'warning'}>
                {activeShieldsCount} / 3 درع نشط
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {data.isLocked ? 'الأعضاء الجدد ممنوعين من الانضمام'
                : activeShieldsCount === 3 ? 'كل أنظمة الحماية الثلاثة مفعّلة'
                : 'يفضل تفعيل كل الدروع لحماية كاملة'}
            </p>
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        <AntiSpamCard data={data.antiSpam} updateField={updateField} />
        <AntiRaidCard data={data.antiRaid} updateField={updateField} />
        <AntiNukeCard data={data.antiNuke} updateField={updateField} />

        {/* Log Channel + Whitelist */}
        <Card className="p-5">
          <div className="mb-4">
            <h3 className="font-bold mb-1">قناة سجل الحماية والقائمة البيضاء</h3>
            <p className="text-sm text-muted-foreground">
              قناة لوق الحماية + استثناء رتب وأعضاء من نظام الحماية
            </p>
          </div>
          <Separator className="mb-4" />

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">قناة سجل الحماية</label>
              <ChannelPicker
                value={data.logChannel}
                onChange={(v) => updateField('logChannel', v)}
                types={[0, 5]}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">رتب محصنة</label>
              <RolePicker
                value={data.whitelist?.roles || []}
                onChange={(v) => updateField('whitelist.roles', v)}
                multiple
                placeholder="اختر الرتب المحصنة..."
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">أعضاء محصنون</label>
              <MemberPicker
                value={data.whitelist?.members || []}
                onChange={(v) => updateField('whitelist.members', v)}
                multiple
                placeholder="اختر الأعضاء المحصنين..."
              />
            </div>
          </div>
        </Card>

        <LockdownCard data={data} updateField={updateField} setData={setData} />
      </div>

      <SaveBar
        isDirty={isDirty}
        isSaving={isSaving}
        onSave={handleSave}
        onReset={reset}
        locked={planGate.isLocked}
        onLockedClick={planGate.openLockModal}
      />
      <PlanLockModal {...planGate.lockModalProps} />
    </>
  );
}

import { Shield } from 'lucide-react';
import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton';
import { SettingsPageHeader } from '@/components/shared/SettingsPageHeader';
import { SaveBar } from '@/components/shared/SaveBar';
import { PlanLockBanner, PlanLockModal } from '@/components/shared/PlanLockOverlay';
import { useGuildSettings } from '@/hooks/useGuildSettings';
import { usePlanGate } from '@/hooks/usePlanGate';
import { PLAN_TIERS } from '@/lib/plans';

import { AntiSpamCard } from './protection/AntiSpamCard';
import { AntiRaidCard } from './protection/AntiRaidCard';
import { AntiNukeCard } from './protection/AntiNukeCard';
import { LockdownCard } from './protection/LockdownCard';

export default function ProtectionPage() {
  const { data, updateField, isLoading, isSaving, isDirty, save, reset } =
    useGuildSettings({ section: 'protection' });

  const planGate = usePlanGate('protection', PLAN_TIERS.SILVER);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 rounded-2xl" />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (!data) return null;

  const handleSave = planGate.gateAction(save);

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

      <div className="space-y-4">
        <AntiSpamCard data={data} updateField={updateField} />
        <AntiRaidCard data={data} updateField={updateField} />
        <AntiNukeCard data={data} updateField={updateField} />
        <LockdownCard data={data} updateField={updateField} />
      </div>

      <SaveBar isDirty={isDirty} isSaving={isSaving} onSave={handleSave} onReset={reset} />

      <PlanLockModal {...planGate.lockModalProps} featureName="نظام الحماية" />
    </>
  );
}

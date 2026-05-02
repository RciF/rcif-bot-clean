import { useState } from 'react';
import { TrendingUp, Sparkles, Trophy, Settings as SettingsIcon } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton';
import { SettingsPageHeader } from '@/components/shared/SettingsPageHeader';
import { SaveBar } from '@/components/shared/SaveBar';
import { PlanLockBanner, PlanLockModal } from '@/components/shared/PlanLockOverlay';
import { useGuildSettings } from '@/hooks/useGuildSettings';
import { usePlanGate } from '@/hooks/usePlanGate';
import { PLAN_TIERS } from '@/lib/plans';
import { LevelsGeneralTab } from './levels/LevelsGeneralTab';
import { LevelsRewardsTab } from './levels/LevelsRewardsTab';
import { LevelsLeaderboardTab } from './levels/LevelsLeaderboardTab';

export default function LevelsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const { data, setData, updateField, isLoading, isSaving, isDirty, save, reset } =
    useGuildSettings({ section: 'xp' });
  const planGate = usePlanGate('xp', PLAN_TIERS.FREE);

  if (isLoading) return <div className="space-y-6"><Skeleton className="h-20 rounded-2xl" /><SkeletonCard /><SkeletonCard /></div>;
  if (!data) return null;

  const handleSave = planGate.gateAction(save);

  return (
    <>
      <SettingsPageHeader icon={<TrendingUp />} title="نظام المستويات" description="نظام XP ومستويات الأعضاء والمكافآت" plan="silver" />
      {planGate.isLocked && <PlanLockBanner currentPlan={planGate.currentPlan} requiredPlan={planGate.requiredPlan} featureName="نظام المستويات" className="mb-6" />}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList variant="pills" className="flex-wrap gap-2">
          <TabsTrigger value="general"     variant="pills"><SettingsIcon className="w-4 h-4" /><span>الإعدادات</span></TabsTrigger>
          <TabsTrigger value="rewards"     variant="pills"><Sparkles className="w-4 h-4" /><span>المكافآت</span></TabsTrigger>
          <TabsTrigger value="leaderboard" variant="pills"><Trophy className="w-4 h-4" /><span>المتصدرون</span></TabsTrigger>
        </TabsList>
        <TabsContent value="general"><LevelsGeneralTab data={data} updateField={updateField} /></TabsContent>
        <TabsContent value="rewards"><LevelsRewardsTab data={data} updateField={updateField} setData={setData} /></TabsContent>
        <TabsContent value="leaderboard"><LevelsLeaderboardTab /></TabsContent>
      </Tabs>
      <SaveBar isDirty={isDirty} isSaving={isSaving} onSave={handleSave} onReset={reset} />
      <PlanLockModal {...planGate.lockModalProps} featureName="نظام المستويات" />
    </>
  );
}

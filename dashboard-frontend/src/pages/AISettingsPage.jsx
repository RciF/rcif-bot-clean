import { useState } from 'react';
import { Bot, Sparkles, Shield, BarChart3 } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton';
import { SettingsPageHeader } from '@/components/shared/SettingsPageHeader';
import { SaveBar } from '@/components/shared/SaveBar';
import { PlanLockBanner, PlanLockModal } from '@/components/shared/PlanLockOverlay';
import { useGuildSettings } from '@/hooks/useGuildSettings';
import { usePlanGate } from '@/hooks/usePlanGate';
import { PLAN_TIERS } from '@/lib/plans';
import { AIGeneralTab } from './ai/AIGeneralTab';
import { AIPersonaTab } from './ai/AIPersonaTab';
import { AILimitsTab } from './ai/AILimitsTab';
import { AIUsageTab } from './ai/AIUsageTab';

export default function AISettingsPage() {
  const [activeTab, setActiveTab] = useState('general');

  const { data, setData, updateField, isLoading, isSaving, isDirty, save, reset } =
    useGuildSettings({ section: 'ai' });

  const planGate = usePlanGate('ai', PLAN_TIERS.SILVER);

  if (isLoading) return <div className="space-y-6"><Skeleton className="h-20 rounded-2xl" /><SkeletonCard /><SkeletonCard /></div>;
  if (!data) return null;

  const handleSave = planGate.gateAction(save);

  return (
    <>
      <SettingsPageHeader icon={<Bot />} title="إعدادات الذكاء الاصطناعي" description="خصص شخصية AI وسلوكه وحدوده" plan="gold" />

      {planGate.isLocked && (
        <PlanLockBanner currentPlan={planGate.currentPlan} requiredPlan={planGate.requiredPlan} featureName="إعدادات الذكاء الاصطناعي" className="mb-6" />
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList variant="pills" className="flex-wrap gap-2">
          <TabsTrigger value="general"  variant="pills"><Bot className="w-4 h-4" /><span>عام</span></TabsTrigger>
          <TabsTrigger value="persona"  variant="pills"><Sparkles className="w-4 h-4" /><span>الشخصية</span></TabsTrigger>
          <TabsTrigger value="limits"   variant="pills"><Shield className="w-4 h-4" /><span>الحدود</span></TabsTrigger>
          <TabsTrigger value="usage"    variant="pills"><BarChart3 className="w-4 h-4" /><span>الاستخدام</span></TabsTrigger>
        </TabsList>
        <TabsContent value="general"><AIGeneralTab data={data} updateField={updateField} setData={setData} /></TabsContent>
        <TabsContent value="persona"><AIPersonaTab data={data} updateField={updateField} setData={setData} /></TabsContent>
        <TabsContent value="limits"><AILimitsTab data={data} updateField={updateField} setData={setData} /></TabsContent>
        <TabsContent value="usage"><AIUsageTab data={data} /></TabsContent>
      </Tabs>

      <SaveBar isDirty={isDirty} isSaving={isSaving} onSave={handleSave} onReset={reset} locked={planGate.isLocked} onLockedClick={planGate.openLockModal} />
      <PlanLockModal {...planGate.lockModalProps} />
    </>
  );
}

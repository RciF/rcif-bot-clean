import { useState } from 'react';
import { Coins, ShoppingBag, Trophy, Settings as SettingsIcon } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton';
import { SettingsPageHeader } from '@/components/shared/SettingsPageHeader';
import { SaveBar } from '@/components/shared/SaveBar';
import { PlanLockBanner, PlanLockModal } from '@/components/shared/PlanLockOverlay';
import { useGuildSettings } from '@/hooks/useGuildSettings';
import { usePlanGate } from '@/hooks/usePlanGate';
import { PLAN_TIERS } from '@/lib/plans';
import { EconomyGeneralTab } from './economy/EconomyGeneralTab';
import { EconomyShopTab } from './economy/EconomyShopTab';
import { EconomyTopRichTab } from './economy/EconomyTopRichTab';

export default function EconomyPage() {
  const [activeTab, setActiveTab] = useState('general');
  const { data, setData, updateField, isLoading, isSaving, isDirty, save, reset } =
    useGuildSettings({ section: 'economy' });
  const planGate = usePlanGate('economy', PLAN_TIERS.SILVER);

  if (isLoading) return <div className="space-y-6"><Skeleton className="h-20 rounded-2xl" /><SkeletonCard /><SkeletonCard /></div>;
  if (!data) return null;

  const handleSave = planGate.gateAction(save);

  return (
    <>
      <SettingsPageHeader icon={<Coins />} title="نظام الاقتصاد" description="عملة السيرفر، المتجر، والمكافآت" plan="gold" />
      {planGate.isLocked && <PlanLockBanner currentPlan={planGate.currentPlan} requiredPlan={planGate.requiredPlan} featureName="نظام الاقتصاد" className="mb-6" />}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList variant="pills" className="flex-wrap gap-2">
          <TabsTrigger value="general" variant="pills"><SettingsIcon className="w-4 h-4" /><span>الإعدادات</span></TabsTrigger>
          <TabsTrigger value="shop"    variant="pills"><ShoppingBag className="w-4 h-4" /><span>المتجر</span></TabsTrigger>
          <TabsTrigger value="rich"    variant="pills"><Trophy className="w-4 h-4" /><span>الأثرياء</span></TabsTrigger>
        </TabsList>
        <TabsContent value="general"><EconomyGeneralTab data={data} updateField={updateField} /></TabsContent>
        <TabsContent value="shop"><EconomyShopTab data={data} setData={setData} /></TabsContent>
        <TabsContent value="rich"><EconomyTopRichTab /></TabsContent>
      </Tabs>
      <SaveBar isDirty={isDirty} isSaving={isSaving} onSave={handleSave} onReset={reset} />
      <PlanLockModal {...planGate.lockModalProps} featureName="نظام الاقتصاد" />
    </>
  );
}

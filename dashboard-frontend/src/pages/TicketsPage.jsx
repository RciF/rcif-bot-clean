import { useState } from 'react';
import { Ticket, Settings as SettingsIcon, Wand2, FolderOpen } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton';
import { SettingsPageHeader } from '@/components/shared/SettingsPageHeader';
import { SaveBar } from '@/components/shared/SaveBar';
import { PlanLockBanner, PlanLockModal } from '@/components/shared/PlanLockOverlay';
import { useGuildSettings } from '@/hooks/useGuildSettings';
import { usePlanGate } from '@/hooks/usePlanGate';
import { mock } from '@/lib/mock';
import { PLAN_TIERS } from '@/lib/plans';

import { TicketsGeneralTab } from './tickets/TicketsGeneralTab';
import { TicketsDesignerTab } from './tickets/TicketsDesignerTab';
import { TicketsActiveTab } from './tickets/TicketsActiveTab';

export default function TicketsPage() {
  const [activeTab, setActiveTab] = useState('general');

  const { data, setData, updateField, isLoading, isSaving, isDirty, save, reset } =
    useGuildSettings({ section: 'tickets', fetcher: mock.ticketsSettings });

  const planGate = usePlanGate('tickets', PLAN_TIERS.SILVER);

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

  return (
    <>
      <SettingsPageHeader
        icon={<Ticket />}
        title="نظام التذاكر"
        description="إدارة طلبات الدعم والبلاغات"
        plan="gold"
      />

      {planGate.isLocked && (
        <PlanLockBanner
          currentPlan={planGate.currentPlan}
          requiredPlan={planGate.requiredPlan}
          featureName="نظام التذاكر"
          className="mb-6"
        />
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList variant="pills" className="flex-wrap gap-2">
          <TabsTrigger value="general" variant="pills">
            <SettingsIcon className="w-4 h-4" />
            <span>عام</span>
          </TabsTrigger>
          <TabsTrigger value="designer" variant="pills">
            <Wand2 className="w-4 h-4" />
            <span>اللوحة</span>
          </TabsTrigger>
          <TabsTrigger value="active" variant="pills">
            <FolderOpen className="w-4 h-4" />
            <span>التذاكر النشطة</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <TicketsGeneralTab data={data} updateField={updateField} setData={setData} />
        </TabsContent>
        <TabsContent value="designer">
          <TicketsDesignerTab data={data} updateField={updateField} setData={setData} />
        </TabsContent>
        <TabsContent value="active">
          <TicketsActiveTab />
        </TabsContent>
      </Tabs>

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

import { useState } from 'react';
import { Bot, Sparkles, Shield, BarChart3 } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Button } from '@/components/ui/Button';
import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton';
import { SettingsPageHeader } from '@/components/shared/SettingsPageHeader';
import { SaveBar } from '@/components/shared/SaveBar';
import { PlanLockBanner, PlanLockModal } from '@/components/shared/PlanLockOverlay';
import { useGuildSettings } from '@/hooks/useGuildSettings';
import { usePlanGate } from '@/hooks/usePlanGate';
import { mock } from '@/lib/mock';
import { PLAN_TIERS } from '@/lib/plans';

import { AIGeneralTab } from './ai/AIGeneralTab';
import { AIPersonaTab } from './ai/AIPersonaTab';
import { AILimitsTab } from './ai/AILimitsTab';
import { AIUsageTab } from './ai/AIUsageTab';

/**
 * AISettingsPage — صفحة إعدادات الذكاء الاصطناعي
 *
 * 4 tabs:
 * - عام (Toggle, mention/reply, allowed channels)
 * - الشخصية (Persona presets أو مخصص)
 * - الحدود (max length, daily limit, blocked words)
 * - الاستخدام (statistics, usage)
 */
export default function AISettingsPage() {
  const [activeTab, setActiveTab] = useState('general');

  // ── حالة الإعدادات ──
  const { data, setData, updateField, isLoading, isSaving, isDirty, save, reset } =
    useGuildSettings({
      section: 'ai',
      fetcher: mock.aiSettings,
    });

  // ── Plan Gate (هذي الميزة لـ Gold) ──
  // TODO: لاحقاً نقرأ الخطة من useGuildPlan، الحين mock = silver لاختبار try-before-buy
  const currentUserPlan = PLAN_TIERS.SILVER;
  const planGate = usePlanGate('ai', currentUserPlan);

  // ── Loading state ──
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
        <div className="space-y-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const handleSave = planGate.gateAction(save);

  return (
    <>
      <SettingsPageHeader
        icon={<Bot />}
        title="إعدادات الذكاء الاصطناعي"
        description="خصص شخصية AI وسلوكه وحدوده"
        plan="gold"
      />

      {/* Try-before-buy Banner */}
      {planGate.isLocked && (
        <PlanLockBanner
          currentPlan={planGate.currentPlan}
          requiredPlan={planGate.requiredPlan}
          featureName="إعدادات الذكاء الاصطناعي"
          className="mb-6"
        />
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList variant="pills" className="flex-wrap gap-2">
          <TabsTrigger value="general" variant="pills">
            <Bot className="w-4 h-4" />
            <span>عام</span>
          </TabsTrigger>
          <TabsTrigger value="persona" variant="pills">
            <Sparkles className="w-4 h-4" />
            <span>الشخصية</span>
          </TabsTrigger>
          <TabsTrigger value="limits" variant="pills">
            <Shield className="w-4 h-4" />
            <span>الحدود</span>
          </TabsTrigger>
          <TabsTrigger value="usage" variant="pills">
            <BarChart3 className="w-4 h-4" />
            <span>الاستخدام</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <AIGeneralTab data={data} updateField={updateField} setData={setData} />
        </TabsContent>

        <TabsContent value="persona">
          <AIPersonaTab data={data} updateField={updateField} setData={setData} />
        </TabsContent>

        <TabsContent value="limits">
          <AILimitsTab data={data} updateField={updateField} setData={setData} />
        </TabsContent>

        <TabsContent value="usage">
          <AIUsageTab data={data} />
        </TabsContent>
      </Tabs>

      {/* SaveBar — يطلع لما dirty */}
      <SaveBar
        isDirty={isDirty}
        isSaving={isSaving}
        onSave={handleSave}
        onReset={reset}
        locked={planGate.isLocked}
        onLockedClick={planGate.openLockModal}
      />

      {/* Plan Lock Modal */}
      <PlanLockModal {...planGate.lockModalProps} />
    </>
  );
}

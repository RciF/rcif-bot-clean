import { useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Card } from '@/components/ui/Card';
import { SettingsPageHeader } from '@/components/shared/SettingsPageHeader';
import { PlanLockBanner } from '@/components/shared/PlanLockOverlay';
import { usePlanGate } from '@/hooks/usePlanGate';
import { PLAN_TIERS } from '@/lib/plans';

const PERIODS = [
  { id: '24h', label: '24 ساعة' },
  { id: '7d',  label: '7 أيام'  },
  { id: '30d', label: '30 يوم'  },
];

export default function StatsPage() {
  const [period, setPeriod] = useState('7d');
  const planGate = usePlanGate('stats', PLAN_TIERS.SILVER);

  return (
    <>
      <SettingsPageHeader
        icon={<BarChart3 />}
        title="الإحصائيات المتقدمة"
        description="رسوم بيانية ومؤشرات أداء سيرفرك"
        plan="silver"
      />

      {planGate.isLocked && (
        <PlanLockBanner
          currentPlan={planGate.currentPlan}
          requiredPlan={planGate.requiredPlan}
          featureName="الإحصائيات المتقدمة"
          className="mb-6"
        />
      )}

      <Tabs value={period} onValueChange={setPeriod} className="mb-4">
        <TabsList variant="pills">
          {PERIODS.map((p) => (
            <TabsTrigger key={p.id} value={p.id} variant="pills">{p.label}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Card className="p-12 flex flex-col items-center justify-center text-center gap-4">
        <div className="w-16 h-16 rounded-2xl lyn-gradient flex items-center justify-center lyn-glow">
          <BarChart3 className="w-8 h-8 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold mb-2">الإحصائيات قريباً</h3>
          <p className="text-muted-foreground text-sm max-w-sm">
            نحتاج نضيف APIs تتبع الرسائل والأوامر في الباك اند أولاً — تأتي في المرحلة القادمة
          </p>
        </div>
      </Card>
    </>
  );
}

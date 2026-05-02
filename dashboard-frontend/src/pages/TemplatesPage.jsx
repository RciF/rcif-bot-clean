import { useEffect, useState } from 'react';
import {
  Layers,
  Sparkles,
  Check,
  AlertTriangle,
  Save,
  Star,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
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
import { usePlanGate } from '@/hooks/usePlanGate';
import { mock } from '@/lib/mock';
import { PLAN_TIERS } from '@/lib/plans';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState(null);
  const [confirmApply, setConfirmApply] = useState(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [customName, setCustomName] = useState('');

  const planGate = usePlanGate('templates', PLAN_TIERS.SILVER);

  useEffect(() => {
    mock.presetTemplates().then(setTemplates);
  }, []);

  const handleApply = () => {
    toast.success(`تم تطبيق قالب ${confirmApply.name}`);
    setConfirmApply(null);
  };

  const handleSaveCurrent = () => {
    if (!customName.trim()) return;
    toast.success(`تم حفظ "${customName}" كقالب مخصص`);
    setCustomName('');
    setShowSaveDialog(false);
  };

  return (
    <>
      <SettingsPageHeader
        icon={<Layers />}
        title="القوالب الجاهزة"
        description="طبّق إعدادات سيرفر كاملة بضغطة واحدة"
        plan="silver"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={planGate.gateAction(() => setShowSaveDialog(true))}
          >
            <Save className="w-4 h-4" />
            احفظ سيرفري كقالب
          </Button>
        }
      />

      {planGate.isLocked && (
        <PlanLockBanner
          currentPlan={planGate.currentPlan}
          requiredPlan={planGate.requiredPlan}
          featureName="القوالب"
          className="mb-6"
        />
      )}

      {!templates ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((tpl) => (
            <Card
              key={tpl.id}
              className="overflow-hidden hover:border-border/80 transition-colors group"
            >
              {/* Top gradient header */}
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
                <h3 className="font-bold text-lg mb-1">{tpl.name}</h3>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {tpl.description}
                </p>

                {/* Changes list */}
                <div className="space-y-1.5 mb-4">
                  {tpl.changes.map((change, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                      <span className="text-muted-foreground">{change}</span>
                    </div>
                  ))}
                </div>

                {/* Affected systems */}
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

      {/* Apply Confirm */}
      <Dialog open={!!confirmApply} onOpenChange={() => setConfirmApply(null)}>
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
              هذا راح يغير الأنظمة:{' '}
              <span className="font-bold text-foreground">
                {confirmApply?.systemsAffected?.join('، ')}
              </span>
              . إعداداتك الحالية في هذي الأنظمة راح تنحفظ في السجل قبل الاستبدال.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmApply(null)}
              className="flex-1"
            >
              إلغاء
            </Button>
            <Button onClick={handleApply} className="flex-1">
              <Sparkles className="w-4 h-4" />
              نعم، طبّق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save Current Settings Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>حفظ سيرفري كقالب مخصص</DialogTitle>
            <DialogDescription>
              راح يتم حفظ كل إعدادات سيرفرك الحالية كقالب مخصص تقدر تستخدمه على سيرفرات أخرى
            </DialogDescription>
          </DialogHeader>
          <Input
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="اسم القالب..."
            maxLength={50}
            onKeyDown={(e) => e.key === 'Enter' && handleSaveCurrent()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)} className="flex-1">
              إلغاء
            </Button>
            <Button
              onClick={handleSaveCurrent}
              disabled={!customName.trim()}
              className="flex-1"
            >
              <Save className="w-4 h-4" />
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

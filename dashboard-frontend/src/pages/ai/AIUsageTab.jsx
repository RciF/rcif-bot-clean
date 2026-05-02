import { Activity, Zap, Sparkles, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Switch } from '@/components/ui/Switch';
import { Badge } from '@/components/ui/Badge';
import { Separator } from '@/components/ui/Separator';
import { StatCard, StatCardGrid } from '@/components/shared/StatCard';
import { cn } from '@/lib/utils';

/**
 * AIUsageTab — Tab الاستخدام والإحصائيات
 */
export function AIUsageTab({ data }) {
  const usagePercent = Math.round((data.usageToday / data.usageLimit) * 100);
  const remaining = data.usageLimit - data.usageToday;

  // ألوان حسب نسبة الاستخدام
  const getUsageColor = () => {
    if (usagePercent >= 90) return 'text-destructive';
    if (usagePercent >= 70) return 'text-amber-500';
    return 'text-emerald-500';
  };

  const getProgressGradient = () => {
    if (usagePercent >= 90) return 'from-rose-500 to-red-500';
    if (usagePercent >= 70) return 'from-amber-500 to-orange-500';
    return 'from-emerald-500 to-cyan-500';
  };

  return (
    <div className="space-y-4">
      {/* ── Usage Stats Grid ── */}
      <StatCardGrid cols={3}>
        <StatCard
          icon={<Activity />}
          label="الاستخدام اليوم"
          value={data.usageToday}
          format="number"
          gradient="from-violet-500 to-pink-500"
          hint={`من أصل ${data.usageLimit} رسالة`}
        />
        <StatCard
          icon={<Zap />}
          label="المتبقي اليوم"
          value={remaining}
          format="number"
          gradient="from-emerald-500 to-cyan-500"
          hint="يصفر الساعة 12 منتصف الليل"
        />
        <StatCard
          icon={<TrendingUp />}
          label="نسبة الاستخدام"
          value={usagePercent}
          format="percent"
          gradient="from-amber-500 to-rose-500"
        />
      </StatCardGrid>

      {/* ── Usage Progress ── */}
      <Card className="p-5">
        <div className="flex items-center justify-between gap-4 mb-3">
          <div>
            <h3 className="font-bold">استخدام اليوم</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              <span className={cn('num font-bold', getUsageColor())}>
                {data.usageToday}
              </span>{' '}
              <span className="text-muted-foreground">/</span>{' '}
              <span className="num">{data.usageLimit}</span> رسالة
            </p>
          </div>
          <Badge variant={usagePercent >= 90 ? 'danger' : usagePercent >= 70 ? 'warning' : 'success'}>
            {usagePercent}%
          </Badge>
        </div>

        {/* Progress Bar */}
        <div className="h-3 rounded-full bg-secondary overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full bg-gradient-to-l transition-all duration-700',
              getProgressGradient(),
            )}
            style={{ width: `${Math.min(usagePercent, 100)}%` }}
          />
        </div>

        {usagePercent >= 90 && (
          <p className="text-xs text-destructive mt-3 flex items-center gap-1.5">
            ⚠️ اقتربت من الحد اليومي — راح يصفر الساعة 12 منتصف الليل
          </p>
        )}
      </Card>

      {/* ── Creative Model Card ── */}
      <Card className="p-5">
        <div className="flex items-start gap-3 mb-4">
          <div
            className={cn(
              'w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0',
              data.creativeModelEnabled
                ? 'lyn-gradient lyn-glow'
                : 'bg-muted',
            )}
          >
            <Sparkles
              className={cn(
                'w-5 h-5',
                data.creativeModelEnabled ? 'text-white' : 'text-muted-foreground',
              )}
            />
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold">النموذج الإبداعي</h3>
              <Badge variant="diamond" size="sm">
                💎 Diamond
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              نموذج GPT-4o للردود الإبداعية والأكثر ذكاءً
            </p>
          </div>

          <Switch
            checked={data.creativeModelEnabled}
            disabled
            size="default"
          />
        </div>

        <Separator className="my-4" />

        <div className="space-y-2.5">
          <div className="flex items-center gap-2 text-sm">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            <span className="text-muted-foreground">ردود أكثر ذكاءً وإبداعاً</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            <span className="text-muted-foreground">فهم أعمق للسياق</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            <span className="text-muted-foreground">يحتاج خطة Diamond للتفعيل</span>
          </div>
        </div>
      </Card>

      {/* ── Top Users (placeholder) ── */}
      <Card className="p-5">
        <div className="mb-3">
          <h3 className="font-bold">أكثر الأعضاء استخداماً</h3>
          <p className="text-sm text-muted-foreground">
            قريباً — ترتيب الأعضاء حسب استخدام AI
          </p>
        </div>

        <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
          <Activity className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium mb-1">قيد البناء</p>
          <p className="text-xs text-muted-foreground">
            هذي الإحصائية راح تتفعل بعد ربط APIs الباك اند
          </p>
        </div>
      </Card>
    </div>
  );
}

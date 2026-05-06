import { useEffect, useState } from 'react';
import { Activity, Zap, TrendingUp, Sparkles } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatCard, StatCardGrid } from '@/components/shared/StatCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { useGuildStore } from '@/store/guildStore';
import { apiClient } from '@/api/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

function formatDate(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('ar', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

export function AIUsageTab() {
  const { selectedGuildId } = useGuildStore();
  const [usage, setUsage] = useState(null);

  useEffect(() => {
    let mounted = true;
    if (!selectedGuildId) return;
    setUsage(null);
    apiClient
      .get(`/api/guild/${selectedGuildId}/ai/usage`)
      .then((res) => {
        if (!mounted) return;
        setUsage(res);
      })
      .catch((err) => {
        if (!mounted) return;
        setUsage({ today: { count: 0, limit: 0, remaining: 0, percentage: 0, tokens: 0 }, weekly: [], topUsers: [] });
        if (err?.code !== 'PLAN_REQUIRED') {
          toast.error(err?.message || 'فشل تحميل الاستخدام');
        }
      });
    return () => {
      mounted = false;
    };
  }, [selectedGuildId]);

  if (!usage) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  const { today, weekly, topUsers } = usage;
  const usagePercent = today.percentage || 0;

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

  const chartData = (weekly || []).map((d) => ({
    date: formatDate(d.date),
    رسائل: d.count || 0,
  }));

  return (
    <div className="space-y-4">
      <StatCardGrid cols={3}>
        <StatCard
          icon={<Activity />}
          label="الاستخدام اليوم"
          value={today.count}
          format="number"
          gradient="from-violet-500 to-pink-500"
          hint={`من أصل ${today.limit} رسالة`}
        />
        <StatCard
          icon={<Zap />}
          label="المتبقي اليوم"
          value={today.remaining}
          format="number"
          gradient="from-emerald-500 to-cyan-500"
          hint="يصفر بعد منتصف الليل"
        />
        <StatCard
          icon={<TrendingUp />}
          label="نسبة الاستخدام"
          value={usagePercent}
          format="percent"
          gradient="from-amber-500 to-rose-500"
        />
      </StatCardGrid>

      <Card className="p-5">
        <div className="flex items-center justify-between gap-4 mb-3">
          <div>
            <h3 className="font-bold">استخدام اليوم</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              <span className={cn('num font-bold', getUsageColor())}>{today.count}</span>{' '}
              <span className="text-muted-foreground">/</span>{' '}
              <span className="num">{today.limit}</span> رسالة
            </p>
          </div>
          <Badge variant={usagePercent >= 90 ? 'destructive' : usagePercent >= 70 ? 'secondary' : 'default'}>
            {usagePercent}%
          </Badge>
        </div>

        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={cn('h-full bg-gradient-to-r rounded-full transition-all', getProgressGradient())}
            style={{ width: `${Math.min(usagePercent, 100)}%` }}
          />
        </div>

        {today.tokens > 0 && (
          <p className="text-xs text-muted-foreground mt-3">
            استهلكت <span className="num font-semibold">{today.tokens.toLocaleString('ar')}</span> توكن اليوم
          </p>
        )}
      </Card>

      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-violet-500" />
          <h3 className="font-bold">آخر 7 أيام</h3>
        </div>

        {chartData.length === 0 ? (
          <EmptyState
            icon={<Activity />}
            title="ما في استخدام بعد"
            description="عند استخدام AI تظهر الإحصائيات هنا"
          />
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '0.75rem',
                }}
              />
              <Line
                type="monotone"
                dataKey="رسائل"
                stroke="#a855f7"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      {topUsers && topUsers.length > 0 && (
        <Card className="p-5">
          <h3 className="font-bold mb-3">أكثر المستخدمين اليوم</h3>
          <div className="space-y-2">
            {topUsers.map((u, i) => {
              const max = topUsers[0]?.count || 1;
              const pct = (u.count / max) * 100;
              return (
                <div key={u.user_id} className="flex items-center gap-3">
                  <div className="w-6 text-center text-xs text-muted-foreground num">#{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-mono text-muted-foreground ltr">
                        {u.user_id.slice(-6)}
                      </span>
                      <span className="text-xs text-muted-foreground num">
                        {u.count} رسالة
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full lyn-gradient rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
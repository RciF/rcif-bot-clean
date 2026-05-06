import { useEffect, useState, useMemo } from 'react';
import {
  BarChart3,
  Users,
  TrendingUp,
  TrendingDown,
  Activity,
  Ticket,
  AlertTriangle,
  Sparkles,
  Clock,
  ServerCrash,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { SettingsPageHeader } from '@/components/shared/SettingsPageHeader';
import { PlanLockBanner } from '@/components/shared/PlanLockOverlay';
import { EmptyState } from '@/components/shared/EmptyState';
import { usePlanGate } from '@/hooks/usePlanGate';
import { useGuildStore } from '@/store/guildStore';
import { apiClient } from '@/api/client';
import { PLAN_TIERS } from '@/lib/plans';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const PERIODS = [
  { id: 7, label: '7 أيام' },
  { id: 30, label: '30 يوم' },
  { id: 90, label: '90 يوم' },
];

// ────────────────────────────────────────────────────────────
//  Helpers
// ────────────────────────────────────────────────────────────

function formatDate(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('ar', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

function formatHour(hour) {
  if (hour == null) return '—';
  const h = Number(hour);
  if (h === 0) return '12 ص';
  if (h < 12) return `${h} ص`;
  if (h === 12) return '12 م';
  return `${h - 12} م`;
}

const ACTION_LABELS = {
  'welcome.update': 'تعديل الترحيب',
  'logs.update': 'تعديل السجلات',
  'protection.update': 'تعديل الحماية',
  'tickets.update': 'تعديل التذاكر',
  'economy.update': 'تعديل الاقتصاد',
  'xp.update': 'تعديل XP',
  'ai.update': 'تعديل AI',
  'command.update': 'تعديل أمر',
  'commands.reset_all': 'إعادة الأوامر',
  'prefix.update': 'تغيير البريفكس',
  'embed.send': 'إرسال إيمبيد',
  'embed.template_save': 'حفظ قالب',
  'embed.template_delete': 'حذف قالب',
};

function actionLabel(action) {
  return ACTION_LABELS[action] || action;
}

// ────────────────────────────────────────────────────────────
//  Page
// ────────────────────────────────────────────────────────────

export default function StatsPage() {
  const { selectedGuildId } = useGuildStore();
  const [days, setDays] = useState(7);

  const [historical, setHistorical] = useState(null);
  const [activity, setActivity] = useState(null);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);

  const planGate = usePlanGate('stats', PLAN_TIERS.SILVER);

  // ─── Load all stats endpoints ───
  useEffect(() => {
    let mounted = true;
    if (!selectedGuildId) {
      setHistorical([]);
      setActivity([]);
      setSummary({});
      return;
    }

    setHistorical(null);
    setActivity(null);
    setSummary(null);
    setError(null);

    Promise.all([
      apiClient.get(`/api/guild/${selectedGuildId}/stats/historical?days=${days}`),
      apiClient.get(`/api/guild/${selectedGuildId}/stats/activity?days=${days}`),
      apiClient.get(`/api/guild/${selectedGuildId}/stats/summary`),
    ])
      .then(([hist, act, sum]) => {
        if (!mounted) return;
        setHistorical(hist);
        setActivity(act);
        setSummary(sum);
      })
      .catch((err) => {
        if (!mounted) return;
        if (err.code === 'PLAN_REQUIRED') {
          setHistorical({ snapshots: [], hasData: false });
          setActivity({ daily: [], topActions: [] });
          setSummary({});
        } else {
          setError(err);
          toast.error(err.message || 'فشل تحميل الإحصائيات');
        }
      });

    return () => {
      mounted = false;
    };
  }, [selectedGuildId, days]);

  // ─── Derived chart data ───
  const memberChartData = useMemo(() => {
    if (!historical?.snapshots) return [];
    return historical.snapshots.map((s) => ({
      date: formatDate(s.date),
      members: s.member_count || 0,
      joined: s.joined_today || 0,
      left: s.left_today || 0,
    }));
  }, [historical]);

  const activityChartData = useMemo(() => {
    if (!activity?.daily) return [];
    return activity.daily.map((d) => ({
      date: formatDate(d.date),
      تعديلات: d.count || 0,
    }));
  }, [activity]);

  // ─── Growth calculation ───
  const growth = useMemo(() => {
    if (!historical?.snapshots?.length) return null;
    const snaps = historical.snapshots;
    if (snaps.length < 2) return null;
    const first = snaps[0]?.member_count || 0;
    const last = snaps[snaps.length - 1]?.member_count || 0;
    const diff = last - first;
    const pct = first > 0 ? ((diff / first) * 100).toFixed(1) : 0;
    return { diff, pct, isPositive: diff >= 0 };
  }, [historical]);

  // ─── No guild state ───
  if (!selectedGuildId) {
    return (
      <>
        <SettingsPageHeader
          icon={<BarChart3 />}
          title="الإحصائيات المتقدمة"
          description="رسوم بيانية ومؤشرات أداء سيرفرك"
          plan="silver"
        />
        <Card className="p-8">
          <EmptyState
            icon={<ServerCrash />}
            title="اختر سيرفر أولاً"
            description="ارجع لصفحة السيرفرات واختر سيرفر للاطلاع على إحصائياته"
          />
        </Card>
      </>
    );
  }

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

      {/* Period selector */}
      <Tabs
        value={String(days)}
        onValueChange={(v) => setDays(Number(v))}
        className="mb-4"
      >
        <TabsList variant="pills">
          {PERIODS.map((p) => (
            <TabsTrigger key={p.id} value={String(p.id)} variant="pills">
              {p.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <SummaryCard
          icon={<Users />}
          label="الأعضاء"
          value={summary?.members?.total}
          loading={summary === null}
          color="text-blue-500"
        />
        <SummaryCard
          icon={<Activity />}
          label="متصلين"
          value={summary?.members?.online}
          loading={summary === null}
          color="text-emerald-500"
        />
        <SummaryCard
          icon={<Ticket />}
          label="تذاكر مفتوحة"
          value={summary?.tickets?.open}
          loading={summary === null}
          color="text-violet-500"
        />
        <SummaryCard
          icon={<AlertTriangle />}
          label="محذّرين"
          value={summary?.warnings?.users}
          loading={summary === null}
          color="text-amber-500"
        />
      </div>

      {/* Growth & Peak */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                {growth?.isPositive ? (
                  <TrendingUp className="w-5 h-5" />
                ) : (
                  <TrendingDown className="w-5 h-5" />
                )}
              </div>
              <div>
                <h3 className="font-bold text-sm">النمو خلال {days} يوم</h3>
                <p className="text-xs text-muted-foreground">
                  بناءً على لقطات البوت اليومية
                </p>
              </div>
            </div>
            {growth ? (
              <div className="flex items-baseline gap-2">
                <span
                  className={cn(
                    'text-2xl font-bold num',
                    growth.isPositive ? 'text-emerald-500' : 'text-red-500',
                  )}
                >
                  {growth.diff >= 0 ? '+' : ''}
                  {growth.diff}
                </span>
                <span className="text-sm text-muted-foreground">
                  ({growth.pct}%)
                </span>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                ما يكفي بيانات بعد — البوت يسجل لقطة كل يوم
              </div>
            )}
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm">ساعة الذروة</h3>
                <p className="text-xs text-muted-foreground">
                  الساعة الأكثر نشاطاً
                </p>
              </div>
            </div>
            {summary?.peakHour ? (
              <div>
                <div className="text-2xl font-bold num">
                  {formatHour(summary.peakHour.hour)}
                </div>
                <div className="text-xs text-muted-foreground">
                  معدل المتصلين:{' '}
                  <span className="num">
                    {Math.round(Number(summary.peakHour.avg_online) || 0)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                ما يكفي بيانات بعد
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Members chart */}
      <Card className="p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-blue-500" />
          <h3 className="font-bold">نمو الأعضاء</h3>
        </div>
        {historical === null ? (
          <Skeleton className="h-64 rounded-xl" />
        ) : !historical?.hasData || memberChartData.length === 0 ? (
          <EmptyState
            icon={<Sparkles />}
            title="ما فيه بيانات تاريخية بعد"
            description="البوت يسجل لقطة يومية لعدد الأعضاء — ارجع بعد فترة لتشاهد الرسم"
          />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={memberChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '0.75rem',
                }}
              />
              <Line
                type="monotone"
                dataKey="members"
                name="الأعضاء"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Joined/Left chart */}
      {historical?.hasData && memberChartData.length > 0 && (
        <Card className="p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-emerald-500" />
            <h3 className="font-bold">انضمام / مغادرة يومياً</h3>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={memberChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '0.75rem',
                }}
              />
              <Bar dataKey="joined" name="انضموا" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="left" name="غادروا" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Dashboard activity */}
      <Card className="p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-violet-500" />
          <h3 className="font-bold">نشاط الإدارة في الداشبورد</h3>
        </div>
        {activity === null ? (
          <Skeleton className="h-48 rounded-xl" />
        ) : activityChartData.length === 0 ? (
          <EmptyState
            icon={<BarChart3 />}
            title="ما في تعديلات بعد"
            description="عند تعديل الإعدادات من الداشبورد يظهر النشاط هنا"
          />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={activityChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '0.75rem',
                }}
              />
              <Bar
                dataKey="تعديلات"
                fill="#a855f7"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Top actions */}
      {activity?.topActions?.length > 0 && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold">أكثر الإجراءات</h3>
          </div>
          <div className="space-y-2">
            {activity.topActions.map((a, i) => {
              const max = activity.topActions[0]?.count || 1;
              const pct = (a.count / max) * 100;
              return (
                <div key={a.action} className="flex items-center gap-3">
                  <div className="w-6 text-center text-xs text-muted-foreground num">
                    #{i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">
                        {actionLabel(a.action)}
                      </span>
                      <span className="text-xs text-muted-foreground num">
                        {a.count}
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
    </>
  );
}

// ────────────────────────────────────────────────────────────
//  Sub-components
// ────────────────────────────────────────────────────────────

function SummaryCard({ icon, label, value, loading, color }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center', color)}>
          {icon}
        </div>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      {loading ? (
        <Skeleton className="h-8 w-20" />
      ) : (
        <div className={cn('text-2xl font-bold num', color)}>
          {(value ?? 0).toLocaleString('ar')}
        </div>
      )}
    </Card>
  );
}
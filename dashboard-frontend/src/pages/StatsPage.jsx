import { useEffect, useState } from 'react';
import {
  BarChart3,
  MessageSquare,
  Users,
  Bot,
  TrendingUp,
  Hash,
  Zap,
  Trophy,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { SettingsPageHeader } from '@/components/shared/SettingsPageHeader';
import { PlanLockBanner } from '@/components/shared/PlanLockOverlay';
import { StatCard, StatCardGrid } from '@/components/shared/StatCard';
import { usePlanGate } from '@/hooks/usePlanGate';
import { mock } from '@/lib/mock';
import { PLAN_TIERS } from '@/lib/plans';
import { formatCompact, cn } from '@/lib/utils';

const PERIODS = [
  { id: '24h', label: '24 ساعة' },
  { id: '7d', label: '7 أيام' },
  { id: '30d', label: '30 يوم' },
];

export default function StatsPage() {
  const [period, setPeriod] = useState('7d');
  const [data, setData] = useState(null);

  const planGate = usePlanGate('stats', PLAN_TIERS.SILVER);

  useEffect(() => {
    setData(null);
    mock.statsData(period).then(setData);
  }, [period]);

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

      {/* Period Selector */}
      <Tabs value={period} onValueChange={setPeriod} className="mb-4">
        <TabsList variant="pills">
          {PERIODS.map((p) => (
            <TabsTrigger key={p.id} value={p.id} variant="pills">
              {p.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {!data ? (
        <div className="space-y-4">
          <SkeletonCard />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      ) : (
        <>
          {/* Messages Chart */}
          <Card className="p-5 mb-4">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="w-5 h-5 text-violet-500" />
              <h2 className="font-bold">نشاط الرسائل</h2>
              <Badge variant="default" size="sm" className="ms-auto">
                {data.messagesOverTime.reduce((sum, d) => sum + d.messages, 0).toLocaleString()} رسالة
              </Badge>
            </div>
            <BarChart data={data.messagesOverTime} valueKey="messages" />
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            {/* Members Chart */}
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-emerald-500" />
                <h2 className="font-bold">الأعضاء</h2>
              </div>
              <DualBarChart data={data.membersOverTime} />
            </Card>

            {/* AI Usage */}
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Bot className="w-5 h-5 text-pink-500" />
                <h2 className="font-bold">استخدام AI</h2>
              </div>
              <BarChart data={data.aiUsage} valueKey="requests" gradient="from-pink-500 to-violet-500" />
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            {/* Top Channels */}
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Hash className="w-5 h-5 text-cyan-500" />
                <h2 className="font-bold">أكثر القنوات نشاطاً</h2>
              </div>
              <div className="space-y-2.5">
                {data.topChannels.map((ch, i) => (
                  <div key={ch.name}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-sm font-medium flex items-center gap-2">
                        <span className="text-xs text-muted-foreground num w-6">#{i + 1}</span>
                        <span>#{ch.name}</span>
                      </div>
                      <span className="text-xs font-bold num">
                        {formatCompact(ch.messages)} ({ch.percent}%)
                      </span>
                    </div>
                    <div className="h-2 bg-muted/40 rounded-full overflow-hidden">
                      <div
                        className="h-full lyn-gradient transition-all"
                        style={{ width: `${ch.percent * 2.5}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Top Commands */}
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-5 h-5 text-amber-500" />
                <h2 className="font-bold">أكثر الأوامر استخداماً</h2>
              </div>
              <div className="space-y-2">
                {data.topCommands.map((cmd, i) => (
                  <div
                    key={cmd.name}
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate font-mono ltr">/{cmd.name}</div>
                      <div className="text-xs text-muted-foreground">{cmd.category}</div>
                    </div>
                    <div className="text-sm font-bold num">{formatCompact(cmd.count)}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Top Users */}
          <Card className="p-5 mb-4">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-5 h-5 text-amber-500" />
              <h2 className="font-bold">أكثر الأعضاء نشاطاً</h2>
            </div>
            <div className="space-y-1.5">
              {data.topUsers.slice(0, 10).map((user) => (
                <div
                  key={user.username}
                  className={cn(
                    'flex items-center gap-3 p-2.5 rounded-lg',
                    user.rank <= 3 ? 'bg-amber-500/5' : 'hover:bg-accent/50',
                  )}
                >
                  <div className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs num',
                    user.rank === 1 && 'bg-gradient-to-br from-amber-400 to-yellow-600 text-white',
                    user.rank === 2 && 'bg-gradient-to-br from-slate-400 to-slate-600 text-white',
                    user.rank === 3 && 'bg-gradient-to-br from-amber-700 to-amber-900 text-white',
                    user.rank > 3 && 'bg-muted text-muted-foreground',
                  )}>
                    #{user.rank}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{user.username}</div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>
                      <span className="num font-semibold text-foreground">{formatCompact(user.messages)}</span>{' '}
                      رسالة
                    </span>
                    <span>
                      <span className="num font-semibold text-foreground">{user.commands}</span> أمر
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Heatmap */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h2 className="font-bold">توزيع النشاط (يوم × ساعة)</h2>
            </div>
            <Heatmap data={data.heatmap} />
          </Card>
        </>
      )}
    </>
  );
}

// ════════════════════════════════════════════════════════════
//  Bar Chart
// ════════════════════════════════════════════════════════════

function BarChart({ data, valueKey, gradient = 'from-violet-500 to-pink-500' }) {
  const max = Math.max(...data.map((d) => d[valueKey]));

  return (
    <div className="flex items-end gap-1.5 h-48">
      {data.map((d, i) => {
        const percent = (d[valueKey] / max) * 100;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group">
            <div className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity num font-bold">
              {formatCompact(d[valueKey])}
            </div>
            <div
              className={cn(
                'w-full rounded-t-md bg-gradient-to-t transition-all hover:opacity-80',
                gradient,
              )}
              style={{ height: `${Math.max(percent, 2)}%`, minHeight: '4px' }}
            />
            <div className="text-[10px] text-muted-foreground truncate w-full text-center num">
              {d.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DualBarChart({ data }) {
  const max = Math.max(...data.map((d) => Math.max(d.joined, d.left)));

  return (
    <>
      <div className="flex items-end gap-1 h-40">
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
            <div className="w-full flex gap-0.5 items-end h-full">
              <div
                className="flex-1 rounded-t-sm bg-gradient-to-t from-emerald-500 to-emerald-400 transition-all hover:opacity-80"
                style={{ height: `${(d.joined / max) * 100}%`, minHeight: '2px' }}
                title={`دخول: ${d.joined}`}
              />
              <div
                className="flex-1 rounded-t-sm bg-gradient-to-t from-rose-500 to-rose-400 transition-all hover:opacity-80"
                style={{ height: `${(d.left / max) * 100}%`, minHeight: '2px' }}
                title={`خروج: ${d.left}`}
              />
            </div>
            <div className="text-[9px] text-muted-foreground truncate w-full text-center num">
              {d.label}
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-center gap-4 mt-3 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-emerald-500" />
          <span className="text-muted-foreground">دخول</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-rose-500" />
          <span className="text-muted-foreground">خروج</span>
        </div>
      </div>
    </>
  );
}

// ════════════════════════════════════════════════════════════
//  Heatmap
// ════════════════════════════════════════════════════════════

function Heatmap({ data }) {
  const days = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

  return (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-full">
        <div className="flex gap-1 mb-1 ms-12">
          {Array.from({ length: 24 }).map((_, h) => (
            <div key={h} className="w-5 text-[8px] text-center text-muted-foreground num">
              {h % 4 === 0 ? h : ''}
            </div>
          ))}
        </div>
        {data.map((row, d) => (
          <div key={d} className="flex items-center gap-1 mb-1">
            <div className="w-12 text-[10px] text-muted-foreground text-end pe-1">
              {days[d]}
            </div>
            {row.map((value, h) => {
              const intensity = value / 100;
              return (
                <div
                  key={h}
                  className="w-5 h-5 rounded-sm transition-all hover:scale-150"
                  style={{
                    background: `oklch(0.606 0.25 292.717 / ${intensity})`,
                  }}
                  title={`${days[d]} ${h}:00 — ${value}`}
                />
              );
            })}
          </div>
        ))}
        <div className="flex items-center gap-2 mt-3 text-xs">
          <span className="text-muted-foreground">قليل</span>
          {[0.2, 0.4, 0.6, 0.8, 1].map((i) => (
            <div
              key={i}
              className="w-4 h-4 rounded-sm"
              style={{ background: `oklch(0.606 0.25 292.717 / ${i})` }}
            />
          ))}
          <span className="text-muted-foreground">كثير</span>
        </div>
      </div>
    </div>
  );
}

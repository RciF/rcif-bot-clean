import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  MessageSquare,
  Bot,
  Gavel,
  Activity,
  Sparkles,
  Send,
  Lock,
  Ticket,
  TrendingUp,
  Shield,
  ScrollText,
  ToggleRight,
  ArrowLeft,
  Heart,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { StatCard, StatCardGrid } from '@/components/shared/StatCard';
import { mock } from '@/lib/mock';
import { formatRelativeTime, formatCompact, cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';

const SUGGESTION_ICONS = {
  shield: Shield,
  logs: ScrollText,
  roles: ToggleRight,
};

const SEVERITY_STYLES = {
  high: { color: 'text-destructive', bg: 'bg-destructive/10', border: 'border-destructive/30' },
  medium: { color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  low: { color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
};

const QUICK_ACTIONS = [
  { id: 'embed', label: 'إرسال إعلان', icon: Send, link: '/dashboard/embed', gradient: 'from-violet-500 to-pink-500' },
  { id: 'lockdown', label: 'قفل السيرفر', icon: Lock, link: '/dashboard/protection', gradient: 'from-rose-500 to-orange-500' },
  { id: 'ticket', label: 'إنشاء تذكرة', icon: Ticket, link: '/dashboard/tickets', gradient: 'from-cyan-500 to-blue-500' },
  { id: 'broadcast', label: 'رسالة جماعية', icon: MessageSquare, link: '/dashboard/embed', gradient: 'from-emerald-500 to-cyan-500' },
];

export default function OverviewPage() {
  const [data, setData] = useState(null);
  const { user } = useAuthStore();

  useEffect(() => {
    mock.overviewData().then(setData);
  }, []);

  if (!data) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <Skeleton className="h-32 rounded-2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <SkeletonCard />
      </div>
    );
  }

  const { healthScore, stats, suggestions, recentActivity, weeklyActivity } = data;
  const maxMessages = Math.max(...weeklyActivity.map((d) => d.messages));

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ── Welcome + Health Score ── */}
      <Card className="p-6 lyn-gradient-soft border-border overflow-hidden relative">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div className="md:col-span-2">
            <h1 className="text-3xl font-bold mb-2">
              مرحباً 👋{' '}
              <span className="lyn-text-gradient">{user?.username || 'صديقي'}</span>
            </h1>
            <p className="text-muted-foreground mb-4">
              إليك نظرة عامة على أداء سيرفرك اليوم
            </p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(healthScore.breakdown).map(([key, item]) => (
                <Badge key={key} variant="default" size="sm">
                  {item.label}: <span className="num font-bold ms-1">{item.score}</span>
                </Badge>
              ))}
            </div>
          </div>

          {/* Health Score Circle */}
          <div className="flex justify-center">
            <HealthScoreCircle score={healthScore.total} />
          </div>
        </div>
      </Card>

      {/* ── Stats Grid ── */}
      <StatCardGrid cols={4}>
        <StatCard
          icon={<Users />}
          label="الأعضاء"
          value={stats.members.value}
          change={stats.members.change}
          gradient="from-violet-500 to-pink-500"
          format="compact"
          hint="إجمالي السيرفر"
        />
        <StatCard
          icon={<MessageSquare />}
          label="الرسائل (24س)"
          value={stats.messages24h.value}
          change={stats.messages24h.change}
          gradient="from-emerald-500 to-cyan-500"
          format="compact"
        />
        <StatCard
          icon={<Bot />}
          label="الأوامر (24س)"
          value={stats.commands24h.value}
          change={stats.commands24h.change}
          gradient="from-amber-500 to-orange-500"
          format="number"
          hint={`${stats.commands24h.aiPortion} منها AI`}
        />
        <StatCard
          icon={<Gavel />}
          label="إشراف (7 أيام)"
          value={stats.modActions7d.value}
          change={stats.modActions7d.change}
          gradient="from-rose-500 to-red-500"
          format="number"
          hint="حظر/تحذير/كتم"
        />
      </StatCardGrid>

      {/* ── Quick Actions ── */}
      <div>
        <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          إجراءات سريعة
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.id}
                to={action.link}
                className="group p-4 rounded-2xl bg-card border border-border hover:border-border/80 transition-all hover:scale-[1.02]"
              >
                <div
                  className={cn(
                    'w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center mb-3 group-hover:lyn-glow transition-all',
                    action.gradient,
                  )}
                >
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="font-medium text-sm">{action.label}</div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── Two Column: Suggestions + Activity Chart ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Smart Suggestions */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="font-bold">اقتراحات ذكية</h2>
            <Badge variant="lyn" size="sm" className="ms-auto">
              {suggestions.length}
            </Badge>
          </div>

          <div className="space-y-2">
            {suggestions.map((s) => {
              const Icon = SUGGESTION_ICONS[s.icon] || Sparkles;
              const styles = SEVERITY_STYLES[s.severity];
              return (
                <div
                  key={s.id}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-xl border',
                    styles.bg,
                    styles.border,
                  )}
                >
                  <div
                    className={cn(
                      'w-9 h-9 rounded-lg bg-card flex items-center justify-center flex-shrink-0',
                      styles.color,
                    )}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{s.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{s.description}</div>
                  </div>
                  <Button asChild size="sm" variant="outline" className="flex-shrink-0">
                    <Link to={s.link}>
                      {s.action}
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </Link>
                  </Button>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Weekly Activity Chart */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h2 className="font-bold">نشاط الأسبوع</h2>
          </div>

          <div className="space-y-2">
            {weeklyActivity.map((day) => {
              const percent = (day.messages / maxMessages) * 100;
              return (
                <div key={day.day} className="flex items-center gap-3">
                  <div className="text-xs font-medium w-16 text-muted-foreground">{day.day}</div>
                  <div className="flex-1 h-7 bg-muted/40 rounded-md overflow-hidden relative">
                    <div
                      className="h-full lyn-gradient transition-all"
                      style={{ width: `${percent}%` }}
                    />
                    <div className="absolute inset-0 flex items-center px-2 text-xs font-bold num">
                      {formatCompact(day.messages)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* ── Recent Activity ── */}
      <Card className="p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            <h2 className="font-bold">آخر الأنشطة</h2>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link to="/dashboard/audit">عرض الكل</Link>
          </Button>
        </div>

        <div className="space-y-1">
          {recentActivity.map((activity, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent/50 transition-colors"
            >
              <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground flex-shrink-0">
                {activity.user[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm">
                  <span className="font-medium">{activity.user}</span>{' '}
                  <span className="text-muted-foreground">{activity.text}</span>
                </div>
              </div>
              <div className="text-xs text-muted-foreground flex-shrink-0">
                {formatRelativeTime(activity.time)}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  Health Score Circle
// ════════════════════════════════════════════════════════════

function HealthScoreCircle({ score }) {
  const circumference = 2 * Math.PI * 56;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? '#10F4A8' : score >= 60 ? '#FFB800' : '#FF3D71';

  return (
    <div className="relative w-32 h-32">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
        <circle
          cx="64"
          cy="64"
          r="56"
          stroke="currentColor"
          strokeWidth="10"
          fill="none"
          className="text-muted/30"
        />
        <circle
          cx="64"
          cy="64"
          r="56"
          stroke={color}
          strokeWidth="10"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000"
          style={{
            filter: `drop-shadow(0 0 8px ${color}80)`,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <Heart className="w-4 h-4 mb-1" style={{ color }} />
        <div className="text-3xl font-bold num" style={{ color }}>
          {score}
        </div>
        <div className="text-[10px] font-medium text-muted-foreground">صحة السيرفر</div>
      </div>
    </div>
  );
}

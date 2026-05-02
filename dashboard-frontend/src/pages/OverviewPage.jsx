import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  MessageSquare,
  Bot,
  Gavel,
  Sparkles,
  Send,
  Lock,
  Ticket,
  Shield,
  ScrollText,
  ToggleRight,
  ServerCrash,
  Crown,
  Medal,
  Diamond,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { StatCard, StatCardGrid } from '@/components/shared/StatCard';
import { useGuildStore } from '@/store/guildStore';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@/api/client';
import { cn } from '@/lib/utils';

// ─── Plan badge config ────────────────────────────────────────
const PLAN_CONFIG = {
  diamond: { label: 'ماسي', icon: Diamond, color: 'text-cyan-400' },
  gold: { label: 'ذهبي', icon: Crown, color: 'text-yellow-400' },
  silver: { label: 'فضي', icon: Medal, color: 'text-slate-300' },
  free: { label: 'مجاني', icon: Sparkles, color: 'text-zinc-400' },
};

// ─── Quick Actions ────────────────────────────────────────────
const QUICK_ACTIONS = [
  { id: 'embed', label: 'إرسال إعلان', icon: Send, link: '/dashboard/embed', gradient: 'from-violet-500 to-pink-500' },
  { id: 'lockdown', label: 'قفل السيرفر', icon: Lock, link: '/dashboard/protection', gradient: 'from-rose-500 to-orange-500' },
  { id: 'ticket', label: 'إنشاء تذكرة', icon: Ticket, link: '/dashboard/tickets', gradient: 'from-cyan-500 to-blue-500' },
  { id: 'broadcast', label: 'رسالة جماعية', icon: MessageSquare, link: '/dashboard/embed', gradient: 'from-emerald-500 to-cyan-500' },
];

// ─── Suggestions static (ستصبح API لاحقاً) ──────────────────
const STATIC_SUGGESTIONS = [
  { id: 's1', title: 'فعّل Anti-Nuke', description: 'حماية السيرفر من التخريب', action: 'إعداد الحماية', link: '/dashboard/protection', icon: Shield, severity: 'high' },
  { id: 's2', title: 'اضبط السجلات', description: 'تتبع نشاط الأعضاء والمشرفين', action: 'إعداد السجلات', link: '/dashboard/logs', icon: ScrollText, severity: 'medium' },
  { id: 's3', title: 'أنشئ لوحة رتب', description: 'اتركهم يختارون رتبهم بأنفسهم', action: 'إنشاء لوحة', link: '/dashboard/reaction-roles', icon: ToggleRight, severity: 'low' },
];

const SEVERITY_STYLES = {
  high: 'border-destructive/30 bg-destructive/5 text-destructive',
  medium: 'border-amber-500/30 bg-amber-500/5 text-amber-500',
  low: 'border-blue-500/30 bg-blue-500/5 text-blue-500',
};

// ─── Health Score Circle ──────────────────────────────────────
function HealthScoreCircle({ score = 0 }) {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 80 ? '#10F4A8' : score >= 60 ? '#FFB800' : '#FF3D71';

  return (
    <div className="relative w-36 h-36 flex items-center justify-center">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/30" />
        <circle
          cx="60" cy="60" r={r} fill="none"
          stroke={color} strokeWidth="8"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
      </svg>
      <div className="text-center">
        <div className="text-3xl font-bold num" style={{ color }}>{score}</div>
        <div className="text-xs text-muted-foreground">/ 100</div>
      </div>
    </div>
  );
}

// ─── الصفحة ───────────────────────────────────────────────────
export default function OverviewPage() {
  const navigate = useNavigate();
  const { selectedGuild, selectedGuildId } = useGuildStore();
  const { user } = useAuthStore();

  // لو ما في سيرفر محدد → ابعثه لاختيار سيرفر
  useEffect(() => {
    if (!selectedGuildId) {
      navigate('/dashboard/servers', { replace: true });
    }
  }, [selectedGuildId, navigate]);

  // جلب معلومات السيرفر
  const { data: guildInfo, isLoading: loadingInfo, isError } = useQuery({
    queryKey: ['guild-info', selectedGuildId],
    queryFn: () => apiClient.get(`/api/guild/${selectedGuildId}/info`),
    enabled: !!selectedGuildId,
    staleTime: 1000 * 60 * 5, // 5 دقائق
  });

  // جلب خطة السيرفر
  const { data: planData, isLoading: loadingPlan } = useQuery({
    queryKey: ['guild-plan', selectedGuildId],
    queryFn: () => apiClient.get(`/api/guild/${selectedGuildId}/plan`),
    enabled: !!selectedGuildId,
    staleTime: 1000 * 60 * 5,
  });

  const plan = planData?.plan_id || 'free';
  const planCfg = PLAN_CONFIG[plan] || PLAN_CONFIG.free;
  const PlanIcon = planCfg.icon;

  const isLoading = loadingInfo || loadingPlan;

  if (!selectedGuildId) return null;

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <ServerCrash className="w-16 h-16 text-destructive/60" />
        <p className="text-muted-foreground">فشل تحميل بيانات السيرفر</p>
        <button
          onClick={() => navigate('/dashboard/servers')}
          className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm"
        >
          اختر سيرفر آخر
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <Skeleton className="h-36 rounded-2xl" />
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

  // أيقونة السيرفر
  const guild = guildInfo || selectedGuild;
  const iconUrl = guild?.icon
    ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128`
    : null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* ── Header: معلومات السيرفر + Health Score ── */}
      <Card className="p-6 overflow-hidden relative">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div className="md:col-span-2">
            <div className="flex items-center gap-4 mb-3">
              {iconUrl ? (
                <img src={iconUrl} alt={guild?.name} className="w-14 h-14 rounded-xl object-cover" />
              ) : (
                <div className="w-14 h-14 rounded-xl lyn-gradient flex items-center justify-center text-white font-bold text-xl">
                  {guild?.name?.slice(0, 1) || 'S'}
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold">{guild?.name || 'السيرفر'}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className={cn('inline-flex items-center gap-1 text-xs font-medium', planCfg.color)}>
                    <PlanIcon className="w-3 h-3" />
                    {planCfg.label}
                  </span>
                  {guildInfo?.memberCount && (
                    <span className="text-xs text-muted-foreground">
                      · <span className="num">{guildInfo.memberCount.toLocaleString()}</span> عضو
                    </span>
                  )}
                </div>
              </div>
            </div>
            <p className="text-muted-foreground text-sm">
              مرحباً{' '}
              <span className="lyn-text-gradient font-semibold">{user?.username || ''}</span>
              {' '}— إليك نظرة عامة على سيرفرك
            </p>
          </div>

          <div className="flex justify-center">
            <HealthScoreCircle score={78} />
          </div>
        </div>
      </Card>

      {/* ── Stats Cards (static مؤقتاً — APIs الإحصاء تأتي لاحقاً) ── */}
      <StatCardGrid cols={4}>
        <StatCard
          icon={<Users />}
          label="الأعضاء"
          value={guildInfo?.memberCount || 0}
          gradient="from-violet-500 to-pink-500"
          format="compact"
          hint="إجمالي السيرفر"
        />
        <StatCard
          icon={<MessageSquare />}
          label="الرسائل (24س)"
          value={0}
          gradient="from-emerald-500 to-cyan-500"
          format="compact"
          hint="قريباً"
        />
        <StatCard
          icon={<Bot />}
          label="الأوامر (24س)"
          value={0}
          gradient="from-amber-500 to-orange-500"
          format="number"
          hint="قريباً"
        />
        <StatCard
          icon={<Gavel />}
          label="إشراف (7 أيام)"
          value={0}
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
                className="group p-4 rounded-2xl bg-card border border-border hover:border-primary/40 transition-all hover:scale-[1.02]"
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

      {/* ── Suggestions ── */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-primary" />
          <h2 className="font-bold">اقتراحات ذكية</h2>
          <Badge variant="lyn" size="sm" className="ms-auto">
            {STATIC_SUGGESTIONS.length}
          </Badge>
        </div>
        <div className="space-y-2">
          {STATIC_SUGGESTIONS.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.id}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-xl border transition-colors',
                  SEVERITY_STYLES[s.severity],
                )}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{s.title}</div>
                  <div className="text-xs opacity-70">{s.description}</div>
                </div>
                <Link
                  to={s.link}
                  className="text-xs font-semibold whitespace-nowrap hover:underline"
                >
                  {s.action}
                </Link>
              </div>
            );
          })}
        </div>
      </Card>

    </div>
  );
}

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
  PartyPopper,
  Bot as BotIcon,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { StatCard, StatCardGrid } from '@/components/shared/StatCard';
import { useGuildStore } from '@/store/guildStore';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@/api/client';
import { settingsApi, guildApi } from '@/api';
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

const SEVERITY_STYLES = {
  high: 'border-destructive/30 bg-destructive/5 text-destructive',
  medium: 'border-amber-500/30 bg-amber-500/5 text-amber-500',
  low: 'border-blue-500/30 bg-blue-500/5 text-blue-500',
};

// ─── Health Score Circle ──────────────────────────────────────
function HealthScoreCircle({ score = 0, label = '/ 100' }) {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.max(0, Math.min(score, 100)) / 100) * circ;
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
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

/**
 * توليد اقتراحات ذكية بناءً على الإعدادات الفعلية
 */
function buildSuggestions({ protection, logs, welcome, ai }) {
  const suggestions = [];

  // Anti-Nuke غير مفعّل
  if (!protection?.anti_nuke?.enabled) {
    suggestions.push({
      id: 'enable-anti-nuke',
      title: 'فعّل Anti-Nuke',
      description: 'حماية السيرفر من تخريب القنوات والرتب',
      action: 'إعداد الحماية',
      link: '/dashboard/protection',
      icon: Shield,
      severity: 'high',
    });
  }

  // Logs غير مفعّلة
  if (!logs?.enabled) {
    suggestions.push({
      id: 'enable-logs',
      title: 'اضبط السجلات',
      description: 'تتبع نشاط الأعضاء والمشرفين',
      action: 'إعداد السجلات',
      link: '/dashboard/logs',
      icon: ScrollText,
      severity: 'medium',
    });
  }

  // Anti-Spam غير مفعّل
  if (!protection?.anti_spam?.enabled) {
    suggestions.push({
      id: 'enable-anti-spam',
      title: 'فعّل Anti-Spam',
      description: 'منع إغراق القنوات بالرسائل',
      action: 'إعداد الحماية',
      link: '/dashboard/protection',
      icon: Shield,
      severity: 'medium',
    });
  }

  // Welcome غير مفعّل
  if (!welcome?.enabled) {
    suggestions.push({
      id: 'enable-welcome',
      title: 'فعّل رسائل الترحيب',
      description: 'استقبل الأعضاء الجدد بشكل رسمي',
      action: 'إعداد الترحيب',
      link: '/dashboard/welcome',
      icon: PartyPopper,
      severity: 'low',
    });
  }

  // AI غير مفعّل
  if (!ai?.enabled) {
    suggestions.push({
      id: 'enable-ai',
      title: 'فعّل الذكاء الاصطناعي',
      description: 'دردش مع الأعضاء بـ AI ذكي',
      action: 'إعداد AI',
      link: '/dashboard/ai',
      icon: BotIcon,
      severity: 'low',
    });
  }

  return suggestions.slice(0, 4);
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

  // ─── جلب معلومات السيرفر ───
  const { data: guildInfo, isLoading: loadingInfo, isError } = useQuery({
    queryKey: ['guild-info', selectedGuildId],
    queryFn: () => apiClient.get(`/api/guild/${selectedGuildId}/info`),
    enabled: !!selectedGuildId,
    staleTime: 1000 * 60 * 5,
  });

  // ─── جلب خطة السيرفر ───
  const { data: planData, isLoading: loadingPlan } = useQuery({
    queryKey: ['guild-plan', selectedGuildId],
    queryFn: () => apiClient.get(`/api/guild/${selectedGuildId}/plan`),
    enabled: !!selectedGuildId,
    staleTime: 1000 * 60 * 5,
  });

  // ─── جلب overview (health score + stats) ───
  const { data: overview, isLoading: loadingOverview } = useQuery({
    queryKey: ['guild-overview', selectedGuildId],
    queryFn: () => guildApi.overview(selectedGuildId),
    enabled: !!selectedGuildId,
    staleTime: 1000 * 60 * 2,
  });

  // ─── جلب الإعدادات لتوليد الاقتراحات ───
  const { data: protection } = useQuery({
    queryKey: ['guild-protection', selectedGuildId],
    queryFn: () => settingsApi.getProtection(selectedGuildId),
    enabled: !!selectedGuildId,
    staleTime: 1000 * 60 * 5,
    retry: false,
  });

  const { data: logs } = useQuery({
    queryKey: ['guild-logs', selectedGuildId],
    queryFn: () => settingsApi.getLogs(selectedGuildId),
    enabled: !!selectedGuildId,
    staleTime: 1000 * 60 * 5,
    retry: false,
  });

  const { data: welcome } = useQuery({
    queryKey: ['guild-welcome', selectedGuildId],
    queryFn: () => settingsApi.getWelcome(selectedGuildId),
    enabled: !!selectedGuildId,
    staleTime: 1000 * 60 * 5,
    retry: false,
  });

  const { data: ai } = useQuery({
    queryKey: ['guild-ai-settings', selectedGuildId],
    queryFn: () => settingsApi.getAi(selectedGuildId),
    enabled: !!selectedGuildId,
    staleTime: 1000 * 60 * 5,
    retry: false,
  });

  const suggestions = buildSuggestions({ protection, logs, welcome, ai });

  // ─── Loading ───
  if (loadingInfo || loadingPlan) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 rounded-2xl" />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="p-8 text-center">
        <ServerCrash className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
        <h3 className="font-bold mb-1">فشل تحميل بيانات السيرفر</h3>
        <p className="text-sm text-muted-foreground">حاول إعادة تحميل الصفحة</p>
      </Card>
    );
  }

  const planId = planData?.plan || 'free';
  const planCfg = PLAN_CONFIG[planId] || PLAN_CONFIG.free;
  const PlanIcon = planCfg.icon;

  const guild = guildInfo || selectedGuild || {};
  const iconUrl = guild?.icon
    ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128`
    : null;

  const healthScore = overview?.healthScore?.total || 0;
  const breakdown = overview?.healthScore?.breakdown || {};
  const stats = overview?.stats || {};

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
            <p className="text-muted-foreground text-sm mb-4">
              مرحباً{' '}
              <span className="lyn-text-gradient font-semibold">{user?.username || ''}</span>
              {' '}— إليك نظرة عامة على سيرفرك
            </p>

            {/* Health breakdown badges */}
            {!loadingOverview && Object.keys(breakdown).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {Object.entries(breakdown).map(([key, val]) => (
                  <div
                    key={key}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/40 text-xs"
                  >
                    <span className="text-muted-foreground">{val.label}:</span>
                    <span
                      className={cn(
                        'font-bold num',
                        val.score >= 80 && 'text-emerald-500',
                        val.score < 80 && val.score >= 60 && 'text-amber-500',
                        val.score < 60 && 'text-destructive',
                      )}
                    >
                      {val.score}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-center">
            {loadingOverview ? (
              <Skeleton className="w-36 h-36 rounded-full" />
            ) : (
              <HealthScoreCircle score={healthScore} />
            )}
          </div>
        </div>
      </Card>

      {/* ── Stats Cards ── */}
      <StatCardGrid cols={4}>
        <StatCard
          icon={<Users />}
          label="الأعضاء"
          value={guildInfo?.memberCount || stats.members?.value || 0}
          change={stats.members?.change}
          gradient="from-violet-500 to-pink-500"
          format="compact"
          hint="إجمالي السيرفر"
        />
        <StatCard
          icon={<MessageSquare />}
          label="الرسائل (24س)"
          value={stats.messages24h?.value || 0}
          change={stats.messages24h?.change}
          gradient="from-emerald-500 to-cyan-500"
          format="compact"
          hint={stats.messages24h?.value > 0 ? undefined : 'قريباً'}
        />
        <StatCard
          icon={<Bot />}
          label="الأوامر (24س)"
          value={stats.commands24h?.value || 0}
          change={stats.commands24h?.change}
          gradient="from-amber-500 to-orange-500"
          format="number"
          hint={
            stats.commands24h?.aiPortion
              ? `منها ${stats.commands24h.aiPortion} AI`
              : stats.commands24h?.value > 0
              ? undefined
              : 'قريباً'
          }
        />
        <StatCard
          icon={<Gavel />}
          label="إشراف (7 أيام)"
          value={stats.modActions7d?.value || 0}
          change={stats.modActions7d?.change}
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

      {/* ── Suggestions (مبنية على الإعدادات الفعلية) ── */}
      {suggestions.length > 0 && (
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
      )}

      {/* لو كل شي مفعّل — رسالة تشجيعية */}
      {suggestions.length === 0 && !loadingOverview && (
        <Card className="p-5 bg-gradient-to-l from-emerald-500/5 to-transparent border-emerald-500/30">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold">سيرفرك في حالة ممتازة! 🎉</h3>
              <p className="text-sm text-muted-foreground">
                كل الأنظمة الأساسية مفعّلة — استمر بالتطوير
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
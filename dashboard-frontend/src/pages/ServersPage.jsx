import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Users,
  Crown,
  Medal,
  Sparkles,
  Diamond,
  Settings,
  Plus,
  ExternalLink,
  ServerCrash,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { useGuildStore } from '@/store/guildStore';
import { apiClient } from '@/api/client';
import { env } from '@/config/env';

// ─── Plan config ──────────────────────────────────────────────
const PLAN_CONFIG = {
  diamond: {
    label: 'ماسي',
    icon: Diamond,
    gradient: 'from-cyan-400 to-blue-500',
    badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    glow: 'shadow-cyan-500/20',
  },
  gold: {
    label: 'ذهبي',
    icon: Crown,
    gradient: 'from-yellow-400 to-orange-500',
    badge: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    glow: 'shadow-yellow-500/20',
  },
  silver: {
    label: 'فضي',
    icon: Medal,
    gradient: 'from-slate-300 to-slate-500',
    badge: 'bg-slate-400/10 text-slate-300 border-slate-400/20',
    glow: 'shadow-slate-400/20',
  },
  free: {
    label: 'مجاني',
    icon: Sparkles,
    gradient: 'from-zinc-500 to-zinc-700',
    badge: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
    glow: '',
  },
};

async function fetchGuildPlan(guildId) {
  try {
    const data = await apiClient.get(`/api/guild/${guildId}/plan`);
    return data?.plan_id || 'free';
  } catch {
    return 'free';
  }
}

// ─── بطاقة سيرفر ─────────────────────────────────────────────
function ServerCard({ guild, plan, onManage, botInviteUrl }) {
  const cfg = PLAN_CONFIG[plan] || PLAN_CONFIG.free;
  const PlanIcon = cfg.icon;
  const hasBot = guild.hasBot;

  const iconUrl = guild.icon
    ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128`
    : null;

  return (
    <div
      className={cn(
        'group relative rounded-2xl border border-border bg-card overflow-hidden',
        'transition-all duration-300 hover:border-primary/40 hover:shadow-lg',
        cfg.glow && `hover:shadow-lg hover:${cfg.glow}`,
      )}
    >
      <div className={cn('h-1.5 w-full bg-gradient-to-r', cfg.gradient)} />

      <div className="p-5">
        <div className="flex items-start gap-4 mb-4">
          <div className="relative flex-shrink-0">
            {iconUrl ? (
              <img
                src={iconUrl}
                alt={guild.name}
                className="w-14 h-14 rounded-xl object-cover"
              />
            ) : (
              <div
                className={cn(
                  'w-14 h-14 rounded-xl flex items-center justify-center',
                  'bg-gradient-to-br text-white font-bold text-xl',
                  cfg.gradient,
                )}
              >
                {guild.name.slice(0, 1)}
              </div>
            )}
            <span
              className={cn(
                'absolute -bottom-1 -left-1 w-4 h-4 rounded-full border-2 border-card',
                hasBot ? 'bg-emerald-500' : 'bg-zinc-500',
              )}
              title={hasBot ? 'البوت موجود' : 'البوت غير موجود'}
            />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-base truncate mb-1">{guild.name}</h3>
            <span
              className={cn(
                'inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border',
                cfg.badge,
              )}
            >
              <PlanIcon className="w-3 h-3" />
              {cfg.label}
            </span>
          </div>
        </div>

        <p className="text-xs text-muted-foreground mb-4 font-mono truncate">{guild.id}</p>

        {hasBot ? (
          <button
            onClick={() => onManage(guild)}
            className={cn(
              'w-full flex items-center justify-center gap-2 py-2.5 rounded-xl',
              'text-sm font-semibold text-white transition-all duration-200',
              'bg-gradient-to-r from-lyn-500 to-lyn-pink-500',
              'hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]',
              'shadow-md shadow-lyn-500/20',
            )}
          >
            <Settings className="w-4 h-4" />
            إدارة السيرفر
          </button>
        ) : (
          <a
            href={botInviteUrl}
            target="_blank"
            rel="noreferrer"
            className={cn(
              'w-full flex items-center justify-center gap-2 py-2.5 rounded-xl',
              'text-sm font-semibold transition-all duration-200',
              'border border-border hover:border-primary/50',
              'hover:bg-primary/5 active:scale-[0.98]',
            )}
          >
            <Plus className="w-4 h-4" />
            أضف البوت
            <ExternalLink className="w-3 h-3 opacity-60" />
          </a>
        )}
      </div>
    </div>
  );
}

// ─── الصفحة ───────────────────────────────────────────────────
export default function ServersPage() {
  const navigate = useNavigate();
  const { guilds: rawGuilds } = useAuthStore();
  const { setSelectedGuild } = useGuildStore();

  const [search, setSearch] = useState('');
  const [plans, setPlans] = useState({});
  const [botGuildIds, setBotGuildIds] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const botInviteUrl =
    env.BOT_INVITE_URL ||
    `https://discord.com/oauth2/authorize?client_id=${env.DISCORD_CLIENT_ID}&permissions=8&scope=bot%20applications.commands`;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        let botIds = [];
        try {
          const res = await apiClient.get('/api/bot/guilds');
          botIds = Array.isArray(res) ? res : [];
        } catch {
          botIds = [];
        }

        if (!cancelled) setBotGuildIds(botIds);

        const planResults = {};
        await Promise.allSettled(
          rawGuilds
            .filter((g) => botIds.includes(g.id))
            .map(async (g) => {
              planResults[g.id] = await fetchGuildPlan(g.id);
            }),
        );

        if (!cancelled) {
          setPlans(planResults);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError('فشل تحميل بيانات السيرفرات');
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [rawGuilds]);

  const guilds = rawGuilds
    .map((g) => ({
      ...g,
      hasBot: botGuildIds ? botGuildIds.includes(g.id) : false,
    }))
    .filter((g) => (search ? g.name.toLowerCase().includes(search.toLowerCase()) : true));

  const sorted = [...guilds].sort((a, b) => {
    if (a.hasBot && !b.hasBot) return -1;
    if (!a.hasBot && b.hasBot) return 1;
    return 0;
  });

  const handleManage = (guild) => {
    setSelectedGuild(guild);
    navigate('/dashboard');
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="h-8 w-40 bg-muted/30 rounded-xl animate-pulse mb-2" />
        <div className="h-12 bg-muted/20 rounded-xl animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-52 bg-muted/10 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <ServerCrash className="w-16 h-16 text-destructive/60" />
        <p className="text-muted-foreground">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm"
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  const withBot = sorted.filter((g) => g.hasBot);
  const withoutBot = sorted.filter((g) => !g.hasBot);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold mb-1">اختر سيرفرك</h1>
        <p className="text-muted-foreground text-sm">
          {withBot.length} سيرفر فيه البوت · {withoutBot.length} بدون البوت
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="ابحث عن سيرفر..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pr-10 pl-4 py-3 rounded-xl bg-card border border-border text-sm focus:outline-none focus:border-primary/50 transition-colors"
        />
      </div>

      {/* Empty */}
      {guilds.length === 0 && (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3 text-center">
          <Users className="w-12 h-12 text-muted-foreground/40" />
          <p className="font-semibold">لا يوجد سيرفرات</p>
          <p className="text-sm text-muted-foreground">ما عندك أي سيرفر تملك فيه صلاحية المسؤول</p>
        </div>
      )}

      {/* مع البوت */}
      {withBot.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            سيرفرات البوت ({withBot.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {withBot.map((g) => (
              <ServerCard
                key={g.id}
                guild={g}
                plan={plans[g.id] || 'free'}
                onManage={handleManage}
                botInviteUrl={botInviteUrl}
              />
            ))}
          </div>
        </section>
      )}

      {/* بدون البوت */}
      {withoutBot.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-zinc-500 inline-block" />
            سيرفرات بدون البوت ({withoutBot.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {withoutBot.map((g) => (
              <ServerCard
                key={g.id}
                guild={g}
                plan="free"
                onManage={handleManage}
                botInviteUrl={botInviteUrl}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

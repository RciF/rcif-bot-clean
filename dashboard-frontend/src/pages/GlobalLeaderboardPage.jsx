/**
 * ═══════════════════════════════════════════════════════════
 *  GlobalLeaderboardPage v2 — Legendary Edition
 *  المسار: dashboard-frontend/src/pages/GlobalLeaderboardPage.jsx
 *
 *  ✨ NEW Features:
 *   • صور وأسماء Discord حقيقية
 *   • Badges (شارات) لكل لاعب
 *   • Top 3 podium ثلاثي مميز
 *   • Hall of Fame كرت ذهبي للأول
 *   • Search bar للبحث
 *   • Tabs مع icons ملونة
 *   • Animations سلسة
 *   • User Profile Modal (بضغطة على أي لاعب)
 * ═══════════════════════════════════════════════════════════
 */

import { useState, useEffect, useMemo } from 'react'
import {
  Trophy,
  Crown,
  Medal,
  Award,
  Coins,
  Star,
  Globe,
  Users,
  TrendingUp,
  RefreshCw,
  Sparkles,
  Search,
  X,
  Calendar,
  Flame,
  Server,
  Zap,
  Shield,
  Gem,
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Skeleton } from '@/components/ui/Skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { Badge } from '@/components/ui/Badge'
import { apiClient } from '@/api/client'
import { formatCompact, cn } from '@/lib/utils'
import { toast } from 'sonner'

// ════════════════════════════════════════════════════════════
//  Constants
// ════════════════════════════════════════════════════════════

const RANK_STYLES = {
  1: {
    icon: '👑',
    label: 'الأول',
    color: 'text-amber-400',
    bg: 'bg-gradient-to-br from-amber-500/20 via-yellow-500/10 to-amber-600/20',
    border: 'border-amber-400/40',
    glow: 'shadow-[0_0_30px_rgba(251,191,36,0.3)]',
  },
  2: {
    icon: '🥈',
    label: 'الثاني',
    color: 'text-slate-300',
    bg: 'bg-gradient-to-br from-slate-400/20 via-zinc-500/10 to-slate-500/20',
    border: 'border-slate-400/40',
    glow: 'shadow-[0_0_20px_rgba(148,163,184,0.2)]',
  },
  3: {
    icon: '🥉',
    label: 'الثالث',
    color: 'text-amber-600',
    bg: 'bg-gradient-to-br from-amber-700/20 via-orange-600/10 to-amber-800/20',
    border: 'border-amber-700/40',
    glow: 'shadow-[0_0_15px_rgba(180,83,9,0.2)]',
  },
}

const BADGE_COLORS = {
  sky:     'bg-sky-500/15 text-sky-300 border-sky-500/30',
  amber:   'bg-amber-500/15 text-amber-300 border-amber-500/30',
  emerald: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  violet:  'bg-violet-500/15 text-violet-300 border-violet-500/30',
  rose:    'bg-rose-500/15 text-rose-300 border-rose-500/30',
}

// ════════════════════════════════════════════════════════════
//  Main Page
// ════════════════════════════════════════════════════════════

export default function GlobalLeaderboardPage() {
  const [stats, setStats] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)

  const loadStats = async () => {
    try {
      const r = await apiClient.get('/api/global/stats')
      setStats(r?.data ?? r)
    } catch {
      setStats({})
    }
  }

  useEffect(() => {
    loadStats()
  }, [])

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadStats()
    setRefreshing(false)
    toast.success('تم التحديث')
  }

  return (
    <div className="space-y-8">
      {/* ─── Header ─── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl lyn-gradient flex items-center justify-center lyn-glow">
              <Trophy className="w-8 h-8 text-white" />
            </div>
            <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center text-sm">
              👑
            </div>
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold lyn-text-gradient">
              قائمة المتصدرين العالمية
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              الأقوى في عالم Lyn — كل السيرفرات في مكان واحد ✨
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
          <span>تحديث</span>
        </Button>
      </div>

      {/* ─── Stats Bar ─── */}
      {stats === null ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={<Globe className="w-5 h-5" />}
            label="السيرفرات"
            value={formatCompact(stats?.guilds?.total || 0)}
            color="violet"
          />
          <StatCard
            icon={<Users className="w-5 h-5" />}
            label="اللاعبين النشطين"
            value={formatCompact(stats?.xp?.active_users || 0)}
            color="emerald"
          />
          <StatCard
            icon={<Coins className="w-5 h-5" />}
            label="إجمالي الفلوس"
            value={formatCompact(stats?.economy?.total_money || 0)}
            color="amber"
          />
          <StatCard
            icon={<Star className="w-5 h-5" />}
            label="أعلى مستوى"
            value={stats?.xp?.highest_level || 0}
            color="sky"
          />
        </div>
      )}

      {/* ─── Tabs ─── */}
      <Tabs defaultValue="economy">
        <TabsList className="flex-wrap">
          <TabsTrigger value="economy" variant="pills">
            <Coins className="w-4 h-4" />
            <span>الأغنى</span>
          </TabsTrigger>
          <TabsTrigger value="xp" variant="pills">
            <Star className="w-4 h-4" />
            <span>الأعلى XP</span>
          </TabsTrigger>
          <TabsTrigger value="level" variant="pills">
            <Award className="w-4 h-4" />
            <span>الأعلى مستوى</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="economy">
          <EconomyLeaderboard onUserClick={setSelectedUser} />
        </TabsContent>
        <TabsContent value="xp">
          <XPLeaderboard onUserClick={setSelectedUser} />
        </TabsContent>
        <TabsContent value="level">
          <LevelLeaderboard onUserClick={setSelectedUser} />
        </TabsContent>
      </Tabs>

      {/* ─── User Profile Modal ─── */}
      {selectedUser && (
        <UserProfileModal
          userId={selectedUser}
          onClose={() => setSelectedUser(null)}
        />
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════
//  StatCard
// ════════════════════════════════════════════════════════════

function StatCard({ icon, label, value, color }) {
  const colors = {
    violet:  'from-violet-500/20 to-violet-500/5 border-violet-500/30 text-violet-400',
    emerald: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/30 text-emerald-400',
    amber:   'from-amber-500/20 to-amber-500/5 border-amber-500/30 text-amber-400',
    sky:     'from-sky-500/20 to-sky-500/5 border-sky-500/30 text-sky-400',
  }
  return (
    <Card className={cn('p-4 bg-gradient-to-br border hover:scale-105 transition-transform', colors[color])}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-card/50 flex items-center justify-center">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground truncate">{label}</p>
          <p className="text-xl font-bold truncate">{value}</p>
        </div>
      </div>
    </Card>
  )
}

// ════════════════════════════════════════════════════════════
//  Leaderboard Wrappers
// ════════════════════════════════════════════════════════════

function EconomyLeaderboard({ onUserClick }) {
  const [data, setData] = useState(null)

  useEffect(() => {
    apiClient
      .get('/api/global/leaderboard/economy?limit=100')
      .then((r) => setData(r?.data ?? r))
      .catch(() => setData({ leaderboard: [] }))
  }, [])

  return (
    <LeaderboardList
      data={data}
      type="economy"
      onUserClick={onUserClick}
      emptyText="ما فيه لاعبين في الاقتصاد بعد"
      emptyIcon={<Coins className="w-16 h-16" />}
    />
  )
}

function XPLeaderboard({ onUserClick }) {
  const [data, setData] = useState(null)

  useEffect(() => {
    apiClient
      .get('/api/global/leaderboard/xp?limit=100')
      .then((r) => setData(r?.data ?? r))
      .catch(() => setData({ leaderboard: [] }))
  }, [])

  return (
    <LeaderboardList
      data={data}
      type="xp"
      onUserClick={onUserClick}
      emptyText="ما فيه XP بعد"
      emptyIcon={<Star className="w-16 h-16" />}
    />
  )
}

function LevelLeaderboard({ onUserClick }) {
  const [data, setData] = useState(null)

  useEffect(() => {
    apiClient
      .get('/api/global/leaderboard/level?limit=100')
      .then((r) => setData(r?.data ?? r))
      .catch(() => setData({ leaderboard: [] }))
  }, [])

  return (
    <LeaderboardList
      data={data}
      type="level"
      onUserClick={onUserClick}
      emptyText="ما فيه مستويات بعد"
      emptyIcon={<Award className="w-16 h-16" />}
    />
  )
}

// ════════════════════════════════════════════════════════════
//  LeaderboardList
// ════════════════════════════════════════════════════════════

function LeaderboardList({ data, type, onUserClick, emptyText, emptyIcon }) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!data?.leaderboard) return []
    if (!search.trim()) return data.leaderboard
    const q = search.trim().toLowerCase()
    return data.leaderboard.filter(
      (row) =>
        String(row.username || '').toLowerCase().includes(q) ||
        String(row.user_id).includes(q),
    )
  }, [data, search])

  if (data === null) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-32 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    )
  }

  const list = filtered
  const fullList = data.leaderboard || []

  if (fullList.length === 0) {
    return (
      <Card className="p-12 text-center">
        <div className="text-muted-foreground/30 mb-4 flex justify-center">{emptyIcon}</div>
        <p className="text-muted-foreground">{emptyText}</p>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* ─── Hall of Fame — رقم 1 كرت ضخم ─── */}
      {!search && fullList[0] && (
        <HallOfFameCard row={fullList[0]} type={type} onClick={() => onUserClick(fullList[0].user_id)} />
      )}

      {/* ─── Top 2 & 3 ─── */}
      {!search && fullList.length >= 2 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {fullList.slice(1, 3).map((row) => (
            <PodiumCard
              key={row.user_id + (row.guild_id || '')}
              row={row}
              type={type}
              onClick={() => onUserClick(row.user_id)}
            />
          ))}
        </div>
      )}

      {/* ─── Search ─── */}
      <div className="relative">
        <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث باسم أو ID..."
          className="pr-9"
        />
      </div>

      {/* ─── Rest of leaderboard ─── */}
      <div className="space-y-2">
        {(search ? list : list.slice(3)).map((row) => (
          <LeaderboardRow
            key={row.user_id + (row.guild_id || '')}
            row={row}
            type={type}
            onClick={() => onUserClick(row.user_id)}
          />
        ))}
        {search && list.length === 0 && (
          <Card className="p-6 text-center text-muted-foreground">
            <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
            ما لقينا نتائج
          </Card>
        )}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
//  Hall of Fame Card — رقم 1 الفخم
// ════════════════════════════════════════════════════════════

function HallOfFameCard({ row, type, onClick }) {
  const style = RANK_STYLES[1]
  return (
    <Card
      className={cn(
        'p-6 cursor-pointer hover:scale-[1.01] transition-all border-2',
        style.bg,
        style.border,
        style.glow,
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-5 flex-wrap md:flex-nowrap">
        {/* Rank */}
        <div className="text-6xl">{style.icon}</div>

        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <img
            src={row.avatar_url}
            alt={row.username}
            className="w-20 h-20 rounded-full border-4 border-amber-400/50"
            loading="lazy"
            onError={(e) => {
              e.target.src = `https://cdn.discordapp.com/embed/avatars/0.png`
            }}
          />
          <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center text-sm border-2 border-background">
            <Crown className="w-4 h-4 text-white" />
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-amber-400 font-semibold uppercase tracking-wider mb-1">
            👑 الأسطورة العليا
          </p>
          <h3 className="text-2xl font-bold mb-1 truncate">{row.username}</h3>
          <p className="text-xs text-muted-foreground font-mono mb-2">{row.user_id}</p>

          {/* Badges */}
          {row.badges?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {row.badges.map((b, i) => (
                <BadgePill key={i} badge={b} />
              ))}
            </div>
          )}
        </div>

        {/* Value */}
        <div className="text-center px-4 py-3 rounded-xl bg-card/40 border border-amber-500/20 flex-shrink-0">
          <ValueDisplay row={row} type={type} large />
        </div>
      </div>
    </Card>
  )
}

// ════════════════════════════════════════════════════════════
//  Podium Card — رقم 2 و 3
// ════════════════════════════════════════════════════════════

function PodiumCard({ row, type, onClick }) {
  const style = RANK_STYLES[row.rank]

  return (
    <Card
      className={cn(
        'p-4 cursor-pointer hover:scale-105 transition-all border-2',
        style.bg,
        style.border,
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <div className="text-3xl flex-shrink-0">{style.icon}</div>

        <img
          src={row.avatar_url}
          alt={row.username}
          className="w-12 h-12 rounded-full"
          loading="lazy"
          onError={(e) => {
            e.target.src = `https://cdn.discordapp.com/embed/avatars/0.png`
          }}
        />

        <div className="flex-1 min-w-0">
          <p className={cn('text-xs font-semibold mb-0.5', style.color)}>
            {style.label}
          </p>
          <p className="font-bold truncate">{row.username}</p>
          <div className="mt-1">
            <ValueDisplay row={row} type={type} />
          </div>
        </div>
      </div>

      {row.badges?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-border/50">
          {row.badges.slice(0, 3).map((b, i) => (
            <BadgePill key={i} badge={b} small />
          ))}
        </div>
      )}
    </Card>
  )
}

// ════════════════════════════════════════════════════════════
//  Leaderboard Row (rank 4+)
// ════════════════════════════════════════════════════════════

function LeaderboardRow({ row, type, onClick }) {
  return (
    <Card className="p-3 hover:bg-card/80 cursor-pointer transition-colors" onClick={onClick}>
      <div className="flex items-center gap-3">
        {/* Rank */}
        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center font-bold text-muted-foreground flex-shrink-0">
          #{row.rank}
        </div>

        {/* Avatar */}
        <img
          src={row.avatar_url}
          alt={row.username}
          className="w-10 h-10 rounded-full"
          loading="lazy"
          onError={(e) => {
            e.target.src = `https://cdn.discordapp.com/embed/avatars/0.png`
          }}
        />

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{row.username}</p>
          <div className="flex items-center gap-2 flex-wrap mt-0.5">
            {row.badges?.slice(0, 2).map((b, i) => (
              <BadgePill key={i} badge={b} small />
            ))}
          </div>
        </div>

        {/* Value */}
        <div className="text-left flex-shrink-0">
          <ValueDisplay row={row} type={type} />
        </div>
      </div>
    </Card>
  )
}

// ════════════════════════════════════════════════════════════
//  Value Display (يختلف حسب type)
// ════════════════════════════════════════════════════════════

function ValueDisplay({ row, type, large }) {
  const valueSize = large ? 'text-3xl' : 'text-base'

  if (type === 'economy') {
    return (
      <div className="text-left">
        <p className={cn('font-bold text-amber-400 font-mono', valueSize)}>
          {formatCompact(row.total)}
        </p>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          🪙 {formatCompact(row.coins)} • 🏦 {formatCompact(row.bank)}
        </p>
        {row.daily_streak > 0 && (
          <p className="text-[10px] text-rose-400 mt-0.5">
            🔥 سلسلة {row.daily_streak}
          </p>
        )}
      </div>
    )
  }

  if (type === 'xp') {
    return (
      <div className="text-left">
        <p className={cn('font-bold text-violet-400 font-mono', valueSize)}>
          {formatCompact(row.total_xp)} XP
        </p>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          🎮 {row.servers_count} سيرفر • 📈 Lv.{row.highest_level}
        </p>
      </div>
    )
  }

  if (type === 'level') {
    return (
      <div className="text-left">
        <p className={cn('font-bold text-sky-400 font-mono', valueSize)}>
          Lv.{row.level}
        </p>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          ⭐ {formatCompact(row.total_xp)} XP
        </p>
      </div>
    )
  }
}

// ════════════════════════════════════════════════════════════
//  Badge Pill
// ════════════════════════════════════════════════════════════

function BadgePill({ badge, small }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-medium',
        small ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs',
        BADGE_COLORS[badge.color] || BADGE_COLORS.violet,
      )}
    >
      <span>{badge.icon}</span>
      <span>{badge.label}</span>
    </span>
  )
}

// ════════════════════════════════════════════════════════════
//  User Profile Modal
// ════════════════════════════════════════════════════════════

function UserProfileModal({ userId, onClose }) {
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    apiClient
      .get(`/api/global/user/${userId}`)
      .then((r) => setProfile(r?.data ?? r))
      .catch(() => setProfile({ error: true }))
  }, [userId])

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <Card
        className="max-w-md w-full p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-bold">البروفايل العالمي</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {profile === null ? (
          <div className="space-y-3">
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </div>
        ) : profile?.error ? (
          <p className="text-center text-muted-foreground py-8">فشل تحميل البروفايل</p>
        ) : (
          <div className="space-y-4">
            {/* Header */}
            <div className="text-center pb-4 border-b border-border">
              <img
                src={profile.avatar_url}
                alt={profile.username}
                className="w-20 h-20 rounded-full mx-auto mb-3 border-4 border-primary/30"
                onError={(e) => {
                  e.target.src = `https://cdn.discordapp.com/embed/avatars/0.png`
                }}
              />
              <h2 className="text-xl font-bold">{profile.username}</h2>
              <p className="text-xs text-muted-foreground font-mono">{profile.user_id}</p>
              {profile.subscription && (
                <Badge variant="secondary" className="mt-2">
                  ✨ {profile.subscription.plan_id}
                </Badge>
              )}
            </div>

            {/* Economy */}
            <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
              <h4 className="text-sm font-bold mb-2 flex items-center gap-2 text-amber-400">
                <Coins className="w-4 h-4" />
                الاقتصاد
              </h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">الرصيد الكامل</p>
                  <p className="font-bold text-amber-400">{formatCompact(profile.economy?.total || 0)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">الترتيب العالمي</p>
                  <p className="font-bold">
                    {profile.economy?.rank ? `#${profile.economy.rank}` : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">🪙 Coins</p>
                  <p className="font-bold">{formatCompact(profile.economy?.coins || 0)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">🏦 Bank</p>
                  <p className="font-bold">{formatCompact(profile.economy?.bank || 0)}</p>
                </div>
              </div>
            </div>

            {/* XP */}
            <div className="p-4 rounded-xl bg-violet-500/5 border border-violet-500/20">
              <h4 className="text-sm font-bold mb-2 flex items-center gap-2 text-violet-400">
                <Star className="w-4 h-4" />
                الخبرة (XP)
              </h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">إجمالي XP</p>
                  <p className="font-bold text-violet-400">{formatCompact(profile.xp?.total_xp || 0)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">الترتيب العالمي</p>
                  <p className="font-bold">
                    {profile.xp?.rank ? `#${profile.xp.rank}` : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">🎮 السيرفرات</p>
                  <p className="font-bold">{profile.xp?.servers || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">📈 أعلى مستوى</p>
                  <p className="font-bold">Lv.{profile.xp?.highest_level || 0}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
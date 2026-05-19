/**
 * ═══════════════════════════════════════════════════════════
 *  GlobalLeaderboardPage v3 — Mega Legendary Edition
 *  المسار: dashboard-frontend/src/pages/GlobalLeaderboardPage.jsx
 *
 *  ✨ 5 تبويبات أسطورية:
 *   • 💰 الأغنى — رصيد + بنك
 *   • 💎 الثروة — رصيد + بنك + قيمة الممتلكات (Net Worth)
 *   • 📦 الممتلكات — أكثر عناصر في الـ Inventory
 *   • ⭐ الأعلى XP — إجمالي عبر كل السيرفرات
 *   • 🏆 أعلى مستوى — أعلى Level محقق
 *
 *  + Hall of Fame Card (الأول)
 *  + Podium للثاني والثالث (فضي + برونزي)
 *  + Search bar مع filters
 *  + Profile Modal كامل
 *  + Badges & Achievements
 *  + Animations سلسة
 * ═══════════════════════════════════════════════════════════
 */

import { useState, useEffect, useMemo } from 'react'
import {
  Trophy, Crown, Coins, Star, Award, Gem, Package,
  Globe, Users, RefreshCw, Search, X, TrendingUp, Wallet, Building2,
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
    bg: 'bg-gradient-to-br from-amber-500/25 via-yellow-500/15 to-amber-600/25',
    border: 'border-amber-400/50',
    glow: 'shadow-[0_0_40px_rgba(251,191,36,0.35)]',
  },
  2: {
    icon: '🥈',
    label: 'الثاني',
    color: 'text-slate-300',
    bg: 'bg-gradient-to-br from-slate-400/20 via-zinc-500/10 to-slate-500/20',
    border: 'border-slate-400/40',
    glow: 'shadow-[0_0_25px_rgba(148,163,184,0.25)]',
  },
  3: {
    icon: '🥉',
    label: 'الثالث',
    color: 'text-amber-600',
    bg: 'bg-gradient-to-br from-amber-700/20 via-orange-600/10 to-amber-800/20',
    border: 'border-amber-700/40',
    glow: 'shadow-[0_0_20px_rgba(180,83,9,0.25)]',
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
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard
            icon={<Globe />}
            label="السيرفرات"
            value={formatCompact(stats?.guilds?.total || 0)}
            color="violet"
          />
          <StatCard
            icon={<Users />}
            label="اللاعبين"
            value={formatCompact(stats?.xp?.active_users || 0)}
            color="emerald"
          />
          <StatCard
            icon={<Coins />}
            label="إجمالي الفلوس"
            value={formatCompact(stats?.economy?.total_money || 0)}
            color="amber"
          />
          <StatCard
            icon={<Package />}
            label="الممتلكات"
            value={formatCompact(stats?.items?.total_items || 0)}
            color="rose"
          />
          <StatCard
            icon={<Star />}
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
          <TabsTrigger value="networth" variant="pills">
            <Gem className="w-4 h-4" />
            <span>الثروة الكاملة</span>
          </TabsTrigger>
          <TabsTrigger value="items" variant="pills">
            <Package className="w-4 h-4" />
            <span>أكثر ممتلكات</span>
          </TabsTrigger>
          <TabsTrigger value="xp" variant="pills">
            <Star className="w-4 h-4" />
            <span>الأعلى XP</span>
          </TabsTrigger>
          <TabsTrigger value="level" variant="pills">
            <Award className="w-4 h-4" />
            <span>أعلى مستوى</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="economy">
          <LeaderboardTab endpoint="economy" type="economy" onUserClick={setSelectedUser} />
        </TabsContent>
        <TabsContent value="networth">
          <LeaderboardTab endpoint="networth" type="networth" onUserClick={setSelectedUser} />
        </TabsContent>
        <TabsContent value="items">
          <LeaderboardTab endpoint="items" type="items" onUserClick={setSelectedUser} />
        </TabsContent>
        <TabsContent value="xp">
          <LeaderboardTab endpoint="xp" type="xp" onUserClick={setSelectedUser} />
        </TabsContent>
        <TabsContent value="level">
          <LeaderboardTab endpoint="level" type="level" onUserClick={setSelectedUser} />
        </TabsContent>
      </Tabs>

      {/* ─── Profile Modal ─── */}
      {selectedUser && (
        <UserProfileModal userId={selectedUser} onClose={() => setSelectedUser(null)} />
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
    rose:    'from-rose-500/20 to-rose-500/5 border-rose-500/30 text-rose-400',
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
//  Generic Leaderboard Tab
// ════════════════════════════════════════════════════════════

function LeaderboardTab({ endpoint, type, onUserClick }) {
  const [data, setData] = useState(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    setData(null)
    apiClient
      .get(`/api/global/leaderboard/${endpoint}?limit=100`)
      .then((r) => setData(r?.data ?? r))
      .catch(() => setData({ leaderboard: [], error: true }))
  }, [endpoint])

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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    )
  }

  const fullList = data.leaderboard || []
  const emptyConfig = getEmptyConfig(type)

  if (fullList.length === 0) {
    return (
      <Card className="p-12 text-center">
        <div className="text-muted-foreground/30 mb-4 flex justify-center">{emptyConfig.icon}</div>
        <p className="text-muted-foreground">
          {data.error ? 'فشل تحميل البيانات — البوت غير متاح حالياً' : emptyConfig.text}
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Hall of Fame — رقم 1 */}
      {!search && fullList[0] && (
        <HallOfFameCard row={fullList[0]} type={type} onClick={() => onUserClick(fullList[0].user_id)} />
      )}

      {/* Top 2 & 3 */}
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

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث باسم أو ID..."
          className="pr-9"
        />
      </div>

      {/* Rest */}
      <div className="space-y-2">
        {(search ? filtered : filtered.slice(3)).map((row) => (
          <LeaderboardRow
            key={row.user_id + (row.guild_id || '')}
            row={row}
            type={type}
            onClick={() => onUserClick(row.user_id)}
          />
        ))}
        {search && filtered.length === 0 && (
          <Card className="p-6 text-center text-muted-foreground">
            <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
            ما لقينا نتائج
          </Card>
        )}
      </div>
    </div>
  )
}

function getEmptyConfig(type) {
  const map = {
    economy:  { icon: <Coins className="w-16 h-16" />,   text: 'ما فيه لاعبين في الاقتصاد بعد' },
    networth: { icon: <Gem className="w-16 h-16" />,     text: 'ما فيه ثروة بعد' },
    items:    { icon: <Package className="w-16 h-16" />, text: 'ما فيه ممتلكات بعد' },
    xp:       { icon: <Star className="w-16 h-16" />,    text: 'ما فيه XP بعد' },
    level:    { icon: <Award className="w-16 h-16" />,   text: 'ما فيه مستويات بعد' },
  }
  return map[type] || map.economy
}

// ════════════════════════════════════════════════════════════
//  Hall of Fame Card
// ════════════════════════════════════════════════════════════

function HallOfFameCard({ row, type, onClick }) {
  const style = RANK_STYLES[1]
  const titleText = getTitleText(type)

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
        <div className="text-6xl drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]">{style.icon}</div>

        <div className="relative flex-shrink-0">
          <img
            src={row.avatar_url}
            alt={row.username}
            className="w-20 h-20 rounded-full border-4 border-amber-400/50 shadow-lg"
            loading="lazy"
            onError={(e) => {
              e.target.src = `https://cdn.discordapp.com/embed/avatars/0.png`
            }}
          />
          <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center text-sm border-2 border-background">
            <Crown className="w-4 h-4 text-white" />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-xs text-amber-400 font-semibold uppercase tracking-wider mb-1">
            👑 {titleText}
          </p>
          <h3 className="text-2xl font-bold mb-1 truncate">{row.username}</h3>
          <p className="text-xs text-muted-foreground font-mono mb-2">{row.user_id}</p>

          {row.badges?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {row.badges.map((b, i) => (
                <BadgePill key={i} badge={b} />
              ))}
            </div>
          )}
        </div>

        <div className="text-center px-4 py-3 rounded-xl bg-card/40 border border-amber-500/20 flex-shrink-0 min-w-[140px]">
          <ValueDisplay row={row} type={type} large />
        </div>
      </div>
    </Card>
  )
}

function getTitleText(type) {
  const titles = {
    economy:  'الأسطورة المالية',
    networth: 'الإمبراطور',
    items:    'سيد المقتنيات',
    xp:       'الأسطورة العليا',
    level:    'البطل الأعلى',
  }
  return titles[type] || 'الأسطورة'
}

// ════════════════════════════════════════════════════════════
//  Podium Card (2 & 3)
// ════════════════════════════════════════════════════════════

function PodiumCard({ row, type, onClick }) {
  const style = RANK_STYLES[row.rank]
  return (
    <Card
      className={cn(
        'p-4 cursor-pointer hover:scale-105 transition-all border-2',
        style.bg,
        style.border,
        style.glow,
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <div className="text-3xl flex-shrink-0">{style.icon}</div>

        <img
          src={row.avatar_url}
          alt={row.username}
          className="w-12 h-12 rounded-full border-2 border-card"
          loading="lazy"
          onError={(e) => {
            e.target.src = `https://cdn.discordapp.com/embed/avatars/0.png`
          }}
        />

        <div className="flex-1 min-w-0">
          <p className={cn('text-xs font-semibold mb-0.5', style.color)}>{style.label}</p>
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
        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center font-bold text-muted-foreground flex-shrink-0">
          #{row.rank}
        </div>

        <img
          src={row.avatar_url}
          alt={row.username}
          className="w-10 h-10 rounded-full"
          loading="lazy"
          onError={(e) => {
            e.target.src = `https://cdn.discordapp.com/embed/avatars/0.png`
          }}
        />

        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{row.username}</p>
          <div className="flex items-center gap-2 flex-wrap mt-0.5">
            {row.badges?.slice(0, 2).map((b, i) => (
              <BadgePill key={i} badge={b} small />
            ))}
          </div>
        </div>

        <div className="text-left flex-shrink-0">
          <ValueDisplay row={row} type={type} />
        </div>
      </div>
    </Card>
  )
}

// ════════════════════════════════════════════════════════════
//  Value Display
// ════════════════════════════════════════════════════════════

function ValueDisplay({ row, type, large }) {
  const size = large ? 'text-3xl' : 'text-base'

  if (type === 'economy') {
    return (
      <div className="text-left">
        <p className={cn('font-bold text-amber-400 font-mono', size)}>
          {formatCompact(row.total)}
        </p>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          🪙 {formatCompact(row.coins)} • 🏦 {formatCompact(row.bank)}
        </p>
      </div>
    )
  }

  if (type === 'networth') {
    return (
      <div className="text-left">
        <p className={cn('font-bold text-sky-400 font-mono', size)}>
          {formatCompact(row.net_worth)}
        </p>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          💰 {formatCompact(row.cash_total)} • 📦 {row.total_items}
        </p>
      </div>
    )
  }

  if (type === 'items') {
    return (
      <div className="text-left">
        <p className={cn('font-bold text-rose-400 font-mono', size)}>
          {formatCompact(row.total_items)}
        </p>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          🌟 {row.unique_items} نوع • 💎 {formatCompact(row.items_value)}
        </p>
      </div>
    )
  }

  if (type === 'xp') {
    return (
      <div className="text-left">
        <p className={cn('font-bold text-violet-400 font-mono', size)}>
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
        <p className={cn('font-bold text-emerald-400 font-mono', size)}>
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
//  User Profile Modal — أسطوري شامل
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
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in"
      onClick={onClose}
    >
      <Card
        className="max-w-lg w-full p-0 max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {profile === null ? (
          <div className="p-6 space-y-3">
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </div>
        ) : profile?.error ? (
          <div className="p-12 text-center">
            <X className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-muted-foreground">فشل تحميل البروفايل</p>
            <Button variant="outline" onClick={onClose} className="mt-4">
              إغلاق
            </Button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="relative">
              <div
                className="h-24 lyn-gradient"
                style={
                  profile.accent_color
                    ? { background: `#${profile.accent_color.toString(16).padStart(6, '0')}` }
                    : undefined
                }
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="absolute top-2 left-2 bg-black/30 hover:bg-black/50 text-white"
              >
                <X className="w-4 h-4" />
              </Button>
              <div className="absolute -bottom-10 right-6">
                <img
                  src={profile.avatar_url}
                  alt={profile.username}
                  className="w-20 h-20 rounded-full border-4 border-card bg-card"
                  onError={(e) => {
                    e.target.src = `https://cdn.discordapp.com/embed/avatars/0.png`
                  }}
                />
              </div>
            </div>

            {/* Body */}
            <div className="p-6 pt-12 overflow-y-auto space-y-4">
              {/* Name */}
              <div>
                <h2 className="text-xl font-bold">{profile.username}</h2>
                <p className="text-xs text-muted-foreground font-mono">{profile.user_id}</p>
                {profile.subscription && (
                  <Badge variant="secondary" className="mt-2">
                    ✨ {profile.subscription.plan_id}
                  </Badge>
                )}
              </div>

              {/* Economy */}
              <StatBlock
                icon={<Coins className="w-4 h-4" />}
                title="الاقتصاد"
                color="amber"
                stats={[
                  { label: 'الرصيد الكامل', value: formatCompact(profile.economy?.total || 0), highlight: true },
                  { label: 'الترتيب العالمي', value: profile.economy?.rank ? `#${profile.economy.rank}` : '—' },
                  { label: '🪙 Coins', value: formatCompact(profile.economy?.coins || 0) },
                  { label: '🏦 Bank', value: formatCompact(profile.economy?.bank || 0) },
                ]}
              />

              {/* Net Worth */}
              {profile.networth && (profile.networth.net_worth > 0 || profile.networth.total_items > 0) && (
                <StatBlock
                  icon={<Gem className="w-4 h-4" />}
                  title="الثروة الكاملة"
                  color="sky"
                  stats={[
                    { label: 'صافي الثروة', value: formatCompact(profile.networth.net_worth || 0), highlight: true },
                    { label: '💰 السيولة', value: formatCompact(profile.networth.cash_total || 0) },
                    { label: '💎 قيمة الممتلكات', value: formatCompact(profile.networth.items_value || 0) },
                    { label: '📦 عدد العناصر', value: profile.networth.total_items || 0 },
                  ]}
                />
              )}

              {/* XP */}
              <StatBlock
                icon={<Star className="w-4 h-4" />}
                title="الخبرة والمستويات"
                color="violet"
                stats={[
                  { label: 'إجمالي XP', value: formatCompact(profile.xp?.total_xp || 0), highlight: true },
                  { label: 'الترتيب العالمي', value: profile.xp?.rank ? `#${profile.xp.rank}` : '—' },
                  { label: '🎮 السيرفرات', value: profile.xp?.servers || 0 },
                  { label: '📈 أعلى مستوى', value: `Lv.${profile.xp?.highest_level || 0}` },
                ]}
              />
            </div>
          </>
        )}
      </Card>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
//  Profile Stat Block
// ────────────────────────────────────────────────────────────

function StatBlock({ icon, title, color, stats }) {
  const colors = {
    amber:  'bg-amber-500/5 border-amber-500/20 text-amber-400',
    sky:    'bg-sky-500/5 border-sky-500/20 text-sky-400',
    violet: 'bg-violet-500/5 border-violet-500/20 text-violet-400',
  }

  return (
    <div className={cn('p-4 rounded-xl border', colors[color])}>
      <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
        {icon}
        {title}
      </h4>
      <div className="grid grid-cols-2 gap-3 text-sm">
        {stats.map((s, i) => (
          <div key={i}>
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={cn('font-bold', s.highlight && `text-${color}-400`)}>{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
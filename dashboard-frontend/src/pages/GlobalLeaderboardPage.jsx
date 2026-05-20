/**
 * ═══════════════════════════════════════════════════════════
 *  GlobalLeaderboardPage v5 — Simplified Edition
 *  المسار: dashboard-frontend/src/pages/GlobalLeaderboardPage.jsx
 *
 *  ✨ التغييرات في v5:
 *   - حذف الفلتر الزمني نهائياً (الداش = All-time فقط)
 *   - الفلاتر الزمنية موجودة في /متصدرين الديسكورد
 *   - بقاء كل شي ثاني: Stats Cards قابلة للضغط، Hall of Fame،
 *     Podium، Search، Pagination، Profile Modal
 * ═══════════════════════════════════════════════════════════
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Trophy, Crown, Coins, Star, Award, Gem, Package,
  Globe, Users, RefreshCw, Search, X, ChevronRight, ChevronLeft,
  Sparkles, AlertCircle,
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Skeleton } from '@/components/ui/Skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { apiClient } from '@/api/client'
import { formatCompact, cn } from '@/lib/utils'
import { toast } from 'sonner'

// ════════════════════════════════════════════════════════════
//  Constants
// ════════════════════════════════════════════════════════════

const PAGE_SIZE = 10

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

const STAT_TO_TAB = {
  servers:  null,
  players:  'xp',
  money:    'economy',
  items:    'items',
  topLevel: 'level',
}

// ════════════════════════════════════════════════════════════
//  Main Page Component
// ════════════════════════════════════════════════════════════

export default function GlobalLeaderboardPage() {
  const [stats, setStats] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [activeTab, setActiveTab] = useState('economy')

  const loadStats = useCallback(async () => {
    try {
      const r = await apiClient.get('/api/global/stats')
      setStats(r?.data ?? r)
    } catch {
      setStats({})
    }
  }, [])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadStats()
    setRefreshing(false)
    toast.success('تم التحديث')
  }

  const handleStatClick = (statKey) => {
    const targetTab = STAT_TO_TAB[statKey]
    if (targetTab) {
      setActiveTab(targetTab)
      const tabsEl = document.getElementById('leaderboard-tabs')
      if (tabsEl) {
        tabsEl.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  }

  return (
    <div className="space-y-8">
      <Header onRefresh={handleRefresh} refreshing={refreshing} />

      <StatsBar stats={stats} onStatClick={handleStatClick} activeTab={activeTab} />

      <div id="leaderboard-tabs">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
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
      </div>

      {selectedUser && (
        <UserProfileModal userId={selectedUser} onClose={() => setSelectedUser(null)} />
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════
//  Header
// ════════════════════════════════════════════════════════════

function Header({ onRefresh, refreshing }) {
  return (
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
            أقوى 100 لاعب في عالم Lyn — كل السيرفرات في مكان واحد ✨
          </p>
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={onRefresh} disabled={refreshing}>
        <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
        <span>تحديث</span>
      </Button>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
//  Stats Bar
// ════════════════════════════════════════════════════════════

function StatsBar({ stats, onStatClick, activeTab }) {
  if (stats === null) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      <StatCard
        statKey="topLevel"
        icon={<Star />}
        label="أعلى مستوى"
        value={stats?.xp?.highest_level || 0}
        color="sky"
        onClick={onStatClick}
        isActive={activeTab === STAT_TO_TAB.topLevel}
      />
      <StatCard
        statKey="items"
        icon={<Package />}
        label="الممتلكات"
        value={formatCompact(stats?.items?.total_items || 0)}
        color="rose"
        onClick={onStatClick}
        isActive={activeTab === STAT_TO_TAB.items}
      />
      <StatCard
        statKey="money"
        icon={<Coins />}
        label="إجمالي الفلوس"
        value={formatCompact(stats?.economy?.total_money || 0)}
        color="amber"
        onClick={onStatClick}
        isActive={activeTab === STAT_TO_TAB.money}
      />
      <StatCard
        statKey="players"
        icon={<Users />}
        label="اللاعبين"
        value={formatCompact(stats?.xp?.active_users || 0)}
        color="emerald"
        onClick={onStatClick}
        isActive={activeTab === STAT_TO_TAB.players}
      />
      <StatCard
        statKey="servers"
        icon={<Globe />}
        label="السيرفرات"
        value={formatCompact(stats?.guilds?.total || 0)}
        color="violet"
        onClick={onStatClick}
        isActive={false}
        clickable={false}
      />
    </div>
  )
}

function StatCard({ icon, label, value, color, statKey, onClick, isActive, clickable = true }) {
  const colors = {
    violet:  'from-violet-500/20 to-violet-500/5 border-violet-500/30 text-violet-400',
    emerald: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/30 text-emerald-400',
    amber:   'from-amber-500/20 to-amber-500/5 border-amber-500/30 text-amber-400',
    sky:     'from-sky-500/20 to-sky-500/5 border-sky-500/30 text-sky-400',
    rose:    'from-rose-500/20 to-rose-500/5 border-rose-500/30 text-rose-400',
  }

  const activeRing = {
    violet:  'ring-2 ring-violet-400/60',
    emerald: 'ring-2 ring-emerald-400/60',
    amber:   'ring-2 ring-amber-400/60',
    sky:     'ring-2 ring-sky-400/60',
    rose:    'ring-2 ring-rose-400/60',
  }

  const handleClick = () => {
    if (clickable && onClick) onClick(statKey)
  }

  return (
    <Card
      onClick={handleClick}
      className={cn(
        'p-4 bg-gradient-to-br border transition-all',
        colors[color],
        clickable && 'cursor-pointer hover:scale-105 active:scale-100',
        !clickable && 'cursor-default opacity-90',
        isActive && activeRing[color],
      )}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-card/50 flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground truncate">{label}</p>
          <p className="text-xl font-bold truncate font-mono">{value}</p>
        </div>
      </div>
    </Card>
  )
}

// ════════════════════════════════════════════════════════════
//  Leaderboard Tab (الـ tab الموحد — بدون فلتر زمني)
// ════════════════════════════════════════════════════════════

function LeaderboardTab({ endpoint, type, onUserClick }) {
  const [data, setData] = useState(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    setData(null)
    setPage(1)

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
      <div className="space-y-3 mt-6">
        <Skeleton className="h-36 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    )
  }

  const fullList = data.leaderboard || []
  const emptyConfig = getEmptyConfig(type)

  if (fullList.length === 0) {
    return (
      <Card className="p-12 text-center mt-6">
        <div className="text-muted-foreground/30 mb-4 flex justify-center">
          {data.error ? <AlertCircle className="w-16 h-16" /> : emptyConfig.icon}
        </div>
        <p className="text-muted-foreground">
          {data.error
            ? 'فشل تحميل البيانات — البوت غير متاح حالياً'
            : emptyConfig.text}
        </p>
        {data.error && (
          <p className="text-xs text-muted-foreground/60 mt-2">
            هذا النوع يحتاج البوت يكون شغّال. حاول لاحقاً.
          </p>
        )}
      </Card>
    )
  }

  const restList = search ? filtered : filtered.slice(3)
  const totalPages = Math.max(1, Math.ceil(restList.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const startIdx = (safePage - 1) * PAGE_SIZE
  const pageItems = restList.slice(startIdx, startIdx + PAGE_SIZE)

  return (
    <div className="space-y-6 mt-6">
      {!search && fullList[0] && (
        <HallOfFameCard
          row={fullList[0]}
          type={type}
          onClick={() => onUserClick(fullList[0].user_id)}
        />
      )}

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

      <div className="relative">
        <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          placeholder="ابحث باسم أو ID..."
          className="pr-9"
        />
      </div>

      <div className="space-y-2">
        {pageItems.map((row) => (
          <LeaderboardRow
            key={row.user_id + (row.guild_id || '')}
            row={row}
            type={type}
            onClick={() => onUserClick(row.user_id)}
          />
        ))}
        {pageItems.length === 0 && (
          <Card className="p-6 text-center text-muted-foreground">
            <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
            ما لقينا نتائج
          </Card>
        )}
      </div>

      {!search && totalPages > 1 && (
        <Pagination
          page={safePage}
          totalPages={totalPages}
          onChange={setPage}
          totalItems={restList.length + 3}
        />
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════
//  Pagination
// ════════════════════════════════════════════════════════════

function Pagination({ page, totalPages, onChange, totalItems }) {
  const canPrev = page > 1
  const canNext = page < totalPages

  const pages = useMemo(() => {
    const arr = []
    const showRange = 2
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= page - showRange && i <= page + showRange)) {
        arr.push(i)
      } else if (arr[arr.length - 1] !== '...') {
        arr.push('...')
      }
    }
    return arr
  }, [page, totalPages])

  return (
    <div className="flex items-center justify-between gap-4 flex-wrap pt-2">
      <p className="text-xs text-muted-foreground">
        إجمالي <span className="font-bold text-foreground font-mono">{totalItems}</span> لاعب —
        صفحة <span className="font-bold text-foreground font-mono">{page}</span> من{' '}
        <span className="font-bold text-foreground font-mono">{totalPages}</span>
      </p>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" disabled={!canPrev} onClick={() => onChange(page - 1)}>
          <ChevronRight className="w-4 h-4" />
        </Button>

        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`dots-${i}`} className="px-2 text-muted-foreground">···</span>
          ) : (
            <button
              key={p}
              onClick={() => onChange(p)}
              className={cn(
                'min-w-[2rem] h-8 px-2 rounded-lg text-xs font-mono font-bold transition-all',
                p === page
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card border border-border hover:border-primary/50 text-foreground',
              )}
            >
              {p}
            </button>
          ),
        )}

        <Button variant="outline" size="sm" disabled={!canNext} onClick={() => onChange(page + 1)}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
//  Helpers
// ════════════════════════════════════════════════════════════

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
//  Hall of Fame Card
// ════════════════════════════════════════════════════════════

function HallOfFameCard({ row, type, onClick }) {
  const style = RANK_STYLES[1]
  const titleText = getTitleText(type)

  return (
    <Card
      className={cn(
        'p-6 cursor-pointer hover:scale-[1.01] transition-all border-2',
        style.bg, style.border, style.glow,
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-5 flex-wrap md:flex-nowrap">
        <div className="text-6xl drop-shadow-[0_0_15px_rgba(251,191,36,0.5)] hidden md:block">
          {style.icon}
        </div>

        <div className="relative flex-shrink-0">
          <img
            src={row.avatar_url}
            alt=""
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
          <p className="text-xs text-muted-foreground font-mono mb-2 truncate">{row.user_id}</p>

          {row.badges?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {row.badges.map((b, i) => <BadgePill key={i} badge={b} />)}
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

function PodiumCard({ row, type, onClick }) {
  const style = RANK_STYLES[row.rank]
  if (!style) return null

  return (
    <Card
      className={cn(
        'p-4 cursor-pointer hover:scale-105 transition-all border-2',
        style.bg, style.border, style.glow,
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <div className="text-3xl flex-shrink-0">{style.icon}</div>

        <img
          src={row.avatar_url}
          alt=""
          className="w-12 h-12 rounded-full border-2 border-card flex-shrink-0"
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
          {row.badges.slice(0, 3).map((b, i) => <BadgePill key={i} badge={b} small />)}
        </div>
      )}
    </Card>
  )
}

function LeaderboardRow({ row, type, onClick }) {
  return (
    <Card
      className="p-3 hover:bg-card/80 cursor-pointer transition-colors hover:border-primary/30"
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center font-bold text-muted-foreground flex-shrink-0 font-mono">
          #{row.rank}
        </div>

        <img
          src={row.avatar_url}
          alt=""
          className="w-10 h-10 rounded-full flex-shrink-0"
          loading="lazy"
          onError={(e) => {
            e.target.src = `https://cdn.discordapp.com/embed/avatars/0.png`
          }}
        />

        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{row.username}</p>
          <div className="flex items-center gap-2 flex-wrap mt-0.5">
            {row.badges?.slice(0, 2).map((b, i) => <BadgePill key={i} badge={b} small />)}
          </div>
        </div>

        <div className="text-left flex-shrink-0">
          <ValueDisplay row={row} type={type} />
        </div>
      </div>
    </Card>
  )
}

function ValueDisplay({ row, type, large }) {
  const size = large ? 'text-3xl' : 'text-base'

  if (type === 'economy') {
    return (
      <div className="text-left">
        <p className={cn('font-bold text-amber-400 font-mono', size)}>
          {formatCompact(row.total)}
        </p>
        <p className="text-[10px] text-muted-foreground mt-0.5">🪙 كوين</p>
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

  return null
}

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

  useEffect(() => {
    const handler = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <Card
        className="max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 left-3 p-2 rounded-lg hover:bg-accent transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {profile === null ? (
          <div className="space-y-4">
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </div>
        ) : profile.error ? (
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-muted-foreground">فشل تحميل البروفايل</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <img src={profile.avatar_url} alt="" className="w-20 h-20 rounded-2xl border-2 border-primary/30" />
              <div className="flex-1 min-w-0">
                <h2 className="text-2xl font-bold truncate">{profile.username}</h2>
                <p className="text-xs text-muted-foreground font-mono">{profile.user_id}</p>
                {profile.subscription && (
                  <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-xs">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span className="text-amber-300 font-medium">{profile.subscription.plan_id}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
                <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold mb-2">
                  <Coins className="w-3.5 h-3.5" />
                  <span>الاقتصاد</span>
                </div>
                <p className="text-xl font-bold font-mono">{formatCompact(profile.economy?.total || 0)}</p>
                <p className="text-xs text-muted-foreground mt-1">🪙 كوين</p>
                {profile.economy?.rank && (
                  <p className="text-xs text-amber-400/80 mt-2 font-mono">الترتيب: #{profile.economy.rank}</p>
                )}
              </div>

              <div className="p-4 rounded-xl bg-sky-500/5 border border-sky-500/20">
                <div className="flex items-center gap-2 text-sky-400 text-xs font-semibold mb-2">
                  <Gem className="w-3.5 h-3.5" />
                  <span>الثروة الكاملة</span>
                </div>
                <p className="text-xl font-bold font-mono">{formatCompact(profile.networth?.net_worth || 0)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  📦 {profile.networth?.total_items || 0} عنصر • 💎 {formatCompact(profile.networth?.items_value || 0)}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-violet-500/5 border border-violet-500/20">
                <div className="flex items-center gap-2 text-violet-400 text-xs font-semibold mb-2">
                  <Star className="w-3.5 h-3.5" />
                  <span>الـ XP</span>
                </div>
                <p className="text-xl font-bold font-mono">{formatCompact(profile.xp?.total_xp || 0)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  🎮 {profile.xp?.servers || 0} سيرفر • 📈 إجمالي {profile.xp?.total_levels || 0} مستوى
                </p>
                {profile.xp?.rank && (
                  <p className="text-xs text-violet-400/80 mt-2 font-mono">الترتيب: #{profile.xp.rank}</p>
                )}
              </div>

              <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold mb-2">
                  <Award className="w-3.5 h-3.5" />
                  <span>أعلى مستوى</span>
                </div>
                <p className="text-xl font-bold font-mono">Lv.{profile.xp?.highest_level || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">في سيرفر واحد</p>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
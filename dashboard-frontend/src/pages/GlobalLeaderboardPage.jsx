/**
 * ═══════════════════════════════════════════════════════════
 *  GlobalLeaderboardPage — قائمة المتصدرين العالمية
 *  المسار: dashboard-frontend/src/pages/GlobalLeaderboardPage.jsx
 *
 *  3 تبويبات:
 *   • 💰 الأغنى — الأكثر فلوس عالمياً
 *   • ⭐ الأعلى XP — مجموع XP عبر كل السيرفرات
 *   • 🏆 الأعلى مستوى — أعلى مستوى محقق في سيرفر واحد
 *
 *  + قسم إحصائيات عامة في الأعلى
 * ═══════════════════════════════════════════════════════════
 */

import { useState, useEffect } from 'react'
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
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
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
  1: { icon: '👑', color: 'text-amber-400',  bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  2: { icon: '🥈', color: 'text-slate-300',  bg: 'bg-slate-500/10', border: 'border-slate-500/30' },
  3: { icon: '🥉', color: 'text-amber-600',  bg: 'bg-amber-700/10', border: 'border-amber-700/30' },
}

// ════════════════════════════════════════════════════════════
//  Helpers
// ════════════════════════════════════════════════════════════

function getAvatarUrl(userId) {
  try {
    const defaultIdx = (BigInt(userId) >> 22n) % 6n
    return `https://cdn.discordapp.com/embed/avatars/${defaultIdx}.png`
  } catch {
    return `https://cdn.discordapp.com/embed/avatars/0.png`
  }
}

function shortenId(userId) {
  if (!userId) return '?'
  return `User #${userId.slice(-6)}`
}

// ════════════════════════════════════════════════════════════
//  Main Page
// ════════════════════════════════════════════════════════════

export default function GlobalLeaderboardPage() {
  const [stats, setStats] = useState(null)
  const [refreshing, setRefreshing] = useState(false)

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
          <div className="w-14 h-14 rounded-2xl lyn-gradient flex items-center justify-center lyn-glow">
            <Trophy className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold lyn-text-gradient">قائمة المتصدرين العالمية</h1>
            <p className="text-muted-foreground text-sm mt-1">
              الأقوى في عالم Lyn — كل السيرفرات في مكان واحد
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
          <span>تحديث</span>
        </Button>
      </div>

      {/* ─── Global Stats ─── */}
      {stats === null ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={<Globe />}
            label="السيرفرات"
            value={formatCompact(stats?.guilds?.total || 0)}
            color="violet"
          />
          <StatCard
            icon={<Users />}
            label="اللاعبين النشطين"
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
            icon={<Star />}
            label="أعلى مستوى"
            value={stats?.xp?.highest_level || 0}
            color="sky"
          />
        </div>
      )}

      {/* ─── Tabs ─── */}
      <Tabs defaultValue="economy">
        <TabsList>
          <TabsTrigger value="economy" variant="pills">
            <Coins className="w-4 h-4" />
            <span>💰 الأغنى</span>
          </TabsTrigger>
          <TabsTrigger value="xp" variant="pills">
            <Star className="w-4 h-4" />
            <span>⭐ الأعلى XP</span>
          </TabsTrigger>
          <TabsTrigger value="level" variant="pills">
            <Award className="w-4 h-4" />
            <span>🏆 الأعلى مستوى</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="economy">
          <EconomyLeaderboard />
        </TabsContent>
        <TabsContent value="xp">
          <XPLeaderboard />
        </TabsContent>
        <TabsContent value="level">
          <LevelLeaderboard />
        </TabsContent>
      </Tabs>
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
    <Card className={cn('p-4 bg-gradient-to-br border', colors[color])}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-card/50 flex items-center justify-center">
          {icon}
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold">{value}</p>
        </div>
      </div>
    </Card>
  )
}

// ════════════════════════════════════════════════════════════
//  Economy Leaderboard
// ════════════════════════════════════════════════════════════

function EconomyLeaderboard() {
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
      renderRow={(row) => (
        <>
          <div className="flex items-center gap-2 text-sm">
            <Coins className="w-4 h-4 text-amber-400" />
            <span className="font-mono font-bold text-amber-400">
              {formatCompact(row.total)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            🪙 {formatCompact(row.coins)} • 🏦 {formatCompact(row.bank)}
          </p>
        </>
      )}
      emptyText="ما فيه لاعبين بعد"
    />
  )
}

// ════════════════════════════════════════════════════════════
//  XP Leaderboard
// ════════════════════════════════════════════════════════════

function XPLeaderboard() {
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
      renderRow={(row) => (
        <>
          <div className="flex items-center gap-2 text-sm">
            <Star className="w-4 h-4 text-violet-400" />
            <span className="font-mono font-bold text-violet-400">
              {formatCompact(row.total_xp)} XP
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            🎮 {row.servers_count} سيرفر • 📈 أعلى مستوى: {row.highest_level}
          </p>
        </>
      )}
      emptyText="ما فيه XP بعد"
    />
  )
}

// ════════════════════════════════════════════════════════════
//  Level Leaderboard
// ════════════════════════════════════════════════════════════

function LevelLeaderboard() {
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
      renderRow={(row) => (
        <>
          <div className="flex items-center gap-2 text-sm">
            <Award className="w-4 h-4 text-sky-400" />
            <span className="font-mono font-bold text-sky-400">
              مستوى {row.level}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            ⭐ {formatCompact(row.total_xp)} XP
          </p>
        </>
      )}
      emptyText="ما فيه مستويات بعد"
    />
  )
}

// ════════════════════════════════════════════════════════════
//  Shared LeaderboardList
// ════════════════════════════════════════════════════════════

function LeaderboardList({ data, renderRow, emptyText }) {
  if (data === null) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    )
  }

  const list = data.leaderboard || []

  if (list.length === 0) {
    return (
      <Card className="p-12 text-center">
        <Trophy className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
        <p className="text-muted-foreground">{emptyText}</p>
      </Card>
    )
  }

  return (
    <div className="space-y-2">
      {/* ─── Top 3 — Featured ─── */}
      {list.slice(0, 3).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          {list.slice(0, 3).map((row) => (
            <TopRow key={row.user_id + (row.guild_id || '')} row={row} renderRow={renderRow} featured />
          ))}
        </div>
      )}

      {/* ─── Rest ─── */}
      {list.slice(3).map((row) => (
        <TopRow key={row.user_id + (row.guild_id || '')} row={row} renderRow={renderRow} />
      ))}
    </div>
  )
}

// ════════════════════════════════════════════════════════════
//  Top Row
// ════════════════════════════════════════════════════════════

function TopRow({ row, renderRow, featured }) {
  const style = RANK_STYLES[row.rank]
  const avatarUrl = getAvatarUrl(row.user_id)
  const displayName = shortenId(row.user_id)

  return (
    <Card
      className={cn(
        'p-4 transition-all hover:scale-[1.01]',
        featured && style && `${style.bg} ${style.border} border-2`,
      )}
    >
      <div className="flex items-center gap-4">
        {/* Rank */}
        <div
          className={cn(
            'flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg',
            style ? `${style.bg} ${style.color}` : 'bg-muted text-muted-foreground',
          )}
        >
          {style?.icon || `#${row.rank}`}
        </div>

        {/* Avatar */}
        <img
          src={avatarUrl}
          alt=""
          className="w-10 h-10 rounded-full bg-muted"
          loading="lazy"
        />

        {/* User Info */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{displayName}</p>
          <p className="text-xs text-muted-foreground font-mono truncate">
            {row.user_id}
          </p>
        </div>

        {/* Value */}
        <div className="text-left flex-shrink-0">{renderRow(row)}</div>
      </div>
    </Card>
  )
}
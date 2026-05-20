/**
 * ═══════════════════════════════════════════════════════════
 *  Owner Players Page — لوحة المالك للاعبين
 *  المسار: dashboard-frontend/src/pages/OwnerPlayersPage.jsx
 *
 *  ✨ مميزات:
 *   • إحصائيات شاملة (إجمالي، يومي، أسبوعي، شهري)
 *   • بحث بـ ID أو اسم
 *   • فرز: نشاط حديث / XP / ثروة / آخر تفاعل
 *   • Pagination (50/صفحة)
 *   • Modal تفصيلي لكل لاعب (مع callBot للثروة الكاملة)
 *   • إجراءات: إرسال DM + منح Trial
 *
 *  ⚠️ Owner only (محمي بالـ guard)
 * ═══════════════════════════════════════════════════════════
 */

import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Crown, Users, Search, RefreshCw, ChevronLeft, ChevronRight,
  Calendar, TrendingUp, Coins, Star, Server, Send,
  AlertCircle, Loader2, X, Gift, Activity, Trophy, Award,
  Sparkles, MessageSquare, Hash, Clock,
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Skeleton } from '@/components/ui/Skeleton'
import { Badge } from '@/components/ui/Badge'
import { SettingsPageHeader } from '@/components/shared/SettingsPageHeader'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/Select'
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/Dialog'
import { apiClient } from '@/api/client'
import { adminApi } from '@/api'
import { useAuthStore } from '@/store/authStore'
import { isOwner } from '@/config/env'
import { formatCompact, cn, formatRelativeTime } from '@/lib/utils'
import { toast } from 'sonner'

// ════════════════════════════════════════════════════════════
//  Constants
// ════════════════════════════════════════════════════════════

const SORT_OPTIONS = [
  { value: 'recent', label: '⚡ الأكثر نشاطاً',     icon: Activity },
  { value: 'xp',     label: '⭐ الأعلى XP',         icon: Star },
  { value: 'wealth', label: '💰 الأعلى ثروة',       icon: Coins },
  { value: 'newest', label: '🕒 آخر تفاعل',         icon: Clock },
]

const PLAN_COLORS = {
  silver:  'bg-slate-500/15 text-slate-300 border-slate-500/30',
  gold:    'bg-amber-500/15 text-amber-300 border-amber-500/30',
  diamond: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
}

const PLAN_LABELS = {
  silver:  '🥈 Silver',
  gold:    '🥇 Gold',
  diamond: '💎 Diamond',
}

// ════════════════════════════════════════════════════════════
//  Main Page
// ════════════════════════════════════════════════════════════

export default function OwnerPlayersPage() {
  const { user } = useAuthStore()

  // Owner guard
  if (!user?.isOwner && !isOwner(user?.id)) {
    return <Navigate to="/dashboard" replace />
  }

  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('recent')
  const [page, setPage] = useState(1)
  const [selectedUserId, setSelectedUserId] = useState(null)
  const queryClient = useQueryClient()

  // ─── Stats ───
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['owner-players-stats'],
    queryFn: () => apiClient.get('/api/owner/players/stats'),
    staleTime: 60 * 1000,
  })

  const stats = statsData?.data ?? statsData ?? {}

  // ─── Players list ───
  const { data: listData, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['owner-players', search, sort, page],
    queryFn: () =>
      apiClient.get(
        `/api/owner/players?search=${encodeURIComponent(search)}&sort=${sort}&page=${page}&limit=50`,
      ),
    staleTime: 30 * 1000,
    keepPreviousData: true,
  })

  const list = listData?.data ?? listData ?? {}
  const players = list.players || []
  const pagination = list.pagination || { page: 1, total: 0, total_pages: 1 }

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['owner-players'] })
    queryClient.invalidateQueries({ queryKey: ['owner-players-stats'] })
    refetch()
    toast.success('جاري التحديث...')
  }

  const handleSearchChange = (v) => {
    setSearch(v)
    setPage(1)
  }

  const handleSortChange = (v) => {
    setSort(v)
    setPage(1)
  }

  return (
    <>
      <SettingsPageHeader
        icon={<Users />}
        title="اللاعبين"
        description="إدارة كل اللاعبين عبر السيرفرات"
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="default" className="lyn-gradient text-white">
              <Crown className="w-3 h-3" />
              Owner Only
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isFetching}
            >
              <RefreshCw className={cn('w-4 h-4', isFetching && 'animate-spin')} />
              <span>تحديث</span>
            </Button>
          </div>
        }
      />

      {/* ─── Stats Overview ─── */}
      <StatsOverview stats={stats} isLoading={statsLoading} />

      {/* ─── Filters Bar ─── */}
      <Card className="p-4 mt-6">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="ابحث باسم أو ID اللاعب..."
              className="pr-9"
            />
          </div>

          <Select value={sort} onValueChange={handleSortChange}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* ─── Players List ─── */}
      <div className="mt-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        ) : players.length === 0 ? (
          <Card className="p-12 text-center">
            <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-muted-foreground">
              {search ? `ما لقيت لاعبين بهذا البحث "${search}"` : 'ما فيه لاعبين بعد'}
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {players.map((p) => (
              <PlayerRow
                key={p.user_id}
                player={p}
                onClick={() => setSelectedUserId(p.user_id)}
              />
            ))}
          </div>
        )}

        {/* ─── Pagination ─── */}
        {pagination.total_pages > 1 && (
          <PaginationBar
            pagination={pagination}
            onPageChange={setPage}
            isFetching={isFetching}
          />
        )}
      </div>

      {/* ─── Player Detail Modal ─── */}
      {selectedUserId && (
        <PlayerDetailDialog
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
        />
      )}
    </>
  )
}

// ════════════════════════════════════════════════════════════
//  Stats Overview
// ════════════════════════════════════════════════════════════

function StatsOverview({ stats, isLoading }) {
  const items = [
    {
      label: 'إجمالي اللاعبين',
      value: stats.total,
      icon: Users,
      gradient: 'from-violet-500 to-purple-500',
    },
    {
      label: 'النشطون اليوم',
      value: stats.active_today,
      icon: Activity,
      gradient: 'from-emerald-500 to-teal-500',
    },
    {
      label: 'النشطون هذا الأسبوع',
      value: stats.active_week,
      icon: TrendingUp,
      gradient: 'from-amber-500 to-orange-500',
    },
    {
      label: 'النشطون هذا الشهر',
      value: stats.active_month,
      icon: Calendar,
      gradient: 'from-sky-500 to-blue-500',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
      {items.map((item) => (
        <Card key={item.label} className="p-4">
          {isLoading ? (
            <Skeleton className="h-16" />
          ) : (
            <>
              <div className="flex items-center justify-between mb-2">
                <div
                  className={cn(
                    'w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center',
                    item.gradient,
                  )}
                >
                  <item.icon className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="text-2xl font-bold num">
                {formatCompact(item.value || 0)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">{item.label}</div>
            </>
          )}
        </Card>
      ))}
    </div>
  )
}

// ════════════════════════════════════════════════════════════
//  Player Row
// ════════════════════════════════════════════════════════════

function PlayerRow({ player, onClick }) {
  const lastActiveText = player.last_active
    ? formatRelativeTime(player.last_active)
    : 'ما فيه نشاط'

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-start rounded-xl border border-border bg-card p-4',
        'hover:border-primary/30 hover:bg-card/80 transition-all',
        'flex items-center gap-4',
      )}
    >
      {/* Avatar */}
      <img
        src={player.avatar_url}
        alt={player.username}
        className="w-12 h-12 rounded-full flex-shrink-0"
        loading="lazy"
      />

      {/* Name + ID */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold truncate">{player.username}</span>
          {player.subscription?.status === 'active' && player.subscription?.plan_id && (
            <Badge
              variant="outline"
              className={cn('text-[10px]', PLAN_COLORS[player.subscription.plan_id])}
            >
              {PLAN_LABELS[player.subscription.plan_id] || player.subscription.plan_id}
              {player.subscription.is_trial && ' (Trial)'}
            </Badge>
          )}
        </div>
        <div className="text-xs text-muted-foreground font-mono mt-0.5">
          {player.user_id}
        </div>
      </div>

      {/* Stats */}
      <div className="hidden md:flex items-center gap-6 text-xs flex-shrink-0">
        <Stat icon={<Server className="w-3.5 h-3.5" />} value={player.servers_count} label="سيرفر" />
        <Stat
          icon={<Star className="w-3.5 h-3.5" />}
          value={formatCompact(player.total_xp)}
          label="XP"
        />
        <Stat
          icon={<Coins className="w-3.5 h-3.5" />}
          value={formatCompact(player.coins)}
          label="كوينز"
        />
        <div className="text-muted-foreground text-[11px] min-w-[80px] text-end">
          <Clock className="w-3 h-3 inline ml-1" />
          {lastActiveText}
        </div>
      </div>

      <ChevronLeft className="w-5 h-5 text-muted-foreground flex-shrink-0" />
    </button>
  )
}

function Stat({ icon, value, label }) {
  return (
    <div className="flex flex-col items-center min-w-[50px]">
      <div className="flex items-center gap-1 font-semibold">
        {icon}
        <span className="num">{value}</span>
      </div>
      <span className="text-[10px] text-muted-foreground mt-0.5">{label}</span>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
//  Pagination
// ════════════════════════════════════════════════════════════

function PaginationBar({ pagination, onPageChange, isFetching }) {
  const { page, total_pages, total } = pagination
  const canPrev = page > 1
  const canNext = page < total_pages

  return (
    <Card className="p-3 mt-4 flex items-center justify-between flex-wrap gap-2">
      <div className="text-xs text-muted-foreground">
        صفحة <span className="num font-semibold text-foreground">{page}</span> من{' '}
        <span className="num font-semibold text-foreground">{total_pages}</span>
        {' • '}
        <span className="num">{total}</span> لاعب
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={!canPrev || isFetching}
        >
          <ChevronRight className="w-4 h-4" />
          <span>السابق</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={!canNext || isFetching}
        >
          <span>التالي</span>
          <ChevronLeft className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  )
}

// ════════════════════════════════════════════════════════════
//  Player Detail Dialog
// ════════════════════════════════════════════════════════════

function PlayerDetailDialog({ userId, onClose }) {
  const [activeAction, setActiveAction] = useState(null) // 'dm' | 'trial' | null
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['owner-player-detail', userId],
    queryFn: () => apiClient.get(`/api/owner/players/${userId}`),
    staleTime: 30 * 1000,
  })

  const player = data?.data ?? data ?? null

  const handleAfterAction = () => {
    setActiveAction(null)
    queryClient.invalidateQueries({ queryKey: ['owner-player-detail', userId] })
    queryClient.invalidateQueries({ queryKey: ['owner-players'] })
  }

  return (
    <Dialog open={true} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        {isLoading || !player ? (
          <div className="p-8 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Banner + Avatar */}
            <div className="relative -mx-6 -mt-6 mb-4">
              {player.banner_url ? (
                <div
                  className="h-32 rounded-t-xl bg-cover bg-center"
                  style={{ backgroundImage: `url(${player.banner_url})` }}
                />
              ) : (
                <div
                  className="h-32 rounded-t-xl"
                  style={{
                    backgroundColor: player.accent_color
                      ? `#${player.accent_color.toString(16).padStart(6, '0')}`
                      : '#5865f2',
                  }}
                />
              )}
              <div className="absolute bottom-[-30px] right-6">
                <img
                  src={player.avatar_url}
                  alt={player.username}
                  className="w-20 h-20 rounded-full border-4 border-background"
                />
              </div>
            </div>

            <DialogHeader className="pt-8">
              <DialogTitle className="flex items-center gap-2 flex-wrap">
                <span>{player.username}</span>
                {player.subscription?.status === 'active' && player.subscription?.plan_id && (
                  <Badge
                    variant="outline"
                    className={cn(PLAN_COLORS[player.subscription.plan_id])}
                  >
                    {PLAN_LABELS[player.subscription.plan_id]}
                    {player.subscription.is_trial && ' (Trial)'}
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription>
                <span className="font-mono text-xs">{player.user_id}</span>
                {player.discord_created_at && (
                  <span className="text-xs">
                    {' • '}
                    Discord منذ {new Date(player.discord_created_at).toLocaleDateString('ar')}
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>

            {/* ─── Quick Stats ─── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
              <MetricCard
                icon={<Coins className="w-4 h-4" />}
                label="الكوينز"
                value={formatCompact(player.economy?.coins || 0)}
              />
              <MetricCard
                icon={<Sparkles className="w-4 h-4" />}
                label="الثروة الكاملة"
                value={formatCompact(player.economy?.net_worth || 0)}
              />
              <MetricCard
                icon={<Star className="w-4 h-4" />}
                label="إجمالي XP"
                value={formatCompact(player.xp?.total_xp || 0)}
              />
              <MetricCard
                icon={<Trophy className="w-4 h-4" />}
                label="أعلى مستوى"
                value={player.xp?.highest_level || 0}
              />
            </div>

            {/* ─── Activity ─── */}
            <Card className="p-4 mt-4 bg-card/50">
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                النشاط
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <ActivityCell label="اليوم" value={player.activity?.today || 0} />
                <ActivityCell label="الأسبوع" value={player.activity?.week || 0} />
                <ActivityCell label="الشهر" value={player.activity?.month || 0} />
                <ActivityCell
                  label="إجمالي"
                  value={player.activity?.total_ai_uses || 0}
                />
              </div>
              {player.activity?.last_ai_use && (
                <div className="text-[11px] text-muted-foreground mt-3">
                  <Clock className="w-3 h-3 inline ml-1" />
                  آخر تفاعل AI: {formatRelativeTime(player.activity.last_ai_use)}
                </div>
              )}
            </Card>

            {/* ─── XP per server ─── */}
            {player.xp?.per_server?.length > 0 && (
              <Card className="p-4 mt-4 bg-card/50">
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <Server className="w-4 h-4" />
                  XP في كل سيرفر ({player.xp.servers_count})
                </h3>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {player.xp.per_server.map((s, i) => (
                    <div
                      key={s.guild_id}
                      className="flex items-center justify-between text-xs bg-card rounded-lg px-3 py-2"
                    >
                      <span className="font-mono text-muted-foreground">
                        #{i + 1} • {s.guild_id.slice(-8)}
                      </span>
                      <div className="flex items-center gap-3">
                        <span>
                          <span className="text-muted-foreground">Lv</span>{' '}
                          <span className="font-semibold num">{s.level}</span>
                        </span>
                        <span className="text-muted-foreground num">
                          {formatCompact(s.total_xp)} XP
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* ─── Subscription ─── */}
            {player.subscription && (
              <Card className="p-4 mt-4 bg-card/50">
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <Crown className="w-4 h-4" />
                  الاشتراك
                </h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <Info label="الخطة" value={PLAN_LABELS[player.subscription.plan_id] || player.subscription.plan_id} />
                  <Info label="الحالة" value={player.subscription.status} />
                  <Info
                    label="ينتهي"
                    value={
                      player.subscription.expires_at
                        ? new Date(player.subscription.expires_at).toLocaleDateString('ar')
                        : 'مفتوح'
                    }
                  />
                  <Info
                    label="النوع"
                    value={player.subscription.is_trial ? 'تجربة مجانية' : 'مدفوع'}
                  />
                </div>
                {player.subscription.trial_notes && (
                  <div className="text-[11px] text-muted-foreground mt-2 italic">
                    ملاحظات: {player.subscription.trial_notes}
                  </div>
                )}
              </Card>
            )}

            {/* ─── Actions ─── */}
            <div className="flex items-center gap-2 mt-6 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveAction('dm')}
              >
                <Send className="w-4 h-4" />
                <span>إرسال رسالة</span>
              </Button>
              {!player.subscription?.is_trial && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveAction('trial')}
                >
                  <Gift className="w-4 h-4" />
                  <span>منح Trial</span>
                </Button>
              )}
            </div>

            {/* ─── Action Dialogs ─── */}
            {activeAction === 'dm' && (
              <DMDialog
                userId={userId}
                username={player.username}
                onClose={() => setActiveAction(null)}
                onSuccess={handleAfterAction}
              />
            )}
            {activeAction === 'trial' && (
              <TrialDialog
                userId={userId}
                username={player.username}
                onClose={() => setActiveAction(null)}
                onSuccess={handleAfterAction}
              />
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ════════════════════════════════════════════════════════════
//  Sub-components
// ════════════════════════════════════════════════════════════

function MetricCard({ icon, label, value }) {
  return (
    <Card className="p-3 bg-card/50">
      <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] mb-1">
        {icon}
        <span>{label}</span>
      </div>
      <div className="font-bold text-lg num">{value}</div>
    </Card>
  )
}

function ActivityCell({ label, value }) {
  return (
    <div className="bg-card rounded-lg p-2 text-center">
      <div className="font-bold num">{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  )
}

function Info({ label, value }) {
  return (
    <div>
      <div className="text-muted-foreground text-[10px]">{label}</div>
      <div className="font-medium">{value || '—'}</div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
//  DM Dialog
// ════════════════════════════════════════════════════════════

function DMDialog({ userId, username, onClose, onSuccess }) {
  const [message, setMessage] = useState('')

  const mutation = useMutation({
    mutationFn: (msg) =>
      apiClient.post(`/api/owner/players/${userId}/dm`, { message: msg }),
    onSuccess: () => {
      toast.success(`تم إرسال الرسالة لـ ${username}`)
      onSuccess()
    },
    onError: (err) => {
      const msg = err?.response?.data?.error || err?.message || 'فشل إرسال الرسالة'
      toast.error(msg)
    },
  })

  const handleSend = () => {
    const trimmed = message.trim()
    if (!trimmed) {
      toast.error('الرسالة فاضية')
      return
    }
    if (trimmed.length > 2000) {
      toast.error('الرسالة طويلة جداً (الحد 2000 حرف)')
      return
    }
    mutation.mutate(trimmed)
  }

  return (
    <Dialog open={true} onOpenChange={(o) => !o && !mutation.isPending && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-violet-500" />
            رسالة إلى {username}
          </DialogTitle>
          <DialogDescription>
            ترسل DM للاعب كرسالة رسمية من إدارة البوت
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="اكتب رسالتك هنا..."
            maxLength={2000}
            rows={6}
            className={cn(
              'w-full rounded-lg border border-border bg-background p-3 text-sm',
              'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20',
              'resize-none',
            )}
            disabled={mutation.isPending}
          />
          <div className="text-[10px] text-muted-foreground text-end num">
            {message.length}/2000
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={mutation.isPending}
          >
            إلغاء
          </Button>
          <Button onClick={handleSend} disabled={mutation.isPending || !message.trim()}>
            {mutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span>إرسال</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ════════════════════════════════════════════════════════════
//  Trial Dialog
// ════════════════════════════════════════════════════════════

const TRIAL_PLANS = [
  { id: 'silver',  label: '🥈 Silver',  color: 'border-slate-500/30' },
  { id: 'gold',    label: '🥇 Gold',    color: 'border-amber-500/30' },
  { id: 'diamond', label: '💎 Diamond', color: 'border-sky-500/30' },
]

const TRIAL_DAYS = [1, 3, 7, 14, 30]

function TrialDialog({ userId, username, onClose, onSuccess }) {
  const [planId, setPlanId] = useState('silver')
  const [days, setDays] = useState(3)
  const [notes, setNotes] = useState('')

  const mutation = useMutation({
    mutationFn: () => adminApi.grantTrial(userId, planId, days, notes.trim() || null),
    onSuccess: () => {
      toast.success(`تم منح ${PLAN_LABELS[planId]} للاعب ${username} لمدة ${days} يوم`)
      onSuccess()
    },
    onError: (err) => {
      const code = err?.response?.data?.code
      const msg = err?.response?.data?.error || err?.message || 'فشل منح Trial'
      if (code === 'TRIAL_ALREADY_GRANTED') {
        toast.error('هذا اللاعب استلم Trial من قبل')
      } else if (code === 'HAS_PAID_SUBSCRIPTION') {
        toast.error('عنده اشتراك مدفوع نشط')
      } else {
        toast.error(msg)
      }
    },
  })

  return (
    <Dialog open={true} onOpenChange={(o) => !o && !mutation.isPending && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-violet-500" />
            منح Trial لـ {username}
          </DialogTitle>
          <DialogDescription>
            اختر الخطة والمدة. التجربة المجانية تُمنح لمرة واحدة فقط.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Plan */}
          <div>
            <label className="text-sm font-medium mb-2 block">الخطة</label>
            <div className="grid grid-cols-3 gap-2">
              {TRIAL_PLANS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPlanId(p.id)}
                  disabled={mutation.isPending}
                  className={cn(
                    'p-3 rounded-xl border-2 transition-all text-center text-sm',
                    planId === p.id
                      ? `${p.color} bg-card`
                      : 'border-border bg-card/50 hover:border-border/80',
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Days */}
          <div>
            <label className="text-sm font-medium mb-2 block">المدة (يوم)</label>
            <div className="flex gap-2 flex-wrap">
              {TRIAL_DAYS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDays(d)}
                  disabled={mutation.isPending}
                  className={cn(
                    'px-4 py-2 rounded-lg border transition-all text-sm font-medium num',
                    days === d
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-card hover:border-border/80',
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              ملاحظة (اختياري)
            </label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثال: لاعب نشط"
              disabled={mutation.isPending}
              maxLength={200}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={mutation.isPending}
          >
            إلغاء
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Gift className="w-4 h-4" />
            )}
            <span>منح Trial</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
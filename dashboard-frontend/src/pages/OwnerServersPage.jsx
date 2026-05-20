/**
 * ═══════════════════════════════════════════════════════════
 *  Owner Servers Page — لوحة المالك للسيرفرات
 *  المسار: dashboard-frontend/src/pages/OwnerServersPage.jsx
 *
 *  ✨ مميزات:
 *   • قائمة كل السيرفرات اللي فيها البوت
 *   • إحصائيات لكل سيرفر (أعضاء، قنوات، اشتراك، نشاط)
 *   • بحث + فرز (أعضاء/اسم/تاريخ الانضمام/النشاط)
 *   • Modal تفصيلي لكل سيرفر مع 30 يوم نشاط
 *   • إجراءات: إرسال رسالة لمالك السيرفر + خروج البوت
 *
 *  ⚠️ Owner only (محمي بالـ guard)
 * ═══════════════════════════════════════════════════════════
 */

import { useState, useMemo, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Crown, Globe, Users, MessageSquare, LogOut, AlertTriangle,
  Search, RefreshCw, Sparkles, ChevronRight, Calendar,
  Hash, Mic, Megaphone, Layers, MoreVertical, X, Send,
  CheckCircle2, XCircle, Clock, TrendingUp, Shield,
  Award, Coins, BarChart3, Eye, AlertCircle, Loader2,
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
import { useAuthStore } from '@/store/authStore'
import { isOwner } from '@/config/env'
import { formatCompact, cn } from '@/lib/utils'
import { toast } from 'sonner'

// ════════════════════════════════════════════════════════════
//  Constants
// ════════════════════════════════════════════════════════════

const SORT_OPTIONS = [
  { value: 'members',  label: '👥 الأكثر أعضاء',  icon: Users },
  { value: 'activity', label: '📊 الأنشط',         icon: TrendingUp },
  { value: 'joined',   label: '🕒 أحدث انضمام',   icon: Calendar },
  { value: 'name',     label: 'أ-ي ترتيب أبجدي',  icon: Hash },
]

const PLAN_COLORS = {
  silver:  'bg-slate-500/15 text-slate-300 border-slate-500/30',
  gold:    'bg-amber-500/15 text-amber-300 border-amber-500/30',
  diamond: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
}

// ════════════════════════════════════════════════════════════
//  Main Page
// ════════════════════════════════════════════════════════════

export default function OwnerServersPage() {
  const { user } = useAuthStore()

  // Owner guard
  if (!user?.isOwner && !isOwner(user?.id)) {
    return <Navigate to="/dashboard" replace />
  }

  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('members')
  const [selectedGuild, setSelectedGuild] = useState(null)
  const queryClient = useQueryClient()

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['owner-servers', search, sort],
    queryFn: () => apiClient.get(`/api/owner/servers?search=${encodeURIComponent(search)}&sort=${sort}`),
    staleTime: 30 * 1000,
    keepPreviousData: true,
  })

  const handleRefresh = () => {
    queryClient.invalidateQueries(['owner-servers'])
    refetch()
    toast.success('جاري التحديث...')
  }

  const stats = data?.data ?? data ?? {}
  const servers = stats.servers || []

  return (
    <>
      <SettingsPageHeader
        icon={<Globe />}
        title="السيرفرات"
        description="إدارة كل السيرفرات اللي فيها البوت"
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
      <StatsOverview stats={stats} isLoading={isLoading} />

      {/* ─── Filters Bar ─── */}
      <Card className="p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث باسم السيرفر، ID، أو اسم المالك..."
              className="pr-9"
            />
          </div>

          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-[180px]">
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

      {/* ─── Servers List ─── */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : stats.error ? (
        <Card className="p-12 text-center">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
          <p className="text-muted-foreground">
            البوت غير متاح حالياً — حاول لاحقاً
          </p>
        </Card>
      ) : servers.length === 0 ? (
        <Card className="p-12 text-center">
          <Globe className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
          <p className="text-muted-foreground">
            {search ? 'ما لقينا نتائج' : 'البوت ما في أي سيرفر بعد'}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {servers.map((server) => (
            <ServerRow
              key={server.id}
              server={server}
              onClick={() => setSelectedGuild(server.id)}
            />
          ))}
        </div>
      )}

      {/* ─── Server Detail Modal ─── */}
      {selectedGuild && (
        <ServerDetailModal
          guildId={selectedGuild}
          onClose={() => setSelectedGuild(null)}
          onActionComplete={() => {
            handleRefresh()
            setSelectedGuild(null)
          }}
        />
      )}
    </>
  )
}

// ════════════════════════════════════════════════════════════
//  Stats Overview
// ════════════════════════════════════════════════════════════

function StatsOverview({ stats, isLoading }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard
        icon={<Globe />}
        label="إجمالي السيرفرات"
        value={stats.total || 0}
        color="violet"
      />
      <StatCard
        icon={<Users />}
        label="إجمالي الأعضاء"
        value={formatCompact(stats.total_members || 0)}
        color="emerald"
      />
      <StatCard
        icon={<Sparkles />}
        label="مشتركين نشطين"
        value={stats.total_subscribed || 0}
        color="amber"
      />
      <StatCard
        icon={<TrendingUp />}
        label="معدّل الأعضاء"
        value={
          stats.total > 0
            ? formatCompact(Math.round((stats.total_members || 0) / stats.total))
            : 0
        }
        color="sky"
      />
    </div>
  )
}

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
        <div className="w-10 h-10 rounded-lg bg-card/50 flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground truncate">{label}</p>
          <p className="text-2xl font-bold truncate font-mono">{value}</p>
        </div>
      </div>
    </Card>
  )
}

// ════════════════════════════════════════════════════════════
//  Server Row
// ════════════════════════════════════════════════════════════

function ServerRow({ server, onClick }) {
  const sub = server.subscription
  const activity = server.activity || { messages_7d: 0, commands_7d: 0 }
  const totalActivity = activity.messages_7d + activity.commands_7d

  return (
    <Card
      onClick={onClick}
      className="p-4 cursor-pointer hover:bg-card/80 transition-colors hover:border-primary/30 group"
    >
      <div className="flex items-center gap-4 flex-wrap md:flex-nowrap">
        {/* Server Icon */}
        <div className="relative flex-shrink-0">
          {server.icon_url ? (
            <img
              src={server.icon_url}
              alt=""
              className="w-14 h-14 rounded-xl border border-border"
              loading="lazy"
            />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center text-2xl font-bold">
              {server.name?.[0]?.toUpperCase() || '?'}
            </div>
          )}
          {sub?.status === 'active' && (
            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center border-2 border-background">
              <Crown className="w-3 h-3 text-white" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="font-bold text-lg truncate">{server.name}</h3>
            {sub?.plan_id && (
              <Badge className={cn('text-[10px]', PLAN_COLORS[sub.plan_id])}>
                {sub.is_trial ? '🎁 ' : '👑 '}
                {sub.plan_id}
              </Badge>
            )}
            {server.partnered && (
              <Badge variant="default" className="text-[10px] bg-blue-500/15 text-blue-300 border-blue-500/30">
                ✓ شريك
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground font-mono mb-2 truncate">
            {server.id}
          </p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            <span className="inline-flex items-center gap-1">
              <Users className="w-3 h-3" />
              {formatCompact(server.member_count)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Hash className="w-3 h-3" />
              {server.channel_count}
            </span>
            {server.owner_name && (
              <span className="inline-flex items-center gap-1 truncate">
                <Crown className="w-3 h-3" />
                {server.owner_name}
              </span>
            )}
          </div>
        </div>

        {/* Activity Stats */}
        <div className="flex-shrink-0 text-left">
          <p className="text-xs text-muted-foreground mb-0.5">نشاط 7 أيام</p>
          <p className="text-lg font-bold font-mono text-emerald-400">
            {formatCompact(totalActivity)}
          </p>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            💬 {formatCompact(activity.messages_7d)} • ⚡ {activity.commands_7d}
          </div>
        </div>

        {/* Arrow */}
        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 rotate-180" />
      </div>
    </Card>
  )
}

// ════════════════════════════════════════════════════════════
//  Server Detail Modal
// ════════════════════════════════════════════════════════════

function ServerDetailModal({ guildId, onClose, onActionComplete }) {
  const [showMessageModal, setShowMessageModal] = useState(false)
  const [showLeaveModal, setShowLeaveModal] = useState(false)

  const { data: detail, isLoading } = useQuery({
    queryKey: ['owner-server-detail', guildId],
    queryFn: () => apiClient.get(`/api/owner/servers/${guildId}`),
    staleTime: 30 * 1000,
  })

  useEffect(() => {
    const handler = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const data = detail?.data ?? detail ?? {}
  const server = data.server
  const sub = data.subscription
  const settings = data.settings || {}
  const activity30d = data.activity_30d || []

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <Card
        className="max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 left-3 p-2 rounded-lg hover:bg-accent transition-colors z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </div>
        ) : !server ? (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-muted-foreground">السيرفر غير متاح</p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* ─── Header ─── */}
            <div className="flex items-start gap-4 flex-wrap">
              {server.icon_url ? (
                <img
                  src={server.icon_url}
                  alt=""
                  className="w-20 h-20 rounded-2xl border-2 border-border flex-shrink-0"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center text-3xl font-bold flex-shrink-0">
                  {server.name?.[0]?.toUpperCase()}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <h2 className="text-2xl font-bold truncate">{server.name}</h2>
                <p className="text-xs text-muted-foreground font-mono">{server.id}</p>
                {server.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {server.description}
                  </p>
                )}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {server.verified && (
                    <Badge variant="default" className="text-[10px] bg-blue-500/15 text-blue-300 border-blue-500/30">
                      ✓ موثّق
                    </Badge>
                  )}
                  {server.partnered && (
                    <Badge variant="default" className="text-[10px] bg-purple-500/15 text-purple-300 border-purple-500/30">
                      شريك
                    </Badge>
                  )}
                  {server.boost_tier > 0 && (
                    <Badge variant="default" className="text-[10px] bg-pink-500/15 text-pink-300 border-pink-500/30">
                      💎 Boost Tier {server.boost_tier}
                    </Badge>
                  )}
                  {sub?.status === 'active' && (
                    <Badge className={cn('text-[10px]', PLAN_COLORS[sub.plan_id])}>
                      {sub.is_trial ? '🎁 ' : '👑 '}
                      {sub.plan_id} نشط
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* ─── Stats Grid ─── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MiniStat icon={<Users />} label="الأعضاء" value={formatCompact(server.member_count)} color="emerald" />
              <MiniStat icon={<Hash />} label="القنوات" value={server.channel_count} color="sky" />
              <MiniStat icon={<Award />} label="الرتب" value={server.role_count} color="amber" />
              <MiniStat icon={<Sparkles />} label="الإيموجي" value={server.emoji_count} color="rose" />
            </div>

            {/* ─── Channel breakdown ─── */}
            {server.channel_stats && (
              <Card className="p-4 bg-card/50">
                <h3 className="font-semibold mb-3 text-sm flex items-center gap-2">
                  <Hash className="w-4 h-4" />
                  تفاصيل القنوات
                </h3>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <ChannelCount icon="💬" label="نصية" count={server.channel_stats.text} />
                  <ChannelCount icon="🔊" label="صوتية" count={server.channel_stats.voice} />
                  <ChannelCount icon="📁" label="فئات" count={server.channel_stats.category} />
                  <ChannelCount icon="📋" label="فورم" count={server.channel_stats.forum} />
                  <ChannelCount icon="🎤" label="ستيج" count={server.channel_stats.stage} />
                  <ChannelCount icon="📢" label="إعلانات" count={server.channel_stats.announcement} />
                </div>
              </Card>
            )}

            {/* ─── Owner ─── */}
            {server.owner && (
              <Card className="p-4 bg-card/50">
                <h3 className="font-semibold mb-3 text-sm flex items-center gap-2">
                  <Crown className="w-4 h-4" />
                  مالك السيرفر
                </h3>
                <div className="flex items-center gap-3">
                  <img
                    src={server.owner.avatar}
                    alt=""
                    className="w-12 h-12 rounded-full"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{server.owner.name}</p>
                    <p className="text-xs text-muted-foreground font-mono truncate">{server.owner.id}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      انضم Discord منذ {new Date(server.owner.created_at).toLocaleDateString('ar')}
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* ─── Bot Joined ─── */}
            <Card className="p-3 bg-card/50">
              <div className="flex items-center gap-2 text-xs">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">البوت انضم:</span>
                <span className="font-mono">
                  {server.bot_joined_at
                    ? new Date(server.bot_joined_at).toLocaleString('ar')
                    : 'غير معروف'}
                </span>
              </div>
            </Card>

            {/* ─── Systems Status ─── */}
            <Card className="p-4 bg-card/50">
              <h3 className="font-semibold mb-3 text-sm">حالة الأنظمة</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                <SystemPill enabled={settings.ai_enabled} label="AI" />
                <SystemPill enabled={settings.xp_enabled} label="XP" />
                <SystemPill enabled={settings.economy_enabled} label="الاقتصاد" />
                <SystemPill enabled={settings.welcome_enabled} label="الترحيب" />
                <SystemPill enabled={settings.protection_enabled} label="الحماية" />
                <SystemPill enabled={settings.logs_enabled} label="اللوقات" />
              </div>
            </Card>

            {/* ─── Activity 30d Chart (simple bars) ─── */}
            {activity30d.length > 0 && (
              <Card className="p-4 bg-card/50">
                <h3 className="font-semibold mb-3 text-sm flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  نشاط آخر 30 يوم
                </h3>
                <ActivityChart data={activity30d} />
              </Card>
            )}

            {/* ─── Actions ─── */}
            <div className="flex items-center gap-2 pt-2 border-t border-border flex-wrap">
              <Button
                variant="default"
                onClick={() => setShowMessageModal(true)}
                className="flex-1 min-w-[140px]"
              >
                <Send className="w-4 h-4" />
                <span>رسالة لمالك السيرفر</span>
              </Button>
              <Button
                variant="destructive"
                onClick={() => setShowLeaveModal(true)}
                className="flex-1 min-w-[140px]"
              >
                <LogOut className="w-4 h-4" />
                <span>خروج البوت</span>
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Sub-modals */}
      {showMessageModal && server && (
        <MessageOwnerModal
          server={server}
          onClose={() => setShowMessageModal(false)}
          onSent={() => {
            setShowMessageModal(false)
            toast.success('تم إرسال الرسالة')
          }}
        />
      )}

      {showLeaveModal && server && (
        <LeaveGuildModal
          server={server}
          onClose={() => setShowLeaveModal(false)}
          onLeft={() => {
            setShowLeaveModal(false)
            onActionComplete()
            toast.success('خرج البوت من السيرفر')
          }}
        />
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════
//  Sub-components
// ════════════════════════════════════════════════════════════

function MiniStat({ icon, label, value, color }) {
  const colors = {
    emerald: 'text-emerald-400 bg-emerald-500/10',
    sky:     'text-sky-400 bg-sky-500/10',
    amber:   'text-amber-400 bg-amber-500/10',
    rose:    'text-rose-400 bg-rose-500/10',
  }

  return (
    <Card className="p-3 bg-card/50">
      <div className="flex items-center gap-2">
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', colors[color])}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[10px] text-muted-foreground truncate">{label}</p>
          <p className="text-sm font-bold font-mono truncate">{value}</p>
        </div>
      </div>
    </Card>
  )
}

function ChannelCount({ icon, label, count }) {
  return (
    <div className="flex items-center justify-between p-2 rounded-lg bg-card/50">
      <span className="text-muted-foreground">
        {icon} {label}
      </span>
      <span className="font-mono font-bold">{count}</span>
    </div>
  )
}

function SystemPill({ enabled, label }) {
  return (
    <div
      className={cn(
        'flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-xs',
        enabled
          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
          : 'bg-muted/50 border-border text-muted-foreground'
      )}
    >
      {enabled ? (
        <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
      ) : (
        <XCircle className="w-3 h-3 flex-shrink-0" />
      )}
      <span className="truncate">{label}</span>
    </div>
  )
}

function ActivityChart({ data }) {
  const maxVal = useMemo(
    () => Math.max(...data.map((d) => (d.messages_count || 0) + (d.commands_count || 0)), 1),
    [data]
  )

  return (
    <div className="flex items-end gap-1 h-24" dir="ltr">
      {data.map((day, idx) => {
        const total = (day.messages_count || 0) + (day.commands_count || 0)
        const heightPct = (total / maxVal) * 100
        return (
          <div
            key={idx}
            className="flex-1 flex flex-col items-center group relative"
            title={`${day.date}: ${total} نشاط`}
          >
            <div
              className="w-full bg-emerald-500/30 hover:bg-emerald-500/60 rounded-t transition-all"
              style={{ height: `${heightPct}%`, minHeight: '2px' }}
            />
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-popover text-popover-foreground text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap pointer-events-none transition-opacity z-10">
              {day.date}: {total}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ════════════════════════════════════════════════════════════
//  Message Owner Modal
// ════════════════════════════════════════════════════════════

function MessageOwnerModal({ server, onClose, onSent }) {
  const [message, setMessage] = useState('')

  const sendMutation = useMutation({
    mutationFn: () =>
      apiClient.post(`/api/owner/servers/${server.id}/message-owner`, { message }),
    onSuccess: () => onSent(),
    onError: (err) => {
      const msg = err?.response?.data?.error || err.message || 'فشل الإرسال'
      toast.error(msg)
    },
  })

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>📩 رسالة لمالك السيرفر</DialogTitle>
          <DialogDescription>
            راح ترسل DM لمالك سيرفر <strong>{server.name}</strong> من البوت.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="اكتب الرسالة هنا... (حد أقصى 2000 حرف)"
            maxLength={2000}
            rows={6}
            className="w-full p-3 rounded-lg border border-border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <p className="text-xs text-muted-foreground mt-1 text-left font-mono">
            {message.length} / 2000
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={sendMutation.isLoading}>
            إلغاء
          </Button>
          <Button
            onClick={() => sendMutation.mutate()}
            disabled={!message.trim() || sendMutation.isLoading}
          >
            {sendMutation.isLoading ? (
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
//  Leave Guild Modal
// ════════════════════════════════════════════════════════════

function LeaveGuildModal({ server, onClose, onLeft }) {
  const [confirmName, setConfirmName] = useState('')

  const leaveMutation = useMutation({
    mutationFn: () => apiClient.delete(`/api/owner/servers/${server.id}/leave`),
    onSuccess: () => onLeft(),
    onError: (err) => {
      const msg = err?.response?.data?.error || err.message || 'فشل الخروج'
      toast.error(msg)
    },
  })

  const canConfirm = confirmName === server.name

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-rose-400 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            خروج البوت من السيرفر
          </DialogTitle>
          <DialogDescription>
            هذا إجراء <strong className="text-rose-400">لا يمكن التراجع عنه</strong>.
            البوت راح يخرج فوراً من <strong>{server.name}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-3">
          <Card className="p-3 bg-rose-500/10 border-rose-500/30">
            <p className="text-xs text-rose-300">
              ⚠️ كل الإعدادات والبيانات الخاصة بالسيرفر تبقى في الـ DB لكن البوت ما يقدر يصل لها.
              <br />
              ⚠️ راح يتم إرسال DM لمالك السيرفر يخبره بالخروج (لو DMs مفتوحة).
            </p>
          </Card>

          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">
              للتأكيد، اكتب اسم السيرفر بالضبط:
              <code className="mx-2 px-2 py-0.5 rounded bg-muted text-foreground">
                {server.name}
              </code>
            </label>
            <Input
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder={server.name}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={leaveMutation.isLoading}>
            إلغاء
          </Button>
          <Button
            variant="destructive"
            onClick={() => leaveMutation.mutate()}
            disabled={!canConfirm || leaveMutation.isLoading}
          >
            {leaveMutation.isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <LogOut className="w-4 h-4" />
            )}
            <span>خروج البوت نهائياً</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
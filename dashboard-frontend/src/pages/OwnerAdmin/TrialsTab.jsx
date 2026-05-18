/**
 * ═══════════════════════════════════════════════════════════
 *  TrialsTab — تبويب إدارة التجارب المجانية (Owner Only)
 *  المسار: dashboard-frontend/src/pages/OwnerAdmin/TrialsTab.jsx
 *
 *  الميزات:
 *   • منح Trial لمستخدم معين بمدة 1-30 يوم
 *   • قائمة كل الـ Trials النشطة والمنتهية
 *   • إلغاء Trial يدوياً
 *   • العداد التنازلي للأيام المتبقية
 * ═══════════════════════════════════════════════════════════
 */

import { useState, useEffect, useMemo } from 'react'
import {
  Gift,
  User,
  Calendar,
  Clock,
  Sparkles,
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  XCircle,
  StickyNote,
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { adminApi } from '@/api'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// ────────────────────────────────────────────────────────────────────
//  Constants
// ────────────────────────────────────────────────────────────────────

const PLAN_META = {
  silver:  { name: 'فضي',   icon: '🥈', color: 'text-zinc-400',  border: 'border-zinc-400/30' },
  gold:    { name: 'ذهبي',  icon: '🥇', color: 'text-amber-400', border: 'border-amber-400/30' },
  diamond: { name: 'ماسي',  icon: '💎', color: 'text-sky-400',   border: 'border-sky-400/30' },
}

const QUICK_DAYS = [1, 3, 7, 14, 30]

// ════════════════════════════════════════════════════════════
//  Main TrialsTab Component
// ════════════════════════════════════════════════════════════

export default function TrialsTab() {
  // ─── Grant Trial Form State ───
  const [userId, setUserId] = useState('')
  const [planId, setPlanId] = useState('gold')
  const [days, setDays] = useState(3)
  const [notes, setNotes] = useState('')
  const [granting, setGranting] = useState(false)

  // ─── Trials List State ───
  const [trials, setTrials] = useState(null)
  const [search, setSearch] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  // ────────────────────────────────────────
  //  Load Trials
  // ────────────────────────────────────────

  const loadTrials = async (silent = false) => {
    if (!silent) setTrials(null)
    try {
      const r = await adminApi.listTrials()
      const data = r?.data ?? r
      setTrials(data?.trials || [])
    } catch (err) {
      console.error('[TrialsTab] Load failed:', err)
      toast.error('فشل تحميل التجارب')
      setTrials([])
    }
  }

  useEffect(() => {
    loadTrials()
  }, [])

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadTrials(true)
    setRefreshing(false)
    toast.success('تم التحديث')
  }

  // ────────────────────────────────────────
  //  Grant Trial
  // ────────────────────────────────────────

  const handleGrant = async (e) => {
    e?.preventDefault?.()

    const id = userId.trim()
    if (!id) {
      toast.error('أدخل ID المستخدم')
      return
    }
    if (!/^\d{15,22}$/.test(id)) {
      toast.error('ID غير صالح — يجب أن يكون أرقام Discord')
      return
    }

    setGranting(true)
    try {
      const r = await adminApi.grantTrial(id, planId, days, notes.trim() || null)
      const data = r?.data ?? r

      toast.success(data?.message || `تم منح Trial بنجاح`)

      // Reset form
      setUserId('')
      setNotes('')
      setDays(3)

      // Refresh list
      await loadTrials(true)
    } catch (err) {
      const code = err?.response?.data?.code || err?.code
      const message = err?.response?.data?.error || err?.message

      if (code === 'TRIAL_ALREADY_GRANTED') {
        toast.error('هذا المستخدم استلم Trial من قبل')
      } else if (code === 'HAS_PAID_SUBSCRIPTION') {
        toast.error('عنده اشتراك مدفوع نشط')
      } else {
        toast.error(message || 'فشل منح Trial')
      }
    } finally {
      setGranting(false)
    }
  }

  // ────────────────────────────────────────
  //  Cancel Trial (uses cancelSubscription)
  // ────────────────────────────────────────

  const handleCancel = async (uid) => {
    if (!confirm(`متأكد تبي تلغي Trial للمستخدم ${uid}؟`)) return

    try {
      await adminApi.cancelSubscription(uid)
      toast.success('تم إلغاء التجربة')
      await loadTrials(true)
    } catch (err) {
      toast.error(err?.message || 'فشل الإلغاء')
    }
  }

  // ────────────────────────────────────────
  //  Filter
  // ────────────────────────────────────────

  const filtered = useMemo(() => {
    if (!Array.isArray(trials)) return []
    if (!search.trim()) return trials
    const q = search.trim().toLowerCase()
    return trials.filter(
      (t) =>
        String(t.user_id).includes(q) ||
        String(t.plan_id || '').toLowerCase().includes(q) ||
        String(t.notes || '').toLowerCase().includes(q),
    )
  }, [trials, search])

  const stats = useMemo(() => {
    if (!Array.isArray(trials)) return { total: 0, active: 0, expired: 0 }
    return {
      total: trials.length,
      active: trials.filter((t) => !t.is_expired).length,
      expired: trials.filter((t) => t.is_expired).length,
    }
  }, [trials])

  return (
    <div className="space-y-6">
      {/* ═══════════════════════════════════════════════════ */}
      {/*  Stats Cards                                       */}
      {/* ═══════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          icon={<Sparkles className="w-5 h-5" />}
          label="الإجمالي"
          value={stats.total}
          color="violet"
        />
        <StatCard
          icon={<CheckCircle2 className="w-5 h-5" />}
          label="نشطة"
          value={stats.active}
          color="emerald"
        />
        <StatCard
          icon={<XCircle className="w-5 h-5" />}
          label="منتهية"
          value={stats.expired}
          color="slate"
        />
      </div>

      {/* ═══════════════════════════════════════════════════ */}
      {/*  Grant Trial Form                                  */}
      {/* ═══════════════════════════════════════════════════ */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-pink-500/20 border border-violet-500/30 flex items-center justify-center">
            <Gift className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h3 className="font-bold">منح تجربة مجانية</h3>
            <p className="text-sm text-muted-foreground">
              أعطِ مستخدم تجربة قصيرة قبل ما يدفع
            </p>
          </div>
        </div>

        <form onSubmit={handleGrant} className="space-y-4">
          {/* User ID */}
          <div>
            <label className="block text-sm font-medium mb-2">
              <User className="w-4 h-4 inline ml-1" />
              ID المستخدم
            </label>
            <Input
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="مثال: 529320108032786433"
              dir="ltr"
              className="font-mono"
              disabled={granting}
            />
          </div>

          {/* Plan Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">الخطة</label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(PLAN_META).map(([id, meta]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPlanId(id)}
                  disabled={granting}
                  className={cn(
                    'p-3 rounded-xl border-2 transition-all text-center',
                    planId === id
                      ? `${meta.border} bg-card`
                      : 'border-border bg-card/50 hover:border-border/80',
                  )}
                >
                  <div className="text-2xl mb-1">{meta.icon}</div>
                  <div className={cn('text-sm font-medium', meta.color)}>
                    {meta.name}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Days Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">
              <Calendar className="w-4 h-4 inline ml-1" />
              المدة (يوم)
            </label>
            <div className="flex gap-2 flex-wrap mb-2">
              {QUICK_DAYS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDays(d)}
                  disabled={granting}
                  className={cn(
                    'px-4 py-2 rounded-lg border transition-all text-sm font-medium',
                    days === d
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-card hover:border-border/80',
                  )}
                >
                  {d} {d === 1 ? 'يوم' : 'أيام'}
                </button>
              ))}
            </div>
            <Input
              type="number"
              min={1}
              max={30}
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value) || 1)}
              disabled={granting}
              className="w-32"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-2">
              <StickyNote className="w-4 h-4 inline ml-1" />
              ملاحظات (اختياري)
            </label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثال: ترويج لسيرفر كبير"
              disabled={granting}
              maxLength={200}
            />
          </div>

          {/* Warning */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
            <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              كل مستخدم يقدر يحصل على Trial واحدة فقط. التجربة تنتهي تلقائياً
              وتنسحب الرتبة + ترجع للخطة المجانية.
            </p>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={granting || !userId.trim()}
            className="w-full"
          >
            {granting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>جاري المنح...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>منح Trial</span>
              </>
            )}
          </Button>
        </form>
      </Card>

      {/* ═══════════════════════════════════════════════════ */}
      {/*  Trials List                                       */}
      {/* ═══════════════════════════════════════════════════ */}
      <div>
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <h3 className="font-bold flex items-center gap-2">
            <Clock className="w-5 h-5" />
            التجارب الممنوحة
          </h3>
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث..."
                className="pr-9"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
            </Button>
          </div>
        </div>

        {trials === null ? (
          <div className="space-y-3">
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </div>
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center">
            <Gift className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-muted-foreground">
              {trials.length === 0
                ? 'لا توجد تجارب مجانية بعد'
                : 'ما لقينا نتائج للبحث'}
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((trial) => (
              <TrialRow
                key={trial.user_id}
                trial={trial}
                onCancel={() => handleCancel(trial.user_id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────
//  StatCard subcomponent
// ────────────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, color }) {
  const colors = {
    violet:  'from-violet-500/20 to-violet-500/5 border-violet-500/30 text-violet-400',
    emerald: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/30 text-emerald-400',
    slate:   'from-slate-500/20 to-slate-500/5 border-slate-500/30 text-slate-400',
  }
  return (
    <Card className={cn('p-4 bg-gradient-to-br border', colors[color])}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground mb-1">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
        <div>{icon}</div>
      </div>
    </Card>
  )
}

// ────────────────────────────────────────────────────────────────────
//  TrialRow subcomponent
// ────────────────────────────────────────────────────────────────────

function TrialRow({ trial, onCancel }) {
  const meta = PLAN_META[trial.plan_id] || PLAN_META.silver
  const isExpired = trial.is_expired
  const daysLeft = trial.days_left ?? 0

  return (
    <Card className={cn('p-4', isExpired && 'opacity-60')}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={cn(
            'w-12 h-12 rounded-xl border flex items-center justify-center text-xl flex-shrink-0',
            meta.border,
          )}>
            {meta.icon}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <code className="text-sm font-mono">{trial.user_id}</code>
              <Badge variant={isExpired ? 'secondary' : 'success'} size="sm">
                {isExpired ? 'منتهية' : 'نشطة'}
              </Badge>
              <span className={cn('text-sm font-medium', meta.color)}>
                {meta.name}
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {trial.expires_at
                  ? new Date(trial.expires_at).toLocaleDateString('ar-SA')
                  : '—'}
              </span>
              {!isExpired && daysLeft !== null && (
                <span className={cn(
                  'flex items-center gap-1',
                  daysLeft <= 1 ? 'text-amber-400' : ''
                )}>
                  <Clock className="w-3 h-3" />
                  {daysLeft > 0 ? `${daysLeft} يوم متبقي` : 'تنتهي اليوم'}
                </span>
              )}
            </div>

            {trial.notes && (
              <p className="text-xs text-muted-foreground mt-2 italic">
                💬 {trial.notes}
              </p>
            )}
          </div>
        </div>

        {!isExpired && (
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            className="text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/30"
          >
            إلغاء
          </Button>
        )}
      </div>
    </Card>
  )
}
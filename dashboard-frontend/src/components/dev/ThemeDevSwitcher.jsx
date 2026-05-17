/**
 * ═══════════════════════════════════════════════════════════
 *  Theme Dev Switcher (Owner Only)
 *  المسار: src/components/dev/ThemeDevSwitcher.jsx
 *
 *  - يظهر للـ OWNER_ID فقط
 *  - زر عائم في الزاوية اليمنى السفلى
 *  - يفتح panel فيه 7 ثيمات + زر "اليوم الحالي"
 *  - يخفي نفسه تلقائياً لغير المطور
 * ═══════════════════════════════════════════════════════════
 */

import { useState, useEffect } from 'react'
import { Palette, X, Check, RotateCcw, Calendar } from 'lucide-react'
import {
  THEMES,
  THEME_DAYS,
  getCurrentTheme,
  getTodayTheme,
  isManualOverride,
  setManualTheme,
  clearManualTheme,
  onThemeChange,
} from '@/lib/themeSystem'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'

const OWNER_ID = '529320108032786433'

export function ThemeDevSwitcher() {
  const { user } = useAuthStore()
  const [open, setOpen] = useState(false)
  const [activeTheme, setActiveTheme] = useState(getCurrentTheme())
  const [isManual, setIsManual] = useState(isManualOverride())

  // ── Subscribe to theme changes ──
  useEffect(() => {
    const unsubscribe = onThemeChange(({ theme, isManual: manual }) => {
      setActiveTheme(theme)
      setIsManual(manual)
    })
    return unsubscribe
  }, [])

  // ── ESC key closes panel ──
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open])

  // ── Owner check ──
  if (!user || String(user.id) !== OWNER_ID) {
    return null
  }

  const todayTheme = getTodayTheme()
  const todayInfo = THEMES[todayTheme]
  const activeInfo = THEMES[activeTheme]

  return (
    <>
      {/* ── Floating Button ── */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'fixed bottom-6 left-6 z-[9999]',
          'w-14 h-14 rounded-2xl',
          'flex items-center justify-center',
          'border border-white/10',
          'backdrop-blur-xl',
          'transition-all duration-300',
          'hover:scale-110 active:scale-95',
          'group',
        )}
        style={{
          background: activeInfo?.gradient || 'linear-gradient(135deg, #a855f7, #ec4899)',
          boxShadow: `0 0 20px -4px ${activeInfo?.primary || '#a855f7'}, 0 0 40px -8px ${activeInfo?.accent || '#ec4899'}`,
        }}
        title="Theme Switcher (Dev)"
      >
        <Palette className="w-6 h-6 text-white drop-shadow-lg" />

        {/* مؤشر إذا في override يدوي */}
        {isManual && (
          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-400 border-2 border-background animate-pulse" />
        )}
      </button>

      {/* ── Panel ── */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setOpen(false)}
          />

          {/* Panel content */}
          <div
            className={cn(
              'fixed bottom-24 left-6 z-[9999]',
              'w-80 max-w-[calc(100vw-3rem)]',
              'rounded-3xl overflow-hidden',
              'border border-white/10',
              'backdrop-blur-2xl',
              'bg-card/80',
              'shadow-2xl',
              'animate-in slide-in-from-bottom-4 duration-300',
            )}
            style={{
              boxShadow: `0 25px 50px -12px rgba(0,0,0,0.5), 0 0 40px -10px ${activeInfo?.primary || '#a855f7'}`,
            }}
          >
            {/* ── Header ── */}
            <div className="relative p-5 pb-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Palette className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-bold">لوحة الثيمات</h3>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-500 font-semibold">
                      DEV
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    معاينة ثيمات الأسبوع
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="h-px bg-white/5" />

            {/* ── Status banner ── */}
            <div className="px-5 py-3 bg-white/5">
              <div className="flex items-center gap-2 text-xs">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">اليوم:</span>
                <span className="font-semibold">{todayInfo?.dayAr}</span>
                <span className="text-muted-foreground">·</span>
                <span style={{ color: todayInfo?.primary }}>{todayInfo?.nameAr}</span>
              </div>
              {isManual && (
                <div className="mt-2 flex items-center gap-2 text-[11px] text-amber-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  <span>وضع المعاينة اليدوية مفعّل</span>
                </div>
              )}
            </div>

            {/* ── Themes grid ── */}
            <div className="p-4 grid grid-cols-1 gap-2 max-h-[60vh] overflow-y-auto">
              {THEME_DAYS.map((dayKey) => {
                const theme = THEMES[dayKey]
                const isActive = activeTheme === dayKey
                const isToday = todayTheme === dayKey

                return (
                  <button
                    key={dayKey}
                    type="button"
                    onClick={() => setManualTheme(dayKey)}
                    className={cn(
                      'group relative w-full p-3 rounded-2xl',
                      'flex items-center gap-3',
                      'border transition-all duration-300',
                      'hover:scale-[1.02] active:scale-[0.98]',
                      isActive
                        ? 'border-white/30 bg-white/10'
                        : 'border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/15',
                    )}
                  >
                    {/* ── Color preview ── */}
                    <div
                      className="w-10 h-10 rounded-xl flex-shrink-0 relative overflow-hidden"
                      style={{
                        background: theme.gradient,
                        boxShadow: isActive
                          ? `0 0 20px -4px ${theme.primary}`
                          : `0 4px 12px -4px ${theme.primary}80`,
                      }}
                    >
                      <span className="absolute inset-0 flex items-center justify-center text-base">
                        {theme.icon}
                      </span>
                    </div>

                    {/* ── Info ── */}
                    <div className="flex-1 text-right min-w-0">
                      <div className="flex items-center gap-2 justify-end">
                        <span className="text-sm font-semibold truncate">
                          {theme.nameAr}
                        </span>
                        {isToday && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-primary/20 text-primary font-bold flex-shrink-0">
                            اليوم
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 justify-end">
                        <span>{theme.dayAr}</span>
                        <span>·</span>
                        <span className="font-mono opacity-70">{theme.name}</span>
                      </div>
                    </div>

                    {/* ── Active indicator ── */}
                    {isActive && (
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{
                          background: theme.gradient,
                          boxShadow: `0 0 12px -2px ${theme.primary}`,
                        }}
                      >
                        <Check className="w-4 h-4 text-white" strokeWidth={3} />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>

            {/* ── Footer actions ── */}
            <div className="p-4 pt-2 border-t border-white/5">
              <button
                type="button"
                onClick={clearManualTheme}
                disabled={!isManual}
                className={cn(
                  'w-full px-4 py-2.5 rounded-xl',
                  'flex items-center justify-center gap-2',
                  'text-xs font-semibold',
                  'border border-white/10',
                  'transition-all duration-200',
                  isManual
                    ? 'bg-white/5 hover:bg-white/10 text-foreground cursor-pointer'
                    : 'bg-white/5 text-muted-foreground/50 cursor-not-allowed',
                )}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {isManual ? 'العودة لثيم اليوم التلقائي' : 'الوضع التلقائي نشط'}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
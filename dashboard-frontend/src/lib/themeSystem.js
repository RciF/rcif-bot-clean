/**
 * ═══════════════════════════════════════════════════════════
 *  Theme System — Daily Neon Themes
 *  المسار: src/lib/themeSystem.js
 *
 *  - يطبق ثيم اليوم تلقائياً عند تحميل الصفحة
 *  - يدعم override يدوي للمطور (يحفظ في localStorage)
 *  - يبث event عند تغيير الثيم (للـ DevSwitcher)
 *  - يطبق flash effect سلس عند التبديل
 * ═══════════════════════════════════════════════════════════
 */

// ── أيام الأسبوع — بالترتيب من 0 (الأحد) إلى 6 (السبت) ──
export const THEME_DAYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
]

// ── معلومات كل ثيم (للعرض في الـ DevSwitcher) ──
export const THEMES = {
  sunday: {
    id: 'sunday',
    name: 'Violet Storm',
    nameAr: 'العاصفة البنفسجية',
    icon: '🟣',
    dayAr: 'الأحد',
    primary: '#a855f7',
    accent: '#ec4899',
    gradient: 'linear-gradient(135deg, #a855f7, #ec4899)',
  },
  monday: {
    id: 'monday',
    name: 'Cyan Pulse',
    nameAr: 'نبضة سماوية',
    icon: '🔵',
    dayAr: 'الإثنين',
    primary: '#06b6d4',
    accent: '#3b82f6',
    gradient: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
  },
  tuesday: {
    id: 'tuesday',
    name: 'Emerald Matrix',
    nameAr: 'المصفوفة الزمردية',
    icon: '🟢',
    dayAr: 'الثلاثاء',
    primary: '#10b981',
    accent: '#14b8a6',
    gradient: 'linear-gradient(135deg, #10b981, #14b8a6)',
  },
  wednesday: {
    id: 'wednesday',
    name: 'Sunset Blaze',
    nameAr: 'لهيب الغروب',
    icon: '🟠',
    dayAr: 'الأربعاء',
    primary: '#f97316',
    accent: '#f43f5e',
    gradient: 'linear-gradient(135deg, #f97316, #f43f5e)',
  },
  thursday: {
    id: 'thursday',
    name: 'Lime Burst',
    nameAr: 'الانفجار الليموني',
    icon: '🟢',
    dayAr: 'الخميس',
    primary: '#84cc16',
    accent: '#22c55e',
    gradient: 'linear-gradient(135deg, #84cc16, #22c55e)',
  },
  friday: {
    id: 'friday',
    name: 'Gold Royal',
    nameAr: 'الذهب الملكي',
    icon: '👑',
    dayAr: 'الجمعة',
    primary: '#facc15',
    accent: '#f97316',
    gradient: 'linear-gradient(135deg, #facc15, #f97316)',
  },
  saturday: {
    id: 'saturday',
    name: 'Crimson Fire',
    nameAr: 'النار القرمزية',
    icon: '🔴',
    dayAr: 'السبت',
    primary: '#ef4444',
    accent: '#f43f5e',
    gradient: 'linear-gradient(135deg, #ef4444, #f43f5e)',
  },
}

// ── localStorage key للـ override اليدوي (للمطور فقط) ──
const STORAGE_KEY = 'lyn-theme-override'

// ── Event name للـ listeners ──
const THEME_CHANGE_EVENT = 'lyn-theme-changed'

// ──────────────────────────────────────────────────────────────────
//  Core Functions
// ──────────────────────────────────────────────────────────────────

/**
 * يرجع اسم اليوم الحالي (بالإنجليزي، lowercase)
 * مثال: 'sunday', 'monday', ...
 */
export function getTodayTheme() {
  const day = new Date().getDay() // 0 = Sunday, 6 = Saturday
  return THEME_DAYS[day]
}

/**
 * يرجع الـ override اليدوي من localStorage (لو موجود)
 * يرجع null إذا ما في override
 */
export function getManualOverride() {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    if (value && THEME_DAYS.includes(value)) {
      return value
    }
    return null
  } catch {
    return null
  }
}

/**
 * يرجع الثيم النشط الحالي
 * - لو في override يدوي → يرجع الـ override
 * - وإلا → يرجع ثيم اليوم
 */
export function getCurrentTheme() {
  return getManualOverride() || getTodayTheme()
}

/**
 * يرجع true إذا الثيم الحالي override يدوي (مو ثيم اليوم)
 */
export function isManualOverride() {
  return getManualOverride() !== null
}

// ──────────────────────────────────────────────────────────────────
//  Apply Theme
// ──────────────────────────────────────────────────────────────────

/**
 * يطبق الثيم على عنصر <html> ويبث event
 *
 * @param {string} theme - اسم الثيم (sunday, monday, ...)
 * @param {object} options
 * @param {boolean} options.flash - يطبق flash effect عند التغيير
 * @param {boolean} options.silent - ما يبث event
 */
export function applyTheme(theme, { flash = true, silent = false } = {}) {
  if (!THEME_DAYS.includes(theme)) {
    console.warn(`[themeSystem] Invalid theme: ${theme}`)
    return
  }

  const html = document.documentElement
  const previousTheme = html.getAttribute('data-theme')

  // ── ما نسوي شي إذا الثيم نفسه ──
  if (previousTheme === theme) return

  // ── طبق transition class عشان كل العناصر تتحول بسلاسة ──
  html.classList.add('lyn-theme-transitioning')

  // ── طبق الثيم الجديد ──
  html.setAttribute('data-theme', theme)

  // ── Flash effect ──
  if (flash) {
    triggerFlashEffect()
  }

  // ── شيل transition class بعد ما الـ animation يخلص ──
  setTimeout(() => {
    html.classList.remove('lyn-theme-transitioning')
  }, 900)

  // ── ابعث event ──
  if (!silent) {
    window.dispatchEvent(
      new CustomEvent(THEME_CHANGE_EVENT, {
        detail: {
          theme,
          previousTheme,
          isManual: isManualOverride(),
        },
      }),
    )
  }
}

/**
 * يخلق flash overlay مؤقت عند تبديل الثيم
 */
function triggerFlashEffect() {
  // ── شيل overlay موجود (لو في) ──
  const existing = document.querySelector('.lyn-theme-flash-overlay')
  if (existing) existing.remove()

  // ── أنشئ overlay جديد ──
  const overlay = document.createElement('div')
  overlay.className = 'lyn-theme-flash-overlay'
  document.body.appendChild(overlay)

  // ── فعّل الـ animation ──
  requestAnimationFrame(() => {
    overlay.classList.add('active')
  })

  // ── شيل الـ overlay بعد ما يخلص ──
  setTimeout(() => overlay.remove(), 1100)
}

// ──────────────────────────────────────────────────────────────────
//  Manual Override (Developer Only)
// ──────────────────────────────────────────────────────────────────

/**
 * يحفظ override يدوي في localStorage ويطبق الثيم
 * @param {string} theme
 */
export function setManualTheme(theme) {
  if (!THEME_DAYS.includes(theme)) {
    console.warn(`[themeSystem] Invalid theme: ${theme}`)
    return
  }

  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {}

  applyTheme(theme, { flash: true })
}

/**
 * يحذف الـ override ويرجع لثيم اليوم
 */
export function clearManualTheme() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {}

  applyTheme(getTodayTheme(), { flash: true })
}

// ──────────────────────────────────────────────────────────────────
//  Initialize (called once on app load)
// ──────────────────────────────────────────────────────────────────

/**
 * يهيئ النظام عند تحميل التطبيق
 * - يطبق ثيم اليوم (أو الـ override اليدوي)
 * - يفعّل auto-rotate لو المستخدم خلاّ التبويب مفتوح يوم كامل
 */
export function initThemeSystem() {
  // ── طبق الثيم الحالي بدون flash (أول مرة) ──
  applyTheme(getCurrentTheme(), { flash: false, silent: true })

  // ── سجّل interval يفحص كل ساعة لو اليوم تغيّر ──
  // (يفيد لو المستخدم خلاّ الصفحة مفتوحة عبر منتصف الليل)
  setInterval(() => {
    // لو في override يدوي، ما نغير شي
    if (isManualOverride()) return

    const todayTheme = getTodayTheme()
    const currentTheme = document.documentElement.getAttribute('data-theme')

    if (todayTheme !== currentTheme) {
      applyTheme(todayTheme, { flash: true })
    }
  }, 60 * 60 * 1000) // كل ساعة
}

// ──────────────────────────────────────────────────────────────────
//  Listener API (للـ DevSwitcher)
// ──────────────────────────────────────────────────────────────────

/**
 * يسجل listener يستدعى عند تغيير الثيم
 * @param {(detail: { theme, previousTheme, isManual }) => void} callback
 * @returns {() => void} unsubscribe function
 */
export function onThemeChange(callback) {
  const handler = (event) => callback(event.detail)
  window.addEventListener(THEME_CHANGE_EVENT, handler)
  return () => window.removeEventListener(THEME_CHANGE_EVENT, handler)
}
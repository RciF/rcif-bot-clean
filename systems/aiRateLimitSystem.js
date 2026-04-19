// systems/aiRateLimitSystem.js
// ═══════════════════════════════════════════════════════════════════
//  AI Rate Limit System — Multi-Layer Protection
//  حماية من spam وإساءة استخدام الذكاء الاصطناعي
//
//  ٣ طبقات حماية:
//  1. Per-Second: منع السرعة الجنونية (10 ثواني بين كل طلب)
//  2. Per-Minute: منع الانفجار السريع (8 طلبات/دقيقة)
//  3. Per-Hour:   منع الاستهلاك الطويل (40 طلب/ساعة)
// ═══════════════════════════════════════════════════════════════════

const cacheSystem = require("../utils/cacheSystem")
const logger = require("./loggerSystem")

// ═══════════════════════════════════════
//  الإعدادات الثابتة
// ═══════════════════════════════════════

const OWNER_ID = "529320108032786433"

const LIMITS = {
  PER_SECOND: {
    seconds: 10,       // 10 ثواني بين كل طلب
    label: "per_second"
  },
  PER_MINUTE: {
    max: 8,            // 8 طلبات بالدقيقة
    windowMs: 60 * 1000,
    label: "per_minute"
  },
  PER_HOUR: {
    max: 40,           // 40 طلب بالساعة
    windowMs: 60 * 60 * 1000,
    label: "per_hour"
  }
}

// مفاتيح الـ cache
const KEYS = {
  rate:   (userId) => `ai_rl_rate_${userId}`,
  minute: (userId) => `ai_rl_min_${userId}`,
  hour:   (userId) => `ai_rl_hour_${userId}`
}

// ═══════════════════════════════════════
//  دوال مساعدة
// ═══════════════════════════════════════

function isOwner(userId) {
  return userId === OWNER_ID
}

function formatArabicTime(seconds) {
  if (seconds < 1) return "أقل من ثانية"
  if (seconds < 60) return `${Math.ceil(seconds)} ثانية`

  const minutes = Math.ceil(seconds / 60)
  if (minutes < 60) return `${minutes} دقيقة`

  const hours = Math.ceil(minutes / 60)
  return `${hours} ساعة`
}

// ═══════════════════════════════════════
//  الطبقة 1: Per-Second Rate Limit
// ═══════════════════════════════════════

function checkPerSecond(userId) {
  const key = KEYS.rate(userId)
  const now = Date.now()

  if (cacheSystem.has(key)) {
    const lastRequest = cacheSystem.get(key)
    const elapsed = (now - lastRequest) / 1000

    if (elapsed < LIMITS.PER_SECOND.seconds) {
      const retryAfter = LIMITS.PER_SECOND.seconds - elapsed
      return {
        allowed: false,
        retryAfter,
        reason: LIMITS.PER_SECOND.label
      }
    }
  }

  return { allowed: true, retryAfter: 0 }
}

function recordPerSecond(userId) {
  const key = KEYS.rate(userId)
  cacheSystem.set(key, Date.now(), LIMITS.PER_SECOND.seconds * 1000 + 1000)
}

// ═══════════════════════════════════════
//  الطبقة 2: Per-Minute Rate Limit
// ═══════════════════════════════════════

function checkPerMinute(userId) {
  const key = KEYS.minute(userId)
  const now = Date.now()
  const data = cacheSystem.get(key)

  if (!data || typeof data !== "object") {
    return { allowed: true, retryAfter: 0 }
  }

  // لو انتهت النافذة الزمنية
  if (now - data.start > LIMITS.PER_MINUTE.windowMs) {
    return { allowed: true, retryAfter: 0 }
  }

  // لو تجاوز الحد
  if (data.count >= LIMITS.PER_MINUTE.max) {
    const retryAfter = (data.start + LIMITS.PER_MINUTE.windowMs - now) / 1000
    return {
      allowed: false,
      retryAfter: Math.max(0, retryAfter),
      reason: LIMITS.PER_MINUTE.label
    }
  }

  return { allowed: true, retryAfter: 0 }
}

function recordPerMinute(userId) {
  const key = KEYS.minute(userId)
  const now = Date.now()
  const data = cacheSystem.get(key)

  // نافذة جديدة
  if (!data || typeof data !== "object" || now - data.start > LIMITS.PER_MINUTE.windowMs) {
    cacheSystem.set(key, { count: 1, start: now }, LIMITS.PER_MINUTE.windowMs + 1000)
    return
  }

  // زيد العداد
  data.count++
  cacheSystem.set(key, data, LIMITS.PER_MINUTE.windowMs + 1000)
}

// ═══════════════════════════════════════
//  الطبقة 3: Per-Hour Rate Limit
// ═══════════════════════════════════════

function checkPerHour(userId) {
  const key = KEYS.hour(userId)
  const now = Date.now()
  const data = cacheSystem.get(key)

  if (!data || typeof data !== "object") {
    return { allowed: true, retryAfter: 0 }
  }

  // لو انتهت النافذة الزمنية
  if (now - data.start > LIMITS.PER_HOUR.windowMs) {
    return { allowed: true, retryAfter: 0 }
  }

  // لو تجاوز الحد
  if (data.count >= LIMITS.PER_HOUR.max) {
    const retryAfter = (data.start + LIMITS.PER_HOUR.windowMs - now) / 1000
    return {
      allowed: false,
      retryAfter: Math.max(0, retryAfter),
      reason: LIMITS.PER_HOUR.label
    }
  }

  return { allowed: true, retryAfter: 0 }
}

function recordPerHour(userId) {
  const key = KEYS.hour(userId)
  const now = Date.now()
  const data = cacheSystem.get(key)

  // نافذة جديدة
  if (!data || typeof data !== "object" || now - data.start > LIMITS.PER_HOUR.windowMs) {
    cacheSystem.set(key, { count: 1, start: now }, LIMITS.PER_HOUR.windowMs + 1000)
    return
  }

  // زيد العداد
  data.count++
  cacheSystem.set(key, data, LIMITS.PER_HOUR.windowMs + 1000)
}

// ═══════════════════════════════════════
//  الدالة الرئيسية الجديدة — checkUserRateLimit
// ═══════════════════════════════════════

/**
 * فحص شامل لجميع طبقات الـ Rate Limit
 * @param {string} userId - معرف المستخدم
 * @returns {{
 *   allowed: boolean,
 *   retryAfter: number,
 *   reason: string | null,
 *   message: string
 * }}
 */
function checkUserRateLimit(userId) {
  try {
    if (!userId) {
      return {
        allowed: false,
        retryAfter: 0,
        reason: "invalid_user",
        message: "❌ معرف المستخدم غير صالح"
      }
    }

    // المالك بدون حدود
    if (isOwner(userId)) {
      return {
        allowed: true,
        retryAfter: 0,
        reason: null,
        message: ""
      }
    }

    // الطبقة 1: per-second
    const perSecond = checkPerSecond(userId)
    if (!perSecond.allowed) {
      return {
        allowed: false,
        retryAfter: perSecond.retryAfter,
        reason: perSecond.reason,
        message: `⏳ انتظر ${formatArabicTime(perSecond.retryAfter)} قبل السؤال التالي`
      }
    }

    // الطبقة 2: per-minute
    const perMinute = checkPerMinute(userId)
    if (!perMinute.allowed) {
      return {
        allowed: false,
        retryAfter: perMinute.retryAfter,
        reason: perMinute.reason,
        message: `⚠️ تجاوزت الحد (${LIMITS.PER_MINUTE.max} طلبات/دقيقة). عُد بعد ${formatArabicTime(perMinute.retryAfter)}`
      }
    }

    // الطبقة 3: per-hour
    const perHour = checkPerHour(userId)
    if (!perHour.allowed) {
      return {
        allowed: false,
        retryAfter: perHour.retryAfter,
        reason: perHour.reason,
        message: `🚫 وصلت للحد الأقصى (${LIMITS.PER_HOUR.max} طلب/ساعة). عُد بعد ${formatArabicTime(perHour.retryAfter)}`
      }
    }

    // ✅ كل الطبقات passed → سجّل الاستخدام
    recordPerSecond(userId)
    recordPerMinute(userId)
    recordPerHour(userId)

    return {
      allowed: true,
      retryAfter: 0,
      reason: null,
      message: ""
    }

  } catch (error) {
    logger.error("AI_RATE_LIMIT_CHECK_FAILED", { error: error.message })
    // في حالة خطأ، اسمح بالاستخدام عشان ما نحرم المستخدم
    return {
      allowed: true,
      retryAfter: 0,
      reason: null,
      message: ""
    }
  }
}

// ═══════════════════════════════════════
//  إحصائيات المستخدم (للداشبورد مستقبلاً)
// ═══════════════════════════════════════

/**
 * جلب إحصائيات استخدام المستخدم
 */
function getUserStats(userId) {
  if (!userId) return null

  const minuteData = cacheSystem.get(KEYS.minute(userId)) || { count: 0, start: Date.now() }
  const hourData = cacheSystem.get(KEYS.hour(userId)) || { count: 0, start: Date.now() }

  return {
    perMinute: {
      used: minuteData.count || 0,
      max: LIMITS.PER_MINUTE.max,
      remaining: Math.max(0, LIMITS.PER_MINUTE.max - (minuteData.count || 0))
    },
    perHour: {
      used: hourData.count || 0,
      max: LIMITS.PER_HOUR.max,
      remaining: Math.max(0, LIMITS.PER_HOUR.max - (hourData.count || 0))
    }
  }
}

// ═══════════════════════════════════════
//  Backward Compatibility — الدوال القديمة
// ═══════════════════════════════════════

/**
 * ⚠️ DEPRECATED — استخدم checkUserRateLimit بدلاً منها
 * لكن نبقيها عشان ما نكسر aiAutoReplySystem
 */
function canUseAI(userId) {
  const result = checkUserRateLimit(userId)
  return result.allowed
}

/**
 * ⚠️ دالة قديمة — للـ backward compatibility فقط
 */
function isLimited(key, seconds) {
  const now = Date.now()

  if (cacheSystem.has(key)) {
    const last = cacheSystem.get(key)
    if (now - last < seconds * 1000) {
      return true
    }
  }

  cacheSystem.set(key, now, seconds * 1000 + 1000)
  return false
}

// ═══════════════════════════════════════
//  Exports
// ═══════════════════════════════════════

module.exports = {
  // الدالة الجديدة (الأساسية)
  checkUserRateLimit,
  getUserStats,

  // الثوابت (للاستخدام الخارجي لو احتجنا)
  LIMITS,

  // Backward compatibility
  canUseAI,
  isLimited
}
/**
 * ═══════════════════════════════════════════════════════════
 *  Time Parser
 *
 *  يحوّل نص الوقت إلى milliseconds:
 *
 *  Formats مدعومة:
 *  - "30"          → 30 minutes (default)
 *  - "30m" / "30M" → 30 minutes
 *  - "5h"          → 5 hours
 *  - "7d"          → 7 days
 *  - "1w"          → 1 week
 *  - "60s"         → 60 seconds
 *
 *  Arabic suffixes:
 *  - "30 دقيقة" / "30د"  → 30 minutes
 *  - "5 ساعة" / "5س"     → 5 hours
 *  - "7 يوم" / "7ي"      → 7 days
 *  - "1 اسبوع" / "1أ"    → 1 week
 *  - "60 ثانية" / "60ث"  → 60 seconds
 *
 *  Returns:
 *    { ms, unit, value, raw } لو نجح
 *    null لو فشل
 *
 *  Limits:
 *    minMs و maxMs قابلة للضبط لكل أمر
 * ═══════════════════════════════════════════════════════════
 */

// ════════════════════════════════════════════════════════════
//  Time units (ms)
// ════════════════════════════════════════════════════════════

const SECOND = 1000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const WEEK = 7 * DAY

// ════════════════════════════════════════════════════════════
//  Unit mapping (English + Arabic)
// ════════════════════════════════════════════════════════════

const UNIT_MAP = {
  // English
  s: SECOND, sec: SECOND, secs: SECOND, second: SECOND, seconds: SECOND,
  m: MINUTE, min: MINUTE, mins: MINUTE, minute: MINUTE, minutes: MINUTE,
  h: HOUR,   hr: HOUR,   hrs: HOUR,    hour: HOUR,     hours: HOUR,
  d: DAY,                                day: DAY,      days: DAY,
  w: WEEK,                               week: WEEK,    weeks: WEEK,

  // Arabic
  ث: SECOND, "ثانية": SECOND, "ثواني": SECOND,
  د: MINUTE, "دقيقة": MINUTE, "دقايق": MINUTE, "دقائق": MINUTE,
  س: HOUR,   "ساعة": HOUR,    "ساعات": HOUR,
  ي: DAY,    "يوم": DAY,      "ايام": DAY,     "أيام": DAY,
  أ: WEEK,   "اسبوع": WEEK,   "أسبوع": WEEK,   "أسابيع": WEEK,
}

// ════════════════════════════════════════════════════════════
//  parseTime
//
//  Inputs:
//    text: string ("30m", "5 ساعة", إلخ)
//    options: { defaultUnit: 'm', minMs, maxMs }
//
//  Returns: { ms, unit, value, raw } | null
// ════════════════════════════════════════════════════════════

function parseTime(text, options = {}) {
  if (text === null || text === undefined) return null

  // defaultUnit يمكن يكون null عشان نطلب unit صريحة
  const hasDefault = options.defaultUnit !== null && options.defaultUnit !== undefined
  const defaultUnit = hasDefault ? options.defaultUnit : null
  const minMs = options.minMs ?? 0
  const maxMs = options.maxMs ?? Infinity

  const raw = String(text).trim()
  if (!raw) return null

  // ─── Pattern 1: "30m" or "30" (no space) أو "30 m" أو "5 ساعة" ───
  let match = raw.match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z\u0600-\u06FF]*)$/)

  if (!match) return null

  const value = parseFloat(match[1])
  if (isNaN(value) || value < 0) return null

  let unitToken = (match[2] || "").toLowerCase().trim()

  // لو ما فيه unit في النص → استخدم default (أو فشل لو null)
  if (!unitToken) {
    if (!hasDefault) return null
    unitToken = String(defaultUnit).toLowerCase().trim()
  }

  // ─── Resolve unit ───
  const unitMs = UNIT_MAP[unitToken]
  if (!unitMs) return null

  const totalMs = Math.round(value * unitMs)

  // ─── Check limits ───
  if (totalMs < minMs) return null
  if (totalMs > maxMs) return null

  return {
    ms: totalMs,
    unit: unitToken,
    value,
    raw,
  }
}

// ════════════════════════════════════════════════════════════
//  formatDuration
//
//  يعكس parseTime — يحوّل ms إلى نص عربي
//  مثلاً: 90000 → "دقيقتين"
// ════════════════════════════════════════════════════════════

function formatDuration(ms, locale = "ar") {
  if (!ms || ms < 0) return "0 ثانية"

  const units = locale === "ar"
    ? [
        { ms: WEEK,   single: "أسبوع", dual: "أسبوعين", plural: "أسابيع" },
        { ms: DAY,    single: "يوم",    dual: "يومين",   plural: "أيام" },
        { ms: HOUR,   single: "ساعة",   dual: "ساعتين",  plural: "ساعات" },
        { ms: MINUTE, single: "دقيقة",  dual: "دقيقتين", plural: "دقائق" },
        { ms: SECOND, single: "ثانية",  dual: "ثانيتين", plural: "ثواني" },
      ]
    : [
        { ms: WEEK,   single: "week",   plural: "weeks" },
        { ms: DAY,    single: "day",    plural: "days" },
        { ms: HOUR,   single: "hour",   plural: "hours" },
        { ms: MINUTE, single: "minute", plural: "minutes" },
        { ms: SECOND, single: "second", plural: "seconds" },
      ]

  for (const u of units) {
    if (ms >= u.ms) {
      const count = Math.floor(ms / u.ms)
      if (locale === "ar") {
        if (count === 1) return u.single
        if (count === 2) return u.dual
        if (count >= 3 && count <= 10) return `${count} ${u.plural}`
        return `${count} ${u.single}`
      }
      return `${count} ${count === 1 ? u.single : u.plural}`
    }
  }

  return locale === "ar" ? "أقل من ثانية" : "less than a second"
}

// ════════════════════════════════════════════════════════════
//  Constants exports (للاستخدام في الإعدادات)
// ════════════════════════════════════════════════════════════

module.exports = {
  parseTime,
  formatDuration,
  SECOND, MINUTE, HOUR, DAY, WEEK,
}
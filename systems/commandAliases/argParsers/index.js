/**
 * ═══════════════════════════════════════════════════════════
 *  Argument Parsers — Entry Point
 *
 *  الاستخدام:
 *    const argParsers = require("./argParsers")
 *    const result = argParsers.parseModerationArgs(text)
 *
 *  يصدّر:
 *  - mentionParser (لكل الـ mention helpers)
 *  - timeParser (لكل time helpers)
 *  - stringParser (لكل string helpers)
 *  - parseModerationArgs (combiner شامل للأوامر الإشرافية)
 * ═══════════════════════════════════════════════════════════
 */

const mentionParser = require("./mentionParser")
const timeParser = require("./timeParser")
const stringParser = require("./stringParser")

// ════════════════════════════════════════════════════════════
//  parseModerationArgs
//
//  يحلل نص أوامر إشراف شائعة:
//  - "@user"                              → { userId }
//  - "@user 30m"                          → { userId, duration: { ms } }
//  - "@user 30m مزعج"                     → { userId, duration, reason }
//  - "@user مزعج جداً"                    → { userId, reason }
//  - "@user 7d سبب: مخالفة شروط"          → { userId, duration, reason }
//
//  Options:
//    requireUser: true → بدون mention يفشل
//    requireDuration: false → الوقت اختياري
//    defaultUnit: 'm' → الوحدة الافتراضية للأرقام
//    maxDuration: ms → الحد الأقصى للمدة
//
//  Returns:
//    { ok: true, userId, duration: {...} | null, reason: string | null }
//    { ok: false, error: "..." }
// ════════════════════════════════════════════════════════════

function parseModerationArgs(text, options = {}) {
  const {
    requireUser = true,
    requireDuration = false,
    defaultUnit = "m",
    maxDuration = Infinity,
    minDuration = 0,
  } = options

  if (!text || typeof text !== "string") {
    if (requireUser) {
      return { ok: false, error: "ما حددت العضو" }
    }
    return { ok: true, userId: null, duration: null, reason: null }
  }

  // ─── 1) استخراج الـ user mention ───
  const userResult = mentionParser.extractFirstUserMention(text)

  if (!userResult && requireUser) {
    return { ok: false, error: "ما حددت العضو — منشن العضو أو ضع ID" }
  }

  const userId = userResult?.id || null
  let remainder = userResult?.remainder || text

  // ─── 2) محاولة استخراج الوقت من باقي النص ───
  // الوقت ممكن يكون:
  //   (أ) توكن واحد: "30m", "5h", "1د", "7d"
  //   (ب) توكنين: "30 m", "5 ساعة", "7 days"
  //
  // الحل: نفحص أول توكن يبدأ برقم، ثم نحاول دمجه مع التوكن اللي بعده
  const tokens = stringParser.splitTokens(remainder)
  let duration = null
  let timeStartIdx = -1
  let timeTokenCount = 0

  for (let i = 0; i < tokens.length; i++) {
    if (!/^\d/.test(tokens[i])) continue

    // محاولة 1: التوكن لحاله (مثل "30m" أو "5س")
    let parsed = timeParser.parseTime(tokens[i], {
      defaultUnit: null, // ⚠️ بدون default — نحتاج unit صريح
      maxMs: maxDuration,
      minMs: minDuration,
    })

    if (parsed) {
      duration = parsed
      timeStartIdx = i
      timeTokenCount = 1
      break
    }

    // محاولة 2: التوكن + التوكن اللي بعده (مثل "5" + "ساعة")
    if (i + 1 < tokens.length) {
      const combined = `${tokens[i]} ${tokens[i + 1]}`
      parsed = timeParser.parseTime(combined, {
        defaultUnit: null,
        maxMs: maxDuration,
        minMs: minDuration,
      })

      if (parsed) {
        duration = parsed
        timeStartIdx = i
        timeTokenCount = 2
        break
      }
    }

    // محاولة 3: التوكن لحاله بدون unit (نأخذه كـ default)
    parsed = timeParser.parseTime(tokens[i], {
      defaultUnit,
      maxMs: maxDuration,
      minMs: minDuration,
    })

    if (parsed) {
      duration = parsed
      timeStartIdx = i
      timeTokenCount = 1
      break
    }
  }

  if (!duration && requireDuration) {
    return { ok: false, error: "ما حددت المدة" }
  }

  // ─── 3) السبب = كل التوكنز الباقية ───
  let reasonTokens = tokens
  if (timeStartIdx >= 0) {
    reasonTokens = [
      ...tokens.slice(0, timeStartIdx),
      ...tokens.slice(timeStartIdx + timeTokenCount),
    ]
  }

  // ⚠️ نشيل أي mention متبقي (لو في mentions ثانية مثل rolesأو القناة)
  reasonTokens = reasonTokens.filter((t) => {
    return !mentionParser.parseUserMention(t)
  })

  const reasonText = reasonTokens.join(" ").trim()
  const reasonResult = stringParser.parseReason(reasonText)
  const reason = reasonResult.reason
    ? stringParser.truncateString(reasonResult.reason, 500)
    : null

  return {
    ok: true,
    userId,
    duration,
    reason,
  }
}

module.exports = {
  // Sub-modules
  mentionParser,
  timeParser,
  stringParser,

  // Combiner
  parseModerationArgs,
}
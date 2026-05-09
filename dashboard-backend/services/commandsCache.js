/**
 * ═══════════════════════════════════════════════════════════
 *  Commands Cache Service
 *
 *  مسؤول عن:
 *  - إخبار البوت بأن إعدادات أوامر سيرفر معين تغيّرت
 *  - البوت يستلم الإشارة ويلغي الكاش الخاص بهذا السيرفر
 *
 *  بدون هذه الخدمة، لازم ننتظر TTL الـ cache ينتهي (5 دقائق)
 *  قبل أن تظهر التغييرات في الديسكورد.
 * ═══════════════════════════════════════════════════════════
 */

const env = require("../config/env")

// ════════════════════════════════════════════════════════════
//  invalidateGuildCommands
//  يخبر البوت إن إعدادات الأوامر تغيّرت لسيرفر معيّن
//
//  ⚠️ غير محظور (non-blocking) — لا نوقف الـ request لو فشل
// ════════════════════════════════════════════════════════════

async function invalidateGuildCommands(guildId) {
  const botUrl = env.BOT_URL || process.env.BOT_URL
  const botSecret = env.BOT_SECRET || process.env.BOT_SECRET

  if (!botUrl || !botSecret) {
    // البوت ما عنده URL مفتوح — نتركها للـ TTL يتولى المسح
    return { invalidated: false, reason: "BOT_URL_NOT_SET" }
  }

  try {
    const response = await fetch(`${botUrl}/api/internal/invalidate-commands`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-bot-secret": botSecret,
      },
      body: JSON.stringify({ guildId }),
      signal: AbortSignal.timeout(3000),
    })

    if (!response.ok) {
      console.warn(
        `[CACHE_INVALIDATE] Bot returned ${response.status} for guild ${guildId}`,
      )
      return { invalidated: false, reason: `STATUS_${response.status}` }
    }

    return { invalidated: true }
  } catch (err) {
    // فشل الاتصال — البوت ربما down، نعتمد على الـ TTL
    console.warn(
      `[CACHE_INVALIDATE] Failed for guild ${guildId}: ${err.message}`,
    )
    return { invalidated: false, reason: err.message }
  }
}

module.exports = {
  invalidateGuildCommands,
}
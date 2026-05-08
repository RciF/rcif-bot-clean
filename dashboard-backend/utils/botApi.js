/**
 * ═══════════════════════════════════════════════════════════
 *  Bot API Client — dashboard-backend → bot (rcif-discord-bot)
 *  المسار: dashboard-backend/utils/botApi.js
 *
 *  يغلّف كل الاستدعاءات المتجهة من الداش-باك إلى البوت
 *  (deploy panel, sync subscription role, … إلخ).
 *
 *  - يقرأ BOT_URL و BOT_SECRET من متغيرات البيئة
 *  - يرسل header x-bot-secret في كل طلب
 *  - يفشل بهدوء (returns { ok:false, error }) بدل ما يكسر الـ API
 * ═══════════════════════════════════════════════════════════
 */

const env = require("../config/env")

// ════════════════════════════════════════════════════════════
//  Internal helper — POST /<path> on bot
// ════════════════════════════════════════════════════════════

async function postToBot(path, body = {}, timeoutMs = 8000) {
  const botUrl    = env.BOT_URL    || process.env.BOT_URL    || ""
  const botSecret = env.BOT_SECRET || process.env.BOT_SECRET || ""

  if (!botUrl || !botSecret) {
    console.warn("[BOT_API] BOT_URL or BOT_SECRET not set — skipping", { path })
    return { ok: false, error: "bot_not_configured" }
  }

  try {
    const url = `${botUrl.replace(/\/+$/, "")}${path}`

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-bot-secret": botSecret,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    })

    let data = null
    try {
      data = await response.json()
    } catch {
      data = null
    }

    if (!response.ok) {
      console.error(`[BOT_API] ${path} -> ${response.status}`, data)
      return {
        ok: false,
        status: response.status,
        error: (data && data.error) || `bot_status_${response.status}`,
      }
    }

    return { ok: true, ...(data || {}) }
  } catch (err) {
    console.error(`[BOT_API] ${path} failed:`, err.message)
    return { ok: false, error: err.message || "bot_request_failed" }
  }
}

// ════════════════════════════════════════════════════════════
//  Public API
// ════════════════════════════════════════════════════════════

/**
 * نشر لوحة التذاكر في القناة المحددة في إعدادات السيرفر
 * يستدعي على البوت: POST /api/deploy-ticket-panel
 *
 * @param {string} guildId
 * @returns {Promise<{ ok: boolean, error?: string, status?: number }>}
 */
async function deployTicketPanel(guildId) {
  if (!guildId) return { ok: false, error: "guildId_required" }
  return postToBot("/api/deploy-ticket-panel", { guildId })
}

/**
 * مزامنة رتبة الاشتراك لمستخدم
 * يستدعي على البوت: POST /api/sync-subscription-role
 *
 * @param {string} userId
 * @param {string} planId  - "diamond" | "gold" | "silver" | "free"
 * @param {string} status  - "active" | "expired" | "cancelled" | ...
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
async function syncSubscriptionRole(userId, planId, status) {
  if (!userId) return { ok: false, error: "userId_required" }
  return postToBot("/api/sync-subscription-role", { userId, planId, status })
}

// ════════════════════════════════════════════════════════════
//  Exports
// ════════════════════════════════════════════════════════════

module.exports = {
  deployTicketPanel,
  syncSubscriptionRole,
  // raw helper - للاستخدام داخل الباك-إند لو احتجنا endpoint جديد
  postToBot,
}
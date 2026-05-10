/**
 * ═══════════════════════════════════════════════════════════
 *  Command Aliases — Config Fetcher
 *
 *  مسؤول عن:
 *  - جلب إعدادات أوامر السيرفر من الداشبورد
 *  - تخزين النتيجة في كاش لمدة محددة
 *  - دعم negative caching لو الداشبورد تعطّل
 *
 *  endpoint المستخدم:
 *    GET /api/bot/guild/:guildId/commands-config
 * ═══════════════════════════════════════════════════════════
 */

const logger = require("../loggerSystem")

// ════════════════════════════════════════════════════════════
//  Cache configuration
// ════════════════════════════════════════════════════════════

// كاش 1 دقيقة فقط (أصرع من السابق 5 دقائق)
// مع cache invalidation فوري عند التغيير، هذا أكثر من كافي
const CACHE_TTL = 60 * 1000

// لو فشل الطلب، نخزن "null" لمدة 30 ثانية
// عشان ما نضرب الـ API كل رسالة لو الداشبورد عطلان
const NEGATIVE_CACHE_TTL = 30 * 1000

const cache = new Map()

// ════════════════════════════════════════════════════════════
//  fetchConfig
//  يجيب إعدادات أوامر السيرفر من الداشبورد
//
//  Returns:
//    {
//      aliases: { "alias1": "command_name", ... },
//      legacy:  { "command_name": { custom_name, enabled }, ... },
//      restrictions: { ... },
//      defaults: { ... }
//    }
//  أو null لو فشل أو السيرفر ما عنده إعدادات
// ════════════════════════════════════════════════════════════

async function fetchConfig(guildId) {
  if (!guildId) return null

  // ─── 1) فحص الكاش ───
  const cached = cache.get(guildId)
  if (cached) {
    const age = Date.now() - cached.fetchedAt
    const ttl = cached.failed ? NEGATIVE_CACHE_TTL : CACHE_TTL
    if (age < ttl) {
      return cached.data
    }
  }

  // ─── 2) جلب من الداشبورد ───
  const dashUrl = process.env.DASHBOARD_URL || "http://localhost:4000"
  const botSecret = process.env.BOT_SECRET || ""

  if (!botSecret) {
    // لا يوجد سر = البوت ما يقدر يصدّق نفسه
    cache.set(guildId, { data: null, fetchedAt: Date.now(), failed: true })
    return null
  }

  try {
    const url = `${dashUrl}/api/bot/guild/${guildId}/commands-config`
    const res = await fetch(url, {
      headers: { "x-bot-secret": botSecret },
      signal: AbortSignal.timeout(3000),
    })

    if (!res.ok) {
      cache.set(guildId, { data: null, fetchedAt: Date.now(), failed: true })
      return null
    }

    const data = await res.json()
    cache.set(guildId, { data, fetchedAt: Date.now(), failed: false })
    return data
  } catch (err) {
    // فشل الاتصال — negative cache
    cache.set(guildId, { data: null, fetchedAt: Date.now(), failed: true })
    return null
  }
}

// ════════════════════════════════════════════════════════════
//  invalidate
//  يمسح كاش سيرفر معيّن (لما الداشبورد يرسل invalidate)
// ════════════════════════════════════════════════════════════

function invalidate(guildId) {
  if (guildId) {
    cache.delete(guildId)
    logger.info("ALIAS_CACHE_INVALIDATED", { guildId })
  } else {
    cache.clear()
    logger.info("ALIAS_CACHE_CLEARED_ALL")
  }
}

// ════════════════════════════════════════════════════════════
//  getCacheSize (للمراقبة)
// ════════════════════════════════════════════════════════════

function getCacheSize() {
  return cache.size
}

module.exports = {
  fetchConfig,
  invalidate,
  getCacheSize,
}
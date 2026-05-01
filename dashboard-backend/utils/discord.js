/**
 * ═══════════════════════════════════════════════════════════
 *  Discord API Helpers
 *
 *  يوفّر دوال جلب بيانات Discord مع:
 *   - في-memory caching (تقليل rate limit)
 *   - retry تلقائي عند فشل مؤقت
 *   - error handling موحد
 * ═══════════════════════════════════════════════════════════
 */

const env = require("../config/env")

const DISCORD_API = "https://discord.com/api/v10"

// ── In-Memory Cache ──
// key: cache key، value: { data, expiresAt }
const cache = new Map()

/**
 * Cache helper
 */
function getCached(key) {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    cache.delete(key)
    return null
  }
  return entry.data
}

function setCached(key, data, ttl) {
  cache.set(key, { data, expiresAt: Date.now() + ttl })
}

// تنظيف cache دوري
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of cache.entries()) {
    if (now > entry.expiresAt) cache.delete(key)
  }
}, 5 * 60 * 1000) // كل 5 دقائق

// ════════════════════════════════════════════════════════════
//  Core: Discord API Request
// ════════════════════════════════════════════════════════════

/**
 * طلب لـ Discord API مع retry + error handling
 *
 * @param {string} path - مسار الـ API (مثل '/users/@me')
 * @param {Object} options - { method, headers, body, retries }
 */
async function discordRequest(path, options = {}) {
  const { method = "GET", headers = {}, body, retries = 2 } = options

  const url = path.startsWith("http") ? path : `${DISCORD_API}${path}`

  const finalHeaders = {
    "Content-Type": "application/json",
    ...headers,
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const fetch = (await import("node-fetch")).default
      const res = await fetch(url, {
        method,
        headers: finalHeaders,
        body: body ? (typeof body === "string" ? body : JSON.stringify(body)) : undefined,
      })

      // Rate limited
      if (res.status === 429) {
        const retryAfter = parseFloat(res.headers.get("retry-after") || "1")
        if (attempt < retries) {
          console.warn(`[DISCORD] Rate limited, retrying in ${retryAfter}s`)
          await sleep(retryAfter * 1000)
          continue
        }
      }

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        const error = new Error(data?.message || `Discord API ${res.status}`)
        error.status = res.status
        error.code = data?.code
        error.payload = data
        throw error
      }

      return data
    } catch (err) {
      // Network errors — retry
      if (attempt < retries && (err.code === "ECONNRESET" || err.code === "ETIMEDOUT")) {
        await sleep(500 * (attempt + 1))
        continue
      }
      throw err
    }
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// ════════════════════════════════════════════════════════════
//  OAuth: Token Exchange
// ════════════════════════════════════════════════════════════

/**
 * تبادل code من OAuth بـ access_token
 */
async function exchangeCodeForToken(code, redirectUri) {
  const params = new URLSearchParams({
    client_id: env.CLIENT_ID,
    client_secret: env.CLIENT_SECRET,
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  })

  const fetch = (await import("node-fetch")).default
  const res = await fetch(`${DISCORD_API}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  })

  const data = await res.json()
  if (!res.ok || !data.access_token) {
    const err = new Error("Token exchange failed")
    err.payload = data
    err.status = res.status
    throw err
  }

  return data
}

// ════════════════════════════════════════════════════════════
//  User APIs
// ════════════════════════════════════════════════════════════

/**
 * جلب معلومات المستخدم الحالي (يستخدم user access token)
 */
async function fetchUserMe(accessToken) {
  return discordRequest("/users/@me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
}

/**
 * جلب سيرفرات المستخدم (يستخدم user access token)
 */
async function fetchUserGuilds(accessToken) {
  return discordRequest("/users/@me/guilds", {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
}

/**
 * استخراج avatar URL
 */
function getUserAvatarUrl(user) {
  if (!user.avatar) {
    const defaultIndex = (BigInt(user.id) >> 22n) % 6n
    return `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`
  }
  const ext = user.avatar.startsWith("a_") ? "gif" : "png"
  return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}?size=256`
}

/**
 * استخراج guild icon URL
 */
function getGuildIconUrl(guild) {
  if (!guild.icon) return null
  const ext = guild.icon.startsWith("a_") ? "gif" : "png"
  return `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.${ext}?size=256`
}

// ════════════════════════════════════════════════════════════
//  Guild APIs (تستخدم BOT_TOKEN)
// ════════════════════════════════════════════════════════════

/**
 * جلب معلومات السيرفر (مع caching)
 */
async function fetchGuild(guildId) {
  const cacheKey = `guild:${guildId}`
  const cached = getCached(cacheKey)
  if (cached) return cached

  const data = await discordRequest(`/guilds/${guildId}?with_counts=true`, {
    headers: { Authorization: `Bot ${env.BOT_TOKEN}` },
  })

  setCached(cacheKey, data, env.CACHE_DISCORD_GUILD)
  return data
}

/**
 * جلب قنوات السيرفر (مع caching)
 */
async function fetchGuildChannels(guildId) {
  const cacheKey = `channels:${guildId}`
  const cached = getCached(cacheKey)
  if (cached) return cached

  const data = await discordRequest(`/guilds/${guildId}/channels`, {
    headers: { Authorization: `Bot ${env.BOT_TOKEN}` },
  })

  setCached(cacheKey, data, env.CACHE_DISCORD_GUILD)
  return data
}

/**
 * جلب رتب السيرفر (مع caching)
 */
async function fetchGuildRoles(guildId) {
  const cacheKey = `roles:${guildId}`
  const cached = getCached(cacheKey)
  if (cached) return cached

  const data = await discordRequest(`/guilds/${guildId}/roles`, {
    headers: { Authorization: `Bot ${env.BOT_TOKEN}` },
  })

  setCached(cacheKey, data, env.CACHE_DISCORD_GUILD)
  return data
}

/**
 * جلب أعضاء السيرفر (paginated)
 */
async function fetchGuildMembers(guildId, options = {}) {
  const { limit = 100, after } = options
  const params = new URLSearchParams({ limit: String(limit) })
  if (after) params.set("after", after)

  return discordRequest(`/guilds/${guildId}/members?${params}`, {
    headers: { Authorization: `Bot ${env.BOT_TOKEN}` },
  })
}

/**
 * جلب emojis السيرفر
 */
async function fetchGuildEmojis(guildId) {
  const cacheKey = `emojis:${guildId}`
  const cached = getCached(cacheKey)
  if (cached) return cached

  const data = await discordRequest(`/guilds/${guildId}/emojis`, {
    headers: { Authorization: `Bot ${env.BOT_TOKEN}` },
  })

  setCached(cacheKey, data, env.CACHE_DISCORD_GUILD)
  return data
}

/**
 * إبطال cache لسيرفر معين (يُستخدم بعد تعديلات)
 */
function invalidateGuildCache(guildId) {
  const keys = [`guild:${guildId}`, `channels:${guildId}`, `roles:${guildId}`, `emojis:${guildId}`]
  keys.forEach((k) => cache.delete(k))
}

// ════════════════════════════════════════════════════════════
//  EXPORT
// ════════════════════════════════════════════════════════════

module.exports = {
  discordRequest,
  exchangeCodeForToken,
  fetchUserMe,
  fetchUserGuilds,
  getUserAvatarUrl,
  getGuildIconUrl,
  fetchGuild,
  fetchGuildChannels,
  fetchGuildRoles,
  fetchGuildMembers,
  fetchGuildEmojis,
  invalidateGuildCache,
}

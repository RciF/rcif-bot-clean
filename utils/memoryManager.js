const memoryRepository = require("../repositories/memoryRepository")
const databaseSystem = require("../systems/databaseSystem")
const logger = require("../systems/loggerSystem")
const scheduler = require("../systems/schedulerSystem")
const cacheSystem = require("./cacheSystem")
const conversationCache = cacheSystem.ns("conversations")

// ══════════════════════════════════════
//  CONFIG
// ══════════════════════════════════════
const MAX_MESSAGES = 20
const CACHE_TTL = 5 * 60 * 1000 // 5 دقائق
const MAX_CACHE_SIZE = 500
const CLEANUP_DAYS = 7

// ══════════════════════════════════════
//  CACHE HELPERS (موحّد عبر cacheSystem)
// ══════════════════════════════════════

function buildKey(userId, guildId, channelId) {
  return `${userId}:${guildId || "dm"}:${channelId || "dm"}`
}

function getCached(key) {
  return conversationCache.get(key)
}

function setCached(key, data) {
  conversationCache.set(key, data, CACHE_TTL)
}

function invalidateCache(key) {
  conversationCache.del(key)
}

// ══════════════════════════════════════
//  SHORT-TERM CONVERSATION MEMORY (DB)
// ══════════════════════════════════════

async function getMemory(userId, guildId = "dm", channelId = "dm") {
  if (!userId) return []

  const key = buildKey(userId, guildId, channelId)

  const cached = getCached(key)
  if (cached) return cached

  try {
    const result = await databaseSystem.query(
      `SELECT role, content
       FROM ai_conversations
       WHERE user_id = $1 AND guild_id = $2 AND channel_id = $3
       ORDER BY created_at DESC
       LIMIT $4`,
      [String(userId), String(guildId), String(channelId), MAX_MESSAGES]
    )

    const rows = result?.rows || []
    const messages = rows
      .reverse()
      .map(r => ({ role: r.role, content: r.content }))

    setCached(key, messages)
    return messages

  } catch (err) {
    logger.error("CONVERSATION_FETCH_FAILED", { error: err.message })
    return []
  }
}

async function addMessage(userId, role, content, guildId = "dm", channelId = "dm") {
  if (!userId || !role || !content) return

  try {
    await databaseSystem.query(
      `INSERT INTO ai_conversations (user_id, guild_id, channel_id, role, content, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        String(userId),
        String(guildId),
        String(channelId),
        String(role),
        String(content),
        Date.now()
      ]
    )

    const key = buildKey(userId, guildId, channelId)
    invalidateCache(key)

    // ✅ تلخيص ذكي بدل الحذف الأعمى
    const overflow = await databaseSystem.query(
      `SELECT id, role, content FROM ai_conversations
       WHERE user_id = $1 AND guild_id = $2 AND channel_id = $3
       ORDER BY created_at DESC
       OFFSET $4`,
      [String(userId), String(guildId), String(channelId), MAX_MESSAGES]
    )

    if (overflow.rows && overflow.rows.length >= 4) {
      // لخّص الرسائل القديمة وخزّنها كذكرى دائمة
      try {
        const memoryRepository = require("../repositories/memoryRepository")
        const summary = overflow.rows
          .reverse()
          .map(r => `${r.role === "user" ? "هو" : "أنا"}: ${r.content}`)
          .join(" | ")
          .slice(0, 800)

        await memoryRepository.createMemory({
          userId: String(userId),
          type: "conversation_summary",
          memory: summary
        })
      } catch {}

      // الحين احذف الرسائل اللي لخصناها
      await databaseSystem.query(
        `DELETE FROM ai_conversations
         WHERE id = ANY($1::int[])`,
        [overflow.rows.map(r => r.id)]
      )
    }

  } catch (err) {
    logger.error("CONVERSATION_ADD_FAILED", { error: err.message })
  }
}

async function clearMemory(userId, guildId = null, channelId = null) {
  if (!userId) return

  try {
    if (guildId && channelId) {
      await databaseSystem.query(
        `DELETE FROM ai_conversations
         WHERE user_id = $1 AND guild_id = $2 AND channel_id = $3`,
        [String(userId), String(guildId), String(channelId)]
      )
      invalidateCache(buildKey(userId, guildId, channelId))
    } else {
      await databaseSystem.query(
        `DELETE FROM ai_conversations WHERE user_id = $1`,
        [String(userId)]
      )
      // امسح كل كاش المستخدم
      for (const key of conversationCache.keys()) {
        if (key.startsWith(`${userId}:`)) {
          conversationCache.del(key)
        }
      }
    }
  } catch (err) {
    logger.error("CONVERSATION_CLEAR_FAILED", { error: err.message })
  }
}

// ══════════════════════════════════════
//  CLEANUP — حذف المحادثات الأقدم من 7 أيام
// ══════════════════════════════════════

async function cleanupOldConversations() {
  try {
    const cutoff = Date.now() - (CLEANUP_DAYS * 24 * 60 * 60 * 1000)
    const result = await databaseSystem.query(
      `DELETE FROM ai_conversations WHERE created_at < $1`,
      [cutoff]
    )
    if (result?.rowCount > 0) {
      logger.info(`CONVERSATION_CLEANUP_DONE: ${result.rowCount} rows`)
    }
  } catch (err) {
    logger.error("CONVERSATION_CLEANUP_FAILED", { error: err.message })
  }
}

// تنظيف تلقائي كل 6 ساعات — مسجّل في scheduler عشان graceful shutdown
scheduler.register(
  "memory-cleanup",
  6 * 60 * 60 * 1000,
  cleanupOldConversations,
  false
)

// ══════════════════════════════════════
//  LONG-TERM MEMORY (موجود — ما نلمسه)
// ══════════════════════════════════════

async function saveMemory(userId, text, type = "user") {
  return await memoryRepository.createMemory({
    userId,
    type,
    memory: text
  })
}

async function getMemories(userId, limit = 10) {
  return await memoryRepository.getUserMemories(userId, limit)
}

module.exports = {
  getMemory,
  addMessage,
  clearMemory,
  saveMemory,
  getMemories,
  cleanupOldConversations
}
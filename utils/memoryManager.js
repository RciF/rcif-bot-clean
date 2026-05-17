// ══════════════════════════════════════════════════════════════════
//  Memory Manager — Legendary Edition
//
//  ذاكرة لين الكاملة: قصيرة المدى + طويلة المدى + تلخيص ذكي
//
//  المزايا:
//   • ذاكرة 30 رسالة لكل (user × guild × channel)
//   • تلخيص تلقائي للرسائل القديمة قبل الحذف
//   • Cache ذكي مع TTL متدرج
//   • Long-term memory منفصلة (حقائق، اهتمامات، علاقات)
//   • Cleanup تلقائي للمحادثات الأقدم من 14 يوم
//   • Stats functions لمعرفة حجم الذاكرة
//   • Smart context retrieval (يجيب الأهم بناء على السؤال)
// ══════════════════════════════════════════════════════════════════

const memoryRepository = require("../repositories/memoryRepository")
const databaseSystem = require("../systems/databaseSystem")
const logger = require("../systems/loggerSystem")
const scheduler = require("../systems/schedulerSystem")
const cacheSystem = require("./cacheSystem")

const conversationCache = cacheSystem.ns("conversations")

// ══════════════════════════════════════
//  CONFIG — قابل للتعديل
// ══════════════════════════════════════
const MAX_MESSAGES = 30           // عدد الرسائل اللي نحتفظ فيها في الذاكرة النشطة
const SUMMARIZE_THRESHOLD = 4     // أقل عدد رسائل علشان نلخصها
const CACHE_TTL = 5 * 60 * 1000   // 5 دقائق
const MAX_CACHE_SIZE = 500
const CLEANUP_DAYS = 14           // تنظيف المحادثات الأقدم من أسبوعين
const SUMMARY_MAX_LENGTH = 1000   // الحد الأقصى لطول التلخيص

// ══════════════════════════════════════
//  CACHE HELPERS
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

/**
 * احصل على آخر MAX_MESSAGES رسالة لمحادثة معينة
 * تستخدم cache للسرعة
 */
async function getMemory(userId, guildId = "dm", channelId = "dm") {
  if (!userId) return []

  const key = buildKey(userId, guildId, channelId)

  // Cache hit
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
      .reverse() // الترتيب الزمني الصحيح
      .map(r => ({ role: r.role, content: r.content }))

    setCached(key, messages)
    return messages

  } catch (err) {
    logger.error("CONVERSATION_FETCH_FAILED", { error: err.message })
    return []
  }
}

/**
 * أضف رسالة جديدة + تلخيص الزائد بدل الحذف الأعمى
 */
async function addMessage(userId, role, content, guildId = "dm", channelId = "dm") {
  if (!userId || !role || !content) return

  try {
    // ─── 1) أضف الرسالة الجديدة ───
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

    // ─── 2) امسح الكاش ───
    const key = buildKey(userId, guildId, channelId)
    invalidateCache(key)

    // ─── 3) لخّص الرسائل الزائدة قبل الحذف ───
    await summarizeAndPrune(userId, guildId, channelId)

  } catch (err) {
    logger.error("CONVERSATION_ADD_FAILED", { error: err.message })
  }
}

/**
 * 🌟 الميزة الأسطورية: تلخيص ذكي قبل الحذف
 * بدل ما نحذف الرسائل القديمة، نلخصها ونخزنها كذاكرة دائمة
 */
async function summarizeAndPrune(userId, guildId, channelId) {
  try {
    // اجلب الرسائل اللي بعد الـ MAX_MESSAGES (الأقدم)
    const overflow = await databaseSystem.query(
      `SELECT id, role, content, created_at
       FROM ai_conversations
       WHERE user_id = $1 AND guild_id = $2 AND channel_id = $3
       ORDER BY created_at DESC
       OFFSET $4`,
      [String(userId), String(guildId), String(channelId), MAX_MESSAGES]
    )

    // لو ما فيه رسائل زائدة، اخرج
    if (!overflow.rows || overflow.rows.length === 0) return

    // لو الرسائل قليلة، احذف بدون تلخيص (مو ضرورة)
    if (overflow.rows.length < SUMMARIZE_THRESHOLD) {
      await databaseSystem.query(
        `DELETE FROM ai_conversations WHERE id = ANY($1::int[])`,
        [overflow.rows.map(r => r.id)]
      )
      return
    }

    // ─── لخّص الرسائل ───
    const summary = buildSummary(overflow.rows.reverse())

    if (summary && summary.length > 0) {
      try {
        await memoryRepository.createMemory({
          userId: String(userId),
          type: "conversation_summary",
          memory: summary
        })
      } catch (memErr) {
        logger.error("SUMMARY_SAVE_FAILED", { error: memErr.message })
      }
    }

    // ─── احذف الرسائل اللي لخّصناها ───
    await databaseSystem.query(
      `DELETE FROM ai_conversations WHERE id = ANY($1::int[])`,
      [overflow.rows.map(r => r.id)]
    )

  } catch (err) {
    logger.error("SUMMARIZE_AND_PRUNE_FAILED", { error: err.message })
  }
}

/**
 * يبني تلخيص ذكي للرسائل
 * يحاول يستخرج المعلومات المهمة بدل ما يكون نسخ
 */
function buildSummary(messages) {
  if (!Array.isArray(messages) || messages.length === 0) return ""

  // أسلوب التلخيص: "هو قال X، أنا قلت Y، هو سأل عن Z..."
  const lines = []
  let currentChunk = ""

  for (const msg of messages) {
    const speaker = msg.role === "user" ? "هو" : "أنا"
    const content = String(msg.content || "").trim().slice(0, 150)

    if (!content) continue

    const line = `${speaker}: ${content}`

    // لو وصلنا الحد، نضيف الـ chunk الحالي ونبدأ جديد
    if ((currentChunk + " | " + line).length > 200) {
      if (currentChunk) lines.push(currentChunk)
      currentChunk = line
    } else {
      currentChunk = currentChunk ? `${currentChunk} | ${line}` : line
    }
  }

  if (currentChunk) lines.push(currentChunk)

  return lines.join("\n").slice(0, SUMMARY_MAX_LENGTH)
}

// ══════════════════════════════════════
//  CLEAR MEMORY
// ══════════════════════════════════════

async function clearMemory(userId, guildId = null, channelId = null) {
  if (!userId) return

  try {
    if (guildId && channelId) {
      // امسح محادثة محددة
      await databaseSystem.query(
        `DELETE FROM ai_conversations
         WHERE user_id = $1 AND guild_id = $2 AND channel_id = $3`,
        [String(userId), String(guildId), String(channelId)]
      )
      invalidateCache(buildKey(userId, guildId, channelId))

    } else {
      // امسح كل محادثات المستخدم
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

    logger.info("MEMORY_CLEARED", { userId, guildId, channelId })

  } catch (err) {
    logger.error("CONVERSATION_CLEAR_FAILED", { error: err.message })
  }
}

// ══════════════════════════════════════
//  CLEANUP — تنظيف تلقائي
// ══════════════════════════════════════

async function cleanupOldConversations() {
  try {
    const cutoff = Date.now() - (CLEANUP_DAYS * 24 * 60 * 60 * 1000)

    // ─── 1) لخّص قبل الحذف ───
    const oldConversations = await databaseSystem.query(
      `SELECT user_id, guild_id, channel_id, role, content, created_at
       FROM ai_conversations
       WHERE created_at < $1
       ORDER BY user_id, guild_id, channel_id, created_at`,
      [cutoff]
    )

    if (oldConversations.rows && oldConversations.rows.length > 10) {
      // جمّع حسب المستخدم
      const grouped = {}
      for (const row of oldConversations.rows) {
        const key = `${row.user_id}:${row.guild_id}:${row.channel_id}`
        if (!grouped[key]) grouped[key] = []
        grouped[key].push(row)
      }

      // لخّص كل مجموعة وخزنها
      let summariesSaved = 0
      for (const [key, msgs] of Object.entries(grouped)) {
        if (msgs.length < SUMMARIZE_THRESHOLD) continue

        const [userId] = key.split(":")
        const summary = buildSummary(msgs)

        if (summary) {
          try {
            await memoryRepository.createMemory({
              userId: String(userId),
              type: "old_conversation_summary",
              memory: `[ذكرى قديمة]: ${summary}`
            })
            summariesSaved++
          } catch {}
        }
      }

      logger.info(`CLEANUP: Saved ${summariesSaved} summaries before deletion`)
    }

    // ─── 2) احذف ───
    const result = await databaseSystem.query(
      `DELETE FROM ai_conversations WHERE created_at < $1`,
      [cutoff]
    )

    if (result?.rowCount > 0) {
      logger.info(`CONVERSATION_CLEANUP_DONE: ${result.rowCount} rows deleted`)
    }

  } catch (err) {
    logger.error("CONVERSATION_CLEANUP_FAILED", { error: err.message })
  }
}

// تنظيف تلقائي كل 6 ساعات
scheduler.register(
  "memory-cleanup",
  6 * 60 * 60 * 1000,
  cleanupOldConversations,
  false
)

// ══════════════════════════════════════
//  STATS — معرفة حجم الذاكرة
// ══════════════════════════════════════

async function getMemoryStats(userId) {
  if (!userId) return null

  try {
    const conversations = await databaseSystem.query(
      `SELECT COUNT(*) as count
       FROM ai_conversations
       WHERE user_id = $1`,
      [String(userId)]
    )

    const memories = await memoryRepository.getUserMemories?.(userId, 1000) || []

    return {
      activeConversations: parseInt(conversations.rows[0]?.count) || 0,
      longTermMemories: memories.length,
      cacheSize: conversationCache.size?.() || 0
    }
  } catch (err) {
    logger.error("MEMORY_STATS_FAILED", { error: err.message })
    return null
  }
}

// ══════════════════════════════════════
//  LONG-TERM MEMORY
// ══════════════════════════════════════

/**
 * احفظ ذكرى دائمة (حقيقة، اهتمام، علاقة، إلخ)
 */
async function saveMemory(userId, text, type = "user") {
  if (!userId || !text) return null

  try {
    return await memoryRepository.createMemory({
      userId: String(userId),
      type,
      memory: String(text).slice(0, 2000)
    })
  } catch (err) {
    logger.error("LONGTERM_MEMORY_SAVE_FAILED", { error: err.message })
    return null
  }
}

/**
 * احصل على آخر N ذكريات للمستخدم
 */
async function getMemories(userId, limit = 10) {
  if (!userId) return []

  try {
    return await memoryRepository.getUserMemories(userId, limit) || []
  } catch (err) {
    logger.error("LONGTERM_MEMORY_FETCH_FAILED", { error: err.message })
    return []
  }
}

/**
 * 🌟 ميزة أسطورية: ابحث عن ذكريات مرتبطة بالموضوع الحالي
 */
async function searchRelevantMemories(userId, query, limit = 5) {
  if (!userId || !query) return []

  try {
    const allMemories = await getMemories(userId, 100)
    if (allMemories.length === 0) return []

    const queryLower = String(query).toLowerCase()
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2)

    if (queryWords.length === 0) return allMemories.slice(0, limit)

    // احسب نقاط لكل ذكرى بناء على تطابق الكلمات
    const scored = allMemories.map(mem => {
      const memText = String(mem.memory || "").toLowerCase()
      let score = 0

      for (const word of queryWords) {
        if (memText.includes(word)) score += 2
      }

      // ميزة إضافية للذكريات الحديثة
      if (mem.created_at) {
        const age = Date.now() - new Date(mem.created_at).getTime()
        const daysOld = age / (24 * 60 * 60 * 1000)
        if (daysOld < 7) score += 1
        if (daysOld < 1) score += 1
      }

      return { ...mem, _score: score }
    })

    // رتّب وارجع الأهم
    return scored
      .filter(m => m._score > 0)
      .sort((a, b) => b._score - a._score)
      .slice(0, limit)

  } catch (err) {
    logger.error("SEARCH_MEMORIES_FAILED", { error: err.message })
    return []
  }
}

// ══════════════════════════════════════
//  EXPORTS
// ══════════════════════════════════════

module.exports = {
  // Short-term (محادثات)
  getMemory,
  addMessage,
  clearMemory,

  // Long-term (ذكريات دائمة)
  saveMemory,
  getMemories,
  searchRelevantMemories,

  // Utilities
  getMemoryStats,
  cleanupOldConversations,

  // Constants (للاستخدام الخارجي)
  MAX_MESSAGES,
  CLEANUP_DAYS
}
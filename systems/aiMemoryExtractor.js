// ══════════════════════════════════════════════════════════════════
//  AI Memory Extractor — Legendary Smart Extraction
//
//  يستخرج المعلومات المهمة من المحادثات ويحفظها للأبد
//
//  المزايا:
//   • استخراج تلقائي بـ regex patterns ذكية
//   • تصنيف الذكريات (اسم، اهتمام، علاقة، حقيقة، إلخ)
//   • منع التكرار (لا يحفظ نفس المعلومة مرتين)
//   • حد ذكي لكل user (max 1000 ذكرى)
//   • ضغط الذكريات الشبيهة
//   • أولوية للمعلومات الجديدة على القديمة
// ══════════════════════════════════════════════════════════════════

const databaseSystem = require("./databaseSystem")
const memoryRepository = require("../repositories/memoryRepository")
const logger = require("./loggerSystem")

// ══════════════════════════════════════
//  CONFIG
// ══════════════════════════════════════
const MAX_MEMORIES_PER_USER = 1000     // حد لكل مستخدم
const MIN_MEMORY_LENGTH = 5            // أقل طول للذكرى
const MAX_MEMORY_LENGTH = 300          // أقصى طول للذكرى
const DUPLICATE_THRESHOLD = 0.85       // نسبة التشابه للاعتبار "مكرر"

// ══════════════════════════════════════
//  PATTERNS — أنماط استخراج المعلومات
// ══════════════════════════════════════

const EXTRACTION_PATTERNS = [
  // ─── الاسم ───
  { type: "name", regex: /اسمي\s+(.+?)(?:\.|$|،)/i, priority: 10 },
  { type: "name", regex: /انا\s+اسمي\s+(.+?)(?:\.|$|،)/i, priority: 10 },
  { type: "name", regex: /my name is\s+(.+?)(?:\.|$|,)/i, priority: 10 },
  { type: "name", regex: /call me\s+(.+?)(?:\.|$|,)/i, priority: 9 },

  // ─── العمر ───
  { type: "age", regex: /عمري\s+(\d+)/i, priority: 9 },
  { type: "age", regex: /انا\s+عمري\s+(\d+)/i, priority: 9 },
  { type: "age", regex: /i am\s+(\d+)\s+years/i, priority: 9 },

  // ─── المكان ───
  { type: "location", regex: /اعيش في\s+(.+?)(?:\.|$|،)/i, priority: 8 },
  { type: "location", regex: /انا من\s+(.+?)(?:\.|$|،)/i, priority: 8 },
  { type: "location", regex: /ساكن في\s+(.+?)(?:\.|$|،)/i, priority: 8 },
  { type: "location", regex: /i live in\s+(.+?)(?:\.|$|,)/i, priority: 8 },

  // ─── المهنة / الدراسة ───
  { type: "occupation", regex: /اشتغل\s+(.+?)(?:\.|$|،)/i, priority: 8 },
  { type: "occupation", regex: /اعمل\s+(.+?)(?:\.|$|،)/i, priority: 8 },
  { type: "occupation", regex: /ادرس\s+(.+?)(?:\.|$|،)/i, priority: 8 },
  { type: "occupation", regex: /i work as\s+(.+?)(?:\.|$|,)/i, priority: 8 },
  { type: "occupation", regex: /i study\s+(.+?)(?:\.|$|,)/i, priority: 8 },

  // ─── الاهتمامات ───
  { type: "interest", regex: /احب\s+(.+?)(?:\.|$|،)/i, priority: 7 },
  { type: "interest", regex: /اهتم\s+بـ?(.+?)(?:\.|$|،)/i, priority: 7 },
  { type: "interest", regex: /شغوف\s+بـ?(.+?)(?:\.|$|،)/i, priority: 7 },
  { type: "interest", regex: /هوايتي\s+(.+?)(?:\.|$|،)/i, priority: 7 },
  { type: "interest", regex: /i like\s+(.+?)(?:\.|$|,)/i, priority: 7 },
  { type: "interest", regex: /i love\s+(.+?)(?:\.|$|,)/i, priority: 7 },
  { type: "interest", regex: /i'm into\s+(.+?)(?:\.|$|,)/i, priority: 7 },

  // ─── الأشياء اللي ما يحبها ───
  { type: "dislike", regex: /اكره\s+(.+?)(?:\.|$|،)/i, priority: 6 },
  { type: "dislike", regex: /ما احب\s+(.+?)(?:\.|$|،)/i, priority: 6 },
  { type: "dislike", regex: /i hate\s+(.+?)(?:\.|$|,)/i, priority: 6 },

  // ─── المهارات ───
  { type: "skill", regex: /اجيد\s+(.+?)(?:\.|$|،)/i, priority: 7 },
  { type: "skill", regex: /اعرف\s+(.+?)(?:\.|$|،)/i, priority: 6 },
  { type: "skill", regex: /متخصص في\s+(.+?)(?:\.|$|،)/i, priority: 7 },
  { type: "skill", regex: /i can\s+(.+?)(?:\.|$|,)/i, priority: 7 },
  { type: "skill", regex: /i'm good at\s+(.+?)(?:\.|$|,)/i, priority: 7 },

  // ─── الأهداف ───
  { type: "goal", regex: /هدفي\s+(.+?)(?:\.|$|،)/i, priority: 8 },
  { type: "goal", regex: /حلمي\s+(.+?)(?:\.|$|،)/i, priority: 8 },
  { type: "goal", regex: /اطمح\s+(.+?)(?:\.|$|،)/i, priority: 7 },
  { type: "goal", regex: /my goal is\s+(.+?)(?:\.|$|,)/i, priority: 8 },
  { type: "goal", regex: /i want to\s+(.+?)(?:\.|$|,)/i, priority: 6 },

  // ─── العلاقات ───
  { type: "relationship", regex: /صديقي\s+(.+?)(?:\.|$|،)/i, priority: 6 },
  { type: "relationship", regex: /اخوي\s+(.+?)(?:\.|$|،)/i, priority: 7 },
  { type: "relationship", regex: /اختي\s+(.+?)(?:\.|$|،)/i, priority: 7 },
  { type: "relationship", regex: /زوجتي\s+(.+?)(?:\.|$|،)/i, priority: 8 },
  { type: "relationship", regex: /زوجي\s+(.+?)(?:\.|$|،)/i, priority: 8 },

  // ─── الآراء والمعتقدات ───
  { type: "opinion", regex: /اعتقد\s+(.+?)(?:\.|$|،)/i, priority: 5 },
  { type: "opinion", regex: /اشوف\s+ان\s+(.+?)(?:\.|$|،)/i, priority: 5 },
  { type: "opinion", regex: /برأيي\s+(.+?)(?:\.|$|،)/i, priority: 5 },
  { type: "opinion", regex: /i think\s+(.+?)(?:\.|$|,)/i, priority: 5 },
  { type: "opinion", regex: /i believe\s+(.+?)(?:\.|$|,)/i, priority: 5 },

  // ─── الحقائق العامة ───
  { type: "fact", regex: /انا\s+(.+?)(?:\.|$|،)/i, priority: 4 },
  { type: "fact", regex: /i am\s+(.+?)(?:\.|$|,)/i, priority: 4 }
]

// ══════════════════════════════════════
//  Helper Functions
// ══════════════════════════════════════

/**
 * تنظيف النص قبل المعالجة
 */
function cleanText(text) {
  if (!text) return ""
  return String(text)
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 2000)
}

/**
 * تطبيع النص للمقارنة (إزالة التشكيل، التطابق غير الحساس)
 */
function normalize(text) {
  return String(text)
    .toLowerCase()
    .replace(/[\u064B-\u065F]/g, "") // إزالة التشكيل
    .replace(/[ًٌٍَُِّْ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .trim()
}

/**
 * حساب التشابه بين نصين (0-1)
 */
function similarity(a, b) {
  const wordsA = normalize(a).split(/\s+/).filter(w => w.length > 2)
  const wordsB = normalize(b).split(/\s+/).filter(w => w.length > 2)

  if (!wordsA.length || !wordsB.length) return 0

  const setA = new Set(wordsA)
  const setB = new Set(wordsB)

  let intersection = 0
  for (const w of setA) {
    if (setB.has(w)) intersection++
  }

  const union = setA.size + setB.size - intersection
  return union === 0 ? 0 : intersection / union
}

/**
 * فحص هل الذكرى موجودة مسبقاً (أو شبيهة جداً)
 */
async function isDuplicate(userId, newMemory) {
  try {
    const existing = await memoryRepository.getUserMemories(userId, 100)
    if (!existing || existing.length === 0) return false

    const newNormalized = normalize(newMemory)

    for (const mem of existing) {
      const existingNormalized = normalize(mem.memory || "")

      // تطابق كامل
      if (existingNormalized === newNormalized) return true

      // تشابه عالي
      const sim = similarity(newMemory, mem.memory)
      if (sim >= DUPLICATE_THRESHOLD) return true
    }

    return false
  } catch (err) {
    return false
  }
}

/**
 * فحص حد المستخدم
 */
async function checkUserLimit(userId) {
  try {
    const result = await databaseSystem.query(
      `SELECT COUNT(*)::int as count FROM ai_memories WHERE user_id = $1`,
      [String(userId)]
    )

    const count = result?.rows?.[0]?.count || 0
    return count < MAX_MEMORIES_PER_USER
  } catch (err) {
    return true // في حالة الخطأ، نسمح
  }
}

/**
 * استخراج المعلومات من رسالة واحدة
 */
function extractFromMessage(message) {
  const cleaned = cleanText(message)
  if (!cleaned || cleaned.length < MIN_MEMORY_LENGTH) return []

  const extracted = []

  for (const pattern of EXTRACTION_PATTERNS) {
    const match = cleaned.match(pattern.regex)
    if (!match) continue

    const value = match[1]?.trim()
    if (!value || value.length < MIN_MEMORY_LENGTH) continue
    if (value.length > MAX_MEMORY_LENGTH) continue

    // تنظيف القيمة من علامات الترقيم في النهاية
    const finalValue = value.replace(/[.,!?،]$/g, "").trim()

    extracted.push({
      type: pattern.type,
      memory: finalValue,
      priority: pattern.priority,
      fullSentence: cleaned.slice(0, MAX_MEMORY_LENGTH)
    })
  }

  return extracted
}

/**
 * تنسيق الذكرى للحفظ (تخصيص حسب النوع)
 */
function formatMemoryForStorage(extracted) {
  const { type, memory } = extracted

  const templates = {
    name: `اسمه: ${memory}`,
    age: `عمره: ${memory}`,
    location: `يعيش في: ${memory}`,
    occupation: `يعمل: ${memory}`,
    interest: `يحب: ${memory}`,
    dislike: `ما يحب: ${memory}`,
    skill: `يجيد: ${memory}`,
    goal: `هدفه: ${memory}`,
    relationship: `${memory}`,
    opinion: `يعتقد: ${memory}`,
    fact: `${memory}`
  }

  return templates[type] || memory
}

// ══════════════════════════════════════
//  Main Function — استخراج وحفظ من محادثة
// ══════════════════════════════════════

/**
 * 🌟 الدالة الرئيسية: استخرج المعلومات من رسالة واحفظها
 * تُستدعى من aiHandler بعد كل رسالة من المستخدم
 */
async function extractAndStore(userId, message) {
  if (!userId || !message) return { saved: 0, skipped: 0 }

  try {
    // ─── 1) استخرج كل المعلومات ───
    const extracted = extractFromMessage(message)
    if (extracted.length === 0) return { saved: 0, skipped: 0 }

    // ─── 2) فحص حد المستخدم ───
    const canSave = await checkUserLimit(userId)
    if (!canSave) {
      logger.warn("MEMORY_LIMIT_REACHED", { userId })
      return { saved: 0, skipped: extracted.length, reason: "limit_reached" }
    }

    // ─── 3) رتبهم حسب الأولوية ───
    extracted.sort((a, b) => b.priority - a.priority)

    // ─── 4) احفظ غير المكرر ───
    let saved = 0
    let skipped = 0

    for (const item of extracted) {
      const formatted = formatMemoryForStorage(item)

      // فحص التكرار
      const duplicate = await isDuplicate(userId, formatted)
      if (duplicate) {
        skipped++
        continue
      }

      // احفظ
      try {
        await memoryRepository.createMemory({
          userId: String(userId),
          type: item.type,
          memory: formatted
        })
        saved++
      } catch (err) {
        logger.error("MEMORY_SAVE_FAILED", { error: err.message })
        skipped++
      }
    }

    if (saved > 0) {
      logger.info("MEMORIES_EXTRACTED", { userId, saved, skipped })
    }

    return { saved, skipped }

  } catch (err) {
    logger.error("EXTRACT_AND_STORE_FAILED", { error: err.message })
    return { saved: 0, skipped: 0, error: err.message }
  }
}

// ══════════════════════════════════════
//  Cleanup — ضغط الذكريات الشبيهة
// ══════════════════════════════════════

/**
 * يدمج الذكريات الشبيهة (يشتغل دورياً)
 */
async function compressUserMemories(userId) {
  try {
    const memories = await memoryRepository.getUserMemories(userId, 500)
    if (!memories || memories.length < 50) return { compressed: 0 }

    const toDelete = []
    const seen = new Map()

    for (const mem of memories) {
      const normalized = normalize(mem.memory || "")

      // لو شفناها قبل، احذف الأقدم
      if (seen.has(normalized)) {
        toDelete.push(mem.id)
        continue
      }

      // فحص تشابه مع المحفوظات
      let isDuplicate = false
      for (const [key] of seen) {
        if (similarity(normalized, key) >= DUPLICATE_THRESHOLD) {
          isDuplicate = true
          break
        }
      }

      if (isDuplicate) {
        toDelete.push(mem.id)
      } else {
        seen.set(normalized, mem)
      }
    }

    // احذف المكررات
    if (toDelete.length > 0) {
      await databaseSystem.query(
        `DELETE FROM ai_memories WHERE id = ANY($1::int[])`,
        [toDelete]
      )
    }

    return { compressed: toDelete.length }
  } catch (err) {
    logger.error("COMPRESS_MEMORIES_FAILED", { error: err.message })
    return { compressed: 0, error: err.message }
  }
}

// ══════════════════════════════════════
//  EXPORTS
// ══════════════════════════════════════

module.exports = {
  extractAndStore,
  extractFromMessage,
  isDuplicate,
  compressUserMemories,
  checkUserLimit,

  // للاختبارات
  similarity,
  normalize,
  MAX_MEMORIES_PER_USER
}
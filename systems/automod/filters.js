// ══════════════════════════════════════════════════════════════════
//  AUTOMOD FILTERS
//  المسار: systems/automod/filters.js
//
//  كل filter دالة pure تأخذ (content, settings, context) وترجع:
//   - null              : ما في مخالفة
//   - { reason, severity } : فيها مخالفة
//
//  severity: 'low' | 'medium' | 'high'
//
//  ✅ NEW: يدعم AI Toxicity Filter (async)
// ══════════════════════════════════════════════════════════════════

const aiToxicityFilter = require("./aiToxicityFilter")

// ──────────────────────────────────────────────────────────────────
//  Default bad words (قائمة عربية + إنجليزية مهذبة)
//  ⚠️ القائمة موسعة لكن مش شاملة — السيرفرات تضيف كلماتها الخاصة
// ──────────────────────────────────────────────────────────────────

const DEFAULT_BAD_WORDS_AR = [
  "كس", "زبر", "طيز", "خرا", "كسمك", "نيك", "متناك", "زاني", "زانية",
  "شرموطة", "قحبة", "عاهرة", "كلب ابن", "وسخ", "حقير"
]

const DEFAULT_BAD_WORDS_EN = [
  "fuck", "shit", "bitch", "asshole", "cunt", "dick", "pussy",
  "nigger", "faggot", "motherfucker"
]

const DEFAULT_BAD_WORDS = [...DEFAULT_BAD_WORDS_AR, ...DEFAULT_BAD_WORDS_EN]

// ──────────────────────────────────────────────────────────────────
//  Normalization (للنص العربي والإنجليزي)
// ──────────────────────────────────────────────────────────────────

function normalize(text) {
  if (!text) return ""
  return text
    .toLowerCase()
    .replace(/[إأآا]/g, "ا")
    .replace(/[ىي]/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[\d]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

// ──────────────────────────────────────────────────────────────────
//  Filter 1: Bad Words
// ──────────────────────────────────────────────────────────────────

function checkBadWords(content, settings, ctx = {}) {
  if (!content) return null

  const config = settings.filters?.bad_words
  if (!config?.enabled) return null

  const customWords = ctx.customWords || []
  const wordsList = config.use_default !== false
    ? [...DEFAULT_BAD_WORDS, ...customWords.filter(w => w.type === "banned").map(w => w.word)]
    : customWords.filter(w => w.type === "banned").map(w => w.word)

  if (wordsList.length === 0) return null

  const normalized = normalize(content)

  for (const word of wordsList) {
    const normalizedWord = normalize(word)
    if (!normalizedWord) continue

    const regex = new RegExp(`(^|\\s)${escapeRegex(normalizedWord)}(\\s|$|[^\\w])`, "i")
    if (regex.test(normalized)) {
      return {
        reason: `كلمة محظورة: "${word}"`,
        severity: "high",
        matched: word
      }
    }
  }

  return null
}

// ──────────────────────────────────────────────────────────────────
//  Filter 2: Links
// ──────────────────────────────────────────────────────────────────

const URL_REGEX = /https?:\/\/([^\s/$.?#].[^\s]*)/gi

function checkLinks(content, settings, ctx = {}) {
  if (!content) return null

  const config = settings.filters?.links
  if (!config?.enabled) return null

  const matches = content.match(URL_REGEX)
  if (!matches || matches.length === 0) return null

  const whitelist = (config.whitelist || []).map(d => d.toLowerCase())

  for (const url of matches) {
    try {
      const domain = new URL(url).hostname.toLowerCase().replace(/^www\./, "")
      const allowed = whitelist.some(w => domain === w || domain.endsWith("." + w))
      if (!allowed) {
        return {
          reason: `رابط غير مسموح: ${domain}`,
          severity: "medium",
          matched: url
        }
      }
    } catch {
      return {
        reason: "رابط غير صالح",
        severity: "low"
      }
    }
  }

  return null
}

// ──────────────────────────────────────────────────────────────────
//  Filter 3: Discord Invites
// ──────────────────────────────────────────────────────────────────

const INVITE_REGEX = /(?:discord\.(?:gg|com\/invite)|discordapp\.com\/invite)\/[a-zA-Z0-9-]+/gi

function checkInvites(content, settings) {
  if (!content) return null

  const config = settings.filters?.invites
  if (!config?.enabled) return null

  if (INVITE_REGEX.test(content)) {
    return {
      reason: "دعوة سيرفر آخر ممنوعة",
      severity: "medium"
    }
  }

  return null
}

// ──────────────────────────────────────────────────────────────────
//  Filter 4: CAPS (excessive uppercase)
// ──────────────────────────────────────────────────────────────────

function checkCaps(content, settings) {
  if (!content || content.length < 10) return null

  const config = settings.filters?.caps
  if (!config?.enabled) return null

  const threshold = config.threshold || 70  // %

  const letters = content.match(/[a-zA-Z\u0600-\u06FF]/g) || []
  if (letters.length < 10) return null

  const uppercase = content.match(/[A-Z]/g) || []
  const percent = (uppercase.length / letters.length) * 100

  if (percent >= threshold) {
    return {
      reason: `كابيتال زيادة (${Math.round(percent)}%)`,
      severity: "low"
    }
  }

  return null
}

// ──────────────────────────────────────────────────────────────────
//  Filter 5: Mass Mentions
// ──────────────────────────────────────────────────────────────────

function checkMassMentions(content, settings, ctx = {}) {
  if (!content) return null

  const config = settings.filters?.mass_mentions
  if (!config?.enabled) return null

  const threshold = config.threshold || 5
  const message = ctx.message

  if (!message) return null

  const mentions = (message.mentions?.users?.size || 0) +
                   (message.mentions?.roles?.size || 0)

  if (mentions >= threshold) {
    return {
      reason: `منشن جماعي (${mentions})`,
      severity: "high"
    }
  }

  return null
}

// ──────────────────────────────────────────────────────────────────
//  Filter 6: Excessive Emojis
// ──────────────────────────────────────────────────────────────────

const EMOJI_REGEX = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]|<a?:[^:]+:\d+>/gu

function checkEmojis(content, settings) {
  if (!content || content.length < 5) return null

  const config = settings.filters?.emojis
  if (!config?.enabled) return null

  const threshold = config.threshold || 10
  const matches = content.match(EMOJI_REGEX) || []

  if (matches.length >= threshold) {
    return {
      reason: `إيموجي زيادة (${matches.length})`,
      severity: "low"
    }
  }

  return null
}

// ──────────────────────────────────────────────────────────────────
//  Filter 7: Duplicate Messages
// ──────────────────────────────────────────────────────────────────

const duplicateTracker = new Map()
const DUPLICATE_TTL = 30 * 1000  // 30 ثانية

function checkDuplicate(content, settings, ctx = {}) {
  if (!content || content.length < 5) return null

  const config = settings.filters?.duplicate
  if (!config?.enabled) return null

  const threshold = config.threshold || 3
  const userId = ctx.userId
  const guildId = ctx.guildId
  if (!userId || !guildId) return null

  const key = `${guildId}:${userId}`
  const normalized = content.trim().toLowerCase()
  const now = Date.now()

  let entries = duplicateTracker.get(key) || []
  entries = entries.filter(e => now - e.time < DUPLICATE_TTL)
  entries.push({ text: normalized, time: now })

  duplicateTracker.set(key, entries)

  const duplicates = entries.filter(e => e.text === normalized).length
  if (duplicates >= threshold) {
    return {
      reason: `رسالة مكررة (${duplicates}x)`,
      severity: "medium"
    }
  }

  return null
}

// ──────────────────────────────────────────────────────────────────
//  Filter 8: Zalgo Text
// ──────────────────────────────────────────────────────────────────

const ZALGO_REGEX = /[\u0300-\u036F\u0489\u1AB0-\u1AFF\u1DC0-\u1DFF\u20D0-\u20FF\uFE20-\uFE2F]/g

function checkZalgo(content, settings) {
  if (!content || content.length < 5) return null

  const config = settings.filters?.zalgo
  if (!config?.enabled) return null

  const zalgoChars = content.match(ZALGO_REGEX) || []
  const ratio = zalgoChars.length / content.length

  if (ratio > 0.3 || zalgoChars.length > 20) {
    return {
      reason: "نص مشوّه (Zalgo)",
      severity: "medium"
    }
  }

  return null
}

// ──────────────────────────────────────────────────────────────────
//  Cleanup duplicate tracker
// ──────────────────────────────────────────────────────────────────

function cleanupDuplicateTracker() {
  const now = Date.now()
  for (const [key, entries] of duplicateTracker.entries()) {
    const recent = entries.filter(t => now - t.time < DUPLICATE_TTL)
    if (recent.length === 0) {
      duplicateTracker.delete(key)
    } else if (recent.length !== entries.length) {
      duplicateTracker.set(key, recent)
    }
  }

  // Cleanup AI toxicity cache too
  try {
    aiToxicityFilter.cleanupCache()
  } catch {}
}

// ──────────────────────────────────────────────────────────────────
//  Main: run all filters on a message
//
//  ✅ NEW: الـ AI filter async — runAllFilters صار async
// ──────────────────────────────────────────────────────────────────

async function runAllFilters(content, settings, ctx = {}) {
  const violations = []

  // ─── الفلاتر الـ sync (سريعة) ───
  const syncCheck = (fn) => {
    try {
      const result = fn(content, settings, ctx)
      if (result) violations.push(result)
    } catch {}
  }

  syncCheck(checkBadWords)
  syncCheck(checkLinks)
  syncCheck(checkInvites)
  syncCheck(checkCaps)
  syncCheck(checkMassMentions)
  syncCheck(checkEmojis)
  syncCheck(checkDuplicate)
  syncCheck(checkZalgo)

  // ─── إذا في كلمة محظورة، نتخطى AI (وفّر التكلفة) ───
  const hasBadWord = violations.some(v => v.reason?.includes("محظورة"))
  if (hasBadWord) {
    return violations
  }

  // ─── AI Toxicity (async) — يتنفذ بس لو محتاجين ───
  try {
    const aiResult = await aiToxicityFilter.checkAIToxicity(content, settings, ctx)
    if (aiResult) violations.push(aiResult)
  } catch {}

  return violations
}

// ──────────────────────────────────────────────────────────────────
//  Exports
// ──────────────────────────────────────────────────────────────────

module.exports = {
  runAllFilters,
  checkBadWords,
  checkLinks,
  checkInvites,
  checkCaps,
  checkMassMentions,
  checkEmojis,
  checkDuplicate,
  checkZalgo,
  cleanupDuplicateTracker,
  normalize,
  DEFAULT_BAD_WORDS
}
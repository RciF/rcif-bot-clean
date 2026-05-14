// ══════════════════════════════════════════════════════════════════
//  AUTOMOD FILTERS
//  المسار: systems/automod/filters.js
//
//  كل filter دالة pure تأخذ (content, settings, context) وترجع:
//   - null              : ما في مخالفة
//   - { reason, severity } : فيها مخالفة
//
//  severity: 'low' | 'medium' | 'high'
// ══════════════════════════════════════════════════════════════════

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
    // أحرف عربية متشابهة
    .replace(/[إأآا]/g, "ا")
    .replace(/[ىي]/g, "ي")
    .replace(/ة/g, "ه")
    // إزالة التشكيل
    .replace(/[\u064B-\u065F\u0670]/g, "")
    // إزالة الأرقام الزائدة (الـ leet speak: f4ck → fck)
    .replace(/[\d]/g, "")
    // مسافات متعددة
    .replace(/\s+/g, " ")
    .trim()
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

    // exact match: كلمة مستقلة
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

function checkLinks(content, settings) {
  if (!content) return null

  const config = settings.filters?.links
  if (!config?.enabled) return null

  const matches = [...content.matchAll(URL_REGEX)]
  if (matches.length === 0) return null

  const whitelist = (config.whitelist || []).map(d => d.toLowerCase().replace(/^www\./, ""))

  for (const match of matches) {
    const fullDomain = match[1].toLowerCase().replace(/^www\./, "").split("/")[0]

    // فحص الـ whitelist (أو subdomain منها)
    const isWhitelisted = whitelist.some(allowed =>
      fullDomain === allowed || fullDomain.endsWith("." + allowed)
    )

    if (!isWhitelisted) {
      return {
        reason: `رابط غير مسموح: ${fullDomain}`,
        severity: "medium",
        matched: fullDomain
      }
    }
  }

  return null
}

// ──────────────────────────────────────────────────────────────────
//  Filter 3: Discord Invites
// ──────────────────────────────────────────────────────────────────

const INVITE_REGEX = /(discord\.(gg|com\/invite|me)|discordapp\.com\/invite)\/[\w-]+/gi

function checkInvites(content, settings) {
  if (!content) return null

  const config = settings.filters?.invites
  if (!config?.enabled) return null

  if (INVITE_REGEX.test(content)) {
    return {
      reason: "دعوة Discord ممنوعة",
      severity: "medium"
    }
  }

  return null
}

// ──────────────────────────────────────────────────────────────────
//  Filter 4: Excessive Caps
// ──────────────────────────────────────────────────────────────────

function checkCaps(content, settings) {
  if (!content) return null

  const config = settings.filters?.caps
  if (!config?.enabled) return null

  // فقط للنصوص الإنجليزية (الأحرف الأبجدية)
  const letters = content.match(/[a-zA-Z]/g) || []
  if (letters.length < (config.min_length || 10)) return null

  const upperCount = (content.match(/[A-Z]/g) || []).length
  const percentage = (upperCount / letters.length) * 100
  const threshold = config.threshold || 70

  if (percentage >= threshold) {
    return {
      reason: `نص بالكابيتال (${Math.floor(percentage)}%)`,
      severity: "low"
    }
  }

  return null
}

// ──────────────────────────────────────────────────────────────────
//  Filter 5: Mass Mentions
// ──────────────────────────────────────────────────────────────────

function checkMassMentions(content, settings, ctx = {}) {
  if (!ctx.message) return null

  const config = settings.filters?.mass_mentions
  if (!config?.enabled) return null

  const message = ctx.message
  const userMentions = message.mentions?.users?.size || 0
  const roleMentions = message.mentions?.roles?.size || 0
  const hasEveryone = message.mentions?.everyone === true

  const threshold = config.max || 5

  if (hasEveryone) {
    return {
      reason: "منشن @everyone",
      severity: "high"
    }
  }

  const total = userMentions + roleMentions
  if (total > threshold) {
    return {
      reason: `منشن جماعي (${total} منشن)`,
      severity: "medium"
    }
  }

  return null
}

// ──────────────────────────────────────────────────────────────────
//  Filter 6: Excessive Emojis
// ──────────────────────────────────────────────────────────────────

// regex للـ unicode emojis + custom Discord emojis
const EMOJI_REGEX = /(\p{Extended_Pictographic}|<a?:\w+:\d+>)/gu

function checkEmojis(content, settings) {
  if (!content) return null

  const config = settings.filters?.emojis
  if (!config?.enabled) return null

  const emojiMatches = content.match(EMOJI_REGEX) || []
  const threshold = config.max || 10

  if (emojiMatches.length > threshold) {
    return {
      reason: `إيموجي زيادة (${emojiMatches.length} إيموجي)`,
      severity: "low"
    }
  }

  return null
}

// ──────────────────────────────────────────────────────────────────
//  Filter 7: Duplicate Messages
// ──────────────────────────────────────────────────────────────────

const duplicateTracker = new Map()
const DUPLICATE_TTL = 60 * 1000 // 1 دقيقة

function checkDuplicate(content, settings, ctx = {}) {
  if (!content || !ctx.userId || !ctx.guildId) return null

  const config = settings.filters?.duplicate
  if (!config?.enabled) return null

  const minLength = config.min_length || 5
  if (content.length < minLength) return null

  const key = `${ctx.guildId}:${ctx.userId}`
  const now = Date.now()
  const tracker = duplicateTracker.get(key) || []

  // filter old entries
  const recent = tracker.filter(t => now - t.time < DUPLICATE_TTL)

  const normalized = normalize(content)
  const duplicates = recent.filter(t => t.content === normalized)

  // أضف الرسالة الحالية
  recent.push({ content: normalized, time: now })
  duplicateTracker.set(key, recent.slice(-10)) // آخر 10 رسائل بس

  const threshold = config.max || 3
  if (duplicates.length + 1 >= threshold) {
    return {
      reason: `رسائل متكررة (${duplicates.length + 1} مرات)`,
      severity: "medium"
    }
  }

  return null
}

// ──────────────────────────────────────────────────────────────────
//  Filter 8: Zalgo (نصوص مشوهة)
// ──────────────────────────────────────────────────────────────────

const ZALGO_REGEX = /[\u0300-\u036F\u0483-\u0489\u0591-\u05BD\u05BF\u05C1-\u05C2\u05C4-\u05C5\u05C7\u0610-\u061A]/g

function checkZalgo(content, settings) {
  if (!content) return null

  const config = settings.filters?.zalgo
  if (!config?.enabled) return null

  const zalgoChars = (content.match(ZALGO_REGEX) || []).length
  const threshold = config.max || 5

  if (zalgoChars > threshold) {
    return {
      reason: `نص مشوه (zalgo)`,
      severity: "low"
    }
  }

  return null
}

// ──────────────────────────────────────────────────────────────────
//  Helpers
// ──────────────────────────────────────────────────────────────────

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
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
}

// ──────────────────────────────────────────────────────────────────
//  Main: run all filters on a message
// ──────────────────────────────────────────────────────────────────

async function runAllFilters(content, settings, ctx = {}) {
  const violations = []

  const check = (fn) => {
    try {
      const result = fn(content, settings, ctx)
      if (result) violations.push(result)
    } catch {}
  }

  check(checkBadWords)
  check(checkLinks)
  check(checkInvites)
  check(checkCaps)
  check(checkMassMentions)
  check(checkEmojis)
  check(checkDuplicate)
  check(checkZalgo)

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
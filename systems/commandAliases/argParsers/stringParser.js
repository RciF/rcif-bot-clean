/**
 * ═══════════════════════════════════════════════════════════
 *  String Parser
 *
 *  يستخرج:
 *  - السبب بعد إزالة الـ mentions والأرقام
 *  - النص المقتبس "..."
 *  - السبب المسبوق بـ "سبب:" / "reason:"
 *
 *  أمثلة:
 *    "#حظر @user 3d سبب: مخالف"
 *    → reason: "مخالف"
 *
 *    "#حظر @user 3d مزعج جداً"
 *    → reason: "مزعج جداً"
 *
 *    "#حظر @user \"سبب طويل مع مسافات\" 7d"
 *    → reason: "سبب طويل مع مسافات"
 * ═══════════════════════════════════════════════════════════
 */

// ════════════════════════════════════════════════════════════
//  Reason prefixes (Arabic + English)
// ════════════════════════════════════════════════════════════

const REASON_PREFIXES = [
  "سبب:", "السبب:", "لـ:", "ل:",
  "reason:", "for:", "because:",
]

// ════════════════════════════════════════════════════════════
//  extractQuotedString
//
//  يجيب أول نص بين علامتي اقتباس "..." أو '...'
//
//  Returns: { value, remainder } | null
// ════════════════════════════════════════════════════════════

function extractQuotedString(text) {
  if (!text || typeof text !== "string") return null

  // ندعم " و ' و « »
  const match = text.match(/(["'«])([\s\S]*?)(["'»])/)
  if (!match) return null

  const value = match[2].trim()
  const remainder = (text.slice(0, match.index) + text.slice(match.index + match[0].length)).trim()

  return { value, remainder }
}

// ════════════════════════════════════════════════════════════
//  extractReasonByPrefix
//
//  يفحص إن النص يحتوي "سبب: xxx" أو "reason: xxx"
//
//  Returns: { reason, remainder } | null
// ════════════════════════════════════════════════════════════

function extractReasonByPrefix(text) {
  if (!text || typeof text !== "string") return null

  const lower = text.toLowerCase()

  for (const prefix of REASON_PREFIXES) {
    const idx = lower.indexOf(prefix.toLowerCase())
    if (idx === -1) continue

    // الـ reason = كل شي بعد البريفكس
    const reason = text.slice(idx + prefix.length).trim()
    const remainder = text.slice(0, idx).trim()

    if (reason) {
      return { reason, remainder }
    }
  }

  return null
}

// ════════════════════════════════════════════════════════════
//  parseReason
//
//  يستخرج السبب من نص بطرق متعددة (بالترتيب):
//  1. لو في "سبب: xxx" → خذ ما بعدها
//  2. لو في "..." → خذ المقتبس
//  3. خلاف ذلك → اعتبر كل النص كسبب
//
//  Returns: { reason, remainder }
// ════════════════════════════════════════════════════════════

function parseReason(text) {
  if (!text || typeof text !== "string") {
    return { reason: null, remainder: "" }
  }

  const trimmed = text.trim()
  if (!trimmed) return { reason: null, remainder: "" }

  // Try prefix
  const byPrefix = extractReasonByPrefix(trimmed)
  if (byPrefix) return byPrefix

  // Try quoted
  const byQuoted = extractQuotedString(trimmed)
  if (byQuoted) return { reason: byQuoted.value, remainder: byQuoted.remainder }

  // Default: كل النص = سبب
  return { reason: trimmed, remainder: "" }
}

// ════════════════════════════════════════════════════════════
//  splitTokens
//
//  يقسم النص إلى توكنز مع احترام علامات الاقتباس
//
//  مثلاً: "a b 'c d' e" → ["a", "b", "c d", "e"]
// ════════════════════════════════════════════════════════════

function splitTokens(text) {
  if (!text || typeof text !== "string") return []

  const tokens = []
  let current = ""
  let inQuotes = false
  let quoteChar = null

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]

    if (inQuotes) {
      if (ch === quoteChar) {
        inQuotes = false
        if (current) {
          tokens.push(current)
          current = ""
        }
        continue
      }
      current += ch
      continue
    }

    if (ch === '"' || ch === "'" || ch === "«") {
      inQuotes = true
      quoteChar = ch === "«" ? "»" : ch
      if (current) {
        tokens.push(current)
        current = ""
      }
      continue
    }

    if (/\s/.test(ch)) {
      if (current) {
        tokens.push(current)
        current = ""
      }
      continue
    }

    current += ch
  }

  if (current) tokens.push(current)
  return tokens
}

// ════════════════════════════════════════════════════════════
//  truncateString
//
//  يقص النص لطول معين (مفيد للأسباب الطويلة)
// ════════════════════════════════════════════════════════════

function truncateString(str, maxLength = 500) {
  if (!str || typeof str !== "string") return ""
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength - 3) + "..."
}

module.exports = {
  extractQuotedString,
  extractReasonByPrefix,
  parseReason,
  splitTokens,
  truncateString,
}
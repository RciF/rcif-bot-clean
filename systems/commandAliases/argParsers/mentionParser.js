/**
 * ═══════════════════════════════════════════════════════════
 *  Mention Parser
 *
 *  يستخرج user/channel/role من النص:
 *  - <@123456> أو <@!123456>     → user ID
 *  - <#123456>                    → channel ID
 *  - <@&123456>                   → role ID
 *  - 123456789012345678          → raw ID (لو 17-20 رقم)
 *
 *  ⚠️ ما يجيب الكائنات — فقط الـ IDs. الـ executor يجيب الكائن من Discord.
 * ═══════════════════════════════════════════════════════════
 */

// ════════════════════════════════════════════════════════════
//  Regex patterns
// ════════════════════════════════════════════════════════════

const USER_MENTION_RE = /^<@!?(\d{15,22})>$/
const CHANNEL_MENTION_RE = /^<#(\d{15,22})>$/
const ROLE_MENTION_RE = /^<@&(\d{15,22})>$/
const RAW_ID_RE = /^(\d{15,22})$/

// ════════════════════════════════════════════════════════════
//  parseUserMention
//
//  Returns: { id: "123456", token: "<@123>" } | null
// ════════════════════════════════════════════════════════════

function parseUserMention(token) {
  if (!token || typeof token !== "string") return null

  const trimmed = token.trim()

  // <@123> أو <@!123>
  let match = trimmed.match(USER_MENTION_RE)
  if (match) return { id: match[1], token: trimmed }

  // Raw ID
  match = trimmed.match(RAW_ID_RE)
  if (match) return { id: match[1], token: trimmed }

  return null
}

// ════════════════════════════════════════════════════════════
//  parseChannelMention
// ════════════════════════════════════════════════════════════

function parseChannelMention(token) {
  if (!token || typeof token !== "string") return null

  const trimmed = token.trim()

  let match = trimmed.match(CHANNEL_MENTION_RE)
  if (match) return { id: match[1], token: trimmed }

  match = trimmed.match(RAW_ID_RE)
  if (match) return { id: match[1], token: trimmed }

  return null
}

// ════════════════════════════════════════════════════════════
//  parseRoleMention
// ════════════════════════════════════════════════════════════

function parseRoleMention(token) {
  if (!token || typeof token !== "string") return null

  const trimmed = token.trim()

  let match = trimmed.match(ROLE_MENTION_RE)
  if (match) return { id: match[1], token: trimmed }

  match = trimmed.match(RAW_ID_RE)
  if (match) return { id: match[1], token: trimmed }

  return null
}

// ════════════════════════════════════════════════════════════
//  extractFirstUserMention
//
//  يفحص نص كامل ويرجع أول user mention يلقاه + باقي النص
//
//  Returns: { id, remainder } | null
// ════════════════════════════════════════════════════════════

function extractFirstUserMention(text) {
  if (!text || typeof text !== "string") return null

  const tokens = text.trim().split(/\s+/)

  for (let i = 0; i < tokens.length; i++) {
    const parsed = parseUserMention(tokens[i])
    if (parsed) {
      // باقي النص = كل التوكنز ما عدا هذا
      const remainder = [...tokens.slice(0, i), ...tokens.slice(i + 1)]
        .join(" ")
        .trim()
      return { id: parsed.id, remainder }
    }
  }

  return null
}

// ════════════════════════════════════════════════════════════
//  Utilities
// ════════════════════════════════════════════════════════════

function isDiscordId(str) {
  return RAW_ID_RE.test(String(str).trim())
}

module.exports = {
  parseUserMention,
  parseChannelMention,
  parseRoleMention,
  extractFirstUserMention,
  isDiscordId,
}
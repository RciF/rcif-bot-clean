/**
 * ═══════════════════════════════════════════════════════════
 *  Command Aliases — Resolver (Batch 5 Update)
 *
 *  يحول نص رسالة إلى تطابق مع أمر:
 *
 *  Strategy:
 *  1. فحص النص كاملاً (للـ aliases بدون args مثل "!p")
 *  2. فحص أول كلمة (للـ aliases مع args مثل "#حظر @user 7d")
 *
 *  Returns:
 *    {
 *      commandName: "حظر",
 *      matchedAlias: "#حظر",
 *      rawArgs: "@user 7d مزعج"    // باقي النص بعد الـ alias
 *    }
 *    أو null
 * ═══════════════════════════════════════════════════════════
 */

function resolve(messageText, config) {
  if (!messageText || typeof messageText !== "string") return null
  if (!config || !config.aliases) return null

  const aliases = config.aliases
  if (Object.keys(aliases).length === 0) return null

  const trimmed = messageText.trim()
  if (!trimmed) return null

  // ─── 1) فحص النص كاملاً (alias فقط بدون args) ───
  if (aliases[trimmed]) {
    return {
      commandName: aliases[trimmed],
      matchedAlias: trimmed,
      rawArgs: "",
    }
  }

  // ─── 2) فحص أول كلمة (alias + args) ───
  const firstSpaceIdx = trimmed.search(/\s/)
  if (firstSpaceIdx === -1) {
    // ما فيه مسافة، النص كاملاً مو alias
    return null
  }

  const firstToken = trimmed.slice(0, firstSpaceIdx)
  const restOfText = trimmed.slice(firstSpaceIdx + 1).trim()

  if (aliases[firstToken]) {
    return {
      commandName: aliases[firstToken],
      matchedAlias: firstToken,
      rawArgs: restOfText,
    }
  }

  return null
}

// ════════════════════════════════════════════════════════════
//  isCommandEnabled
// ════════════════════════════════════════════════════════════

function isCommandEnabled(commandName, config) {
  if (!config || !config.legacy) return true

  const legacy = config.legacy[commandName]
  if (!legacy) return true

  return legacy.enabled !== false
}

module.exports = {
  resolve,
  isCommandEnabled,
}
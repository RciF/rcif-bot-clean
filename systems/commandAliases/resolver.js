/**
 * ═══════════════════════════════════════════════════════════
 *  Command Aliases — Resolver
 *
 *  يحول نص رسالة إلى تطابق مع أمر:
 *  - يفحص النص كاملاً (عشان aliases مع spaces ما تشتغل)
 *  - يفحص أول كلمة من النص (للأوامر اللي بعدها arguments)
 *  - يرجع { commandName, originalAlias, args } لو لقى تطابق
 *
 *  ⚠️ في الباتش 2: ما زلنا ندعم الأوامر بدون arguments فقط.
 *  args يكون مصفوفة فاضية. الباتش 4-5 يدعم الـ arguments الكاملة.
 * ═══════════════════════════════════════════════════════════
 */

// ════════════════════════════════════════════════════════════
//  resolve
//
//  Inputs:
//    messageText: نص الرسالة كاملاً (string)
//    config: { aliases: { "alias": "commandName" }, ... }
//
//  Returns:
//    {
//      commandName: "yawmi",
//      matchedAlias: "d",
//      args: []  // حالياً فاضية، الباتش 5 راح يملأها
//    }
//    أو null لو ما فيه تطابق
// ════════════════════════════════════════════════════════════

function resolve(messageText, config) {
  if (!messageText || typeof messageText !== "string") return null
  if (!config || !config.aliases) return null

  const aliases = config.aliases
  if (Object.keys(aliases).length === 0) return null

  // ─── Trim + normalize ───
  const trimmed = messageText.trim()
  if (!trimmed) return null

  // ─── 1) فحص النص كاملاً (مطابقة دقيقة) ───
  // هذا يدعم aliases زي "p" أو "!p" أو "$p" — نص الرسالة كاملاً يساوي الـ alias
  if (aliases[trimmed]) {
    return {
      commandName: aliases[trimmed],
      matchedAlias: trimmed,
      args: [],
    }
  }

  // ─── 2) فحص أول كلمة (للأوامر مع arguments) ───
  // مثلاً "!حظر @user reason" → الـ alias هو "!حظر"
  // نقسم النص بأول مسافة فقط
  const firstSpaceIdx = trimmed.search(/\s/)
  if (firstSpaceIdx === -1) {
    // ما فيه مسافة، نفحص النص كاملاً مرة واحدة بس
    return null
  }

  const firstToken = trimmed.slice(0, firstSpaceIdx)
  const restOfText = trimmed.slice(firstSpaceIdx + 1).trim()

  if (aliases[firstToken]) {
    return {
      commandName: aliases[firstToken],
      matchedAlias: firstToken,
      // args = نص باقي الرسالة كـ string
      // (الباتش 5 راح يـ parse هذا حسب نوع الأمر)
      args: restOfText ? [restOfText] : [],
      rawArgs: restOfText, // الـ string الكامل بدون split
    }
  }

  return null
}

// ════════════════════════════════════════════════════════════
//  isCommandEnabled
//  يفحص إن الأمر مو معطّل من قبل المالك
// ════════════════════════════════════════════════════════════

function isCommandEnabled(commandName, config) {
  if (!config || !config.legacy) return true // افتراضي مفعّل

  const legacy = config.legacy[commandName]
  if (!legacy) return true

  return legacy.enabled !== false
}

module.exports = {
  resolve,
  isCommandEnabled,
}
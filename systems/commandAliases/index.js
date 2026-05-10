/**
 * ═══════════════════════════════════════════════════════════
 *  Command Aliases System — Entry Point
 *
 *  الاستخدام في events/messageCreate.js:
 *
 *    const aliasesSystem = require("../systems/commandAliases")
 *    ...
 *    const handled = await aliasesSystem.handleMessage(message, client)
 *    if (handled) return  // الأمر اتنفذ، نتوقف هنا
 *
 *  ═══════════════════════════════════════════════════════════
 *
 *  العملية الكاملة:
 *  1. جلب config السيرفر (مع caching)
 *  2. حل الـ alias → command name
 *  3. فحص لو الأمر مفعّل
 *  4. تنفيذ (لو الأمر بسيط) أو إرسال توضيح (لو يحتاج arguments)
 *  5. تسجيل الاستخدام للـ leaderboard
 * ═══════════════════════════════════════════════════════════
 */

const logger = require("../loggerSystem")
const { fetchConfig, invalidate, getCacheSize } = require("./configFetcher")
const { resolve, isCommandEnabled } = require("./resolver")
const { execute } = require("./executor")
const { trackUsage } = require("./usageTracker")

// ════════════════════════════════════════════════════════════
//  handleMessage
//
//  Returns:
//    true  → تم التعامل مع الرسالة كـ alias (نوقف باقي المعالجة)
//    false → ما هي alias، يكمل messageCreate طبيعياً
// ════════════════════════════════════════════════════════════

async function handleMessage(message, client) {
  try {
    // ─── 1) فلترة سريعة ───
    if (!message?.guild) return false
    if (!message.content) return false
    if (message.author?.bot) return false

    // تجاهل الرسائل اللي تبدأ بسلاش (Discord سيرفسها كـ slash command)
    if (message.content.startsWith("/")) return false

    const guildId = message.guild.id

    // ─── 2) جلب config السيرفر ───
    const config = await fetchConfig(guildId)

    if (!config || !config.aliases || Object.keys(config.aliases).length === 0) {
      // ما فيه aliases في هذا السيرفر
      return false
    }

    // ─── 3) محاولة حل الـ alias ───
    const resolved = resolve(message.content, config)
    if (!resolved) return false

    // ─── 4) فحص لو الأمر مفعّل ───
    if (!isCommandEnabled(resolved.commandName, config)) {
      try {
        await message.reply({
          content: "❌ هذا الأمر معطّل في هذا السيرفر.",
          allowedMentions: { repliedUser: false },
        })
      } catch {}
      return true // اعتبرناها معالَجة عشان ما يكمل messageCreate
    }

    // ─── 5) جلب الأمر من client.commands ───
    const command = client.commands?.get(resolved.commandName)
    if (!command) {
      logger.warn("ALIAS_COMMAND_NOT_FOUND", {
        guildId,
        commandName: resolved.commandName,
        alias: resolved.matchedAlias,
      })
      return false
    }

    // ─── 6) تنفيذ ───
    const result = await execute(message, command, resolved)

    // ─── 7) لو الأمر يحتاج arguments → نرسل توضيح ───
    if (result.needsSlash) {
      try {
        await message.reply({
          content: `هذا الأمر يحتاج خيارات. الرجاء استخدام: \`/${resolved.commandName}\``,
          allowedMentions: { repliedUser: false },
        })
      } catch {}
      return true
    }

    // ─── 8) تسجيل الاستخدام (non-blocking) ───
    if (result.success) {
      trackUsage(guildId, resolved.commandName).catch(() => {})

      logger.info("ALIAS_EXECUTED", {
        guildId,
        commandName: resolved.commandName,
        alias: resolved.matchedAlias,
        userId: message.author.id,
      })
    }

    return true
  } catch (err) {
    logger.error("ALIAS_HANDLER_FATAL", {
      error: err.message,
      stack: err.stack,
    })
    return false // نخلي messageCreate يكمل
  }
}

// ════════════════════════════════════════════════════════════
//  Stats (للمراقبة)
// ════════════════════════════════════════════════════════════

function getStats() {
  return {
    cache_size: getCacheSize(),
  }
}

module.exports = {
  handleMessage,
  invalidate,
  getStats,
}
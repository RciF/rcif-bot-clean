/**
 * ═══════════════════════════════════════════════════════════
 *  Command Aliases System — Entry Point (Batch 5-7 Update)
 *
 *  العملية الكاملة:
 *  1. جلب config السيرفر (مع caching)
 *  2. حل الـ alias → commandName + rawArgs
 *  3. فحص لو الأمر مفعّل (legacy enabled)
 *  4. فحص الـ restrictions (الباتش 6)
 *  5. تنفيذ:
 *     - أوامر إشراف → moderationExecutors (الباتش 5)
 *     - أوامر بسيطة → fake interaction (الباتش 2)
 *  6. تطبيق deletion options (الباتش 7)
 *  7. تسجيل الاستخدام للـ leaderboard
 * ═══════════════════════════════════════════════════════════
 */

const logger = require("../loggerSystem")
const { fetchConfig, invalidate, getCacheSize } = require("./configFetcher")
const { resolve, isCommandEnabled } = require("./resolver")
const { execute } = require("./executor")
const { trackUsage } = require("./usageTracker")
const restrictionsChecker = require("./restrictions/checker")
const deletionHandler = require("./deletion/handler")

// ════════════════════════════════════════════════════════════
//  handleMessage
//
//  Returns:
//    true  → تم التعامل مع الرسالة (نوقف باقي المعالجة)
//    false → ما هي alias، يكمل messageCreate طبيعياً
// ════════════════════════════════════════════════════════════

async function handleMessage(message, client) {
  try {
    // ─── 1) فلترة سريعة ───
    if (!message?.guild) return false
    if (!message.content) return false
    if (message.author?.bot) return false
    if (message.content.startsWith("/")) return false

    const guildId = message.guild.id

    // ─── 2) جلب config السيرفر ───
    const config = await fetchConfig(guildId)
    if (!config || !config.aliases || Object.keys(config.aliases).length === 0) {
      return false
    }

    // ─── 3) حل الـ alias ───
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
      return true
    }

    // ─── 5) فحص الـ restrictions (الباتش 6) ───
    const cmdRestrictions = config.restrictions?.[resolved.commandName]

    if (cmdRestrictions && restrictionsChecker.hasAnyRestrictions(cmdRestrictions)) {
      const checkResult = restrictionsChecker.check(
        message.member,
        message.channel.id,
        cmdRestrictions,
      )

      if (!checkResult.allowed) {
        try {
          if (checkResult.userMessage) {
            await message.reply({
              content: checkResult.userMessage,
              allowedMentions: { repliedUser: false },
            })
          }
        } catch {}
        return true
      }
    }

    // ─── 6) جلب الأمر من client.commands ───
    const command = client.commands?.get(resolved.commandName)

    // ⚠️ ملاحظة: ما نطلب وجود command — moderationExecutors عنده logic مستقل
    // لكن للأوامر العادية، نحتاجه

    // ─── 7) تنفيذ ───
    const cmdDefaults = config.defaults?.[resolved.commandName] || {}

    const result = await execute(message, command, resolved, cmdDefaults)

    // ─── 8) لو الأمر يحتاج arguments → توجيه ───
    if (result.needsSlash) {
      try {
        await message.reply({
          content: `هذا الأمر يحتاج خيارات. الرجاء استخدام: \`/${resolved.commandName}\``,
          allowedMentions: { repliedUser: false },
        })
      } catch {}
      return true
    }

    // ─── 9) تطبيق deletion options (الباتش 7) ───
    if (result.success && Object.keys(cmdDefaults).length > 0) {
      // non-blocking
      deletionHandler.applyDeletions(message, result.replyMessage, cmdDefaults).catch(() => {})
    }

    // ─── 10) tracking ───
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
    return false
  }
}

// ════════════════════════════════════════════════════════════
//  handleMessageDeleted (للحذف التلقائي)
//
//  يُستدعى من event messageDelete
// ════════════════════════════════════════════════════════════

async function handleMessageDeleted(messageId) {
  try {
    await deletionHandler.handleUserMessageDeleted(messageId)
  } catch (err) {
    logger.warn("ALIAS_DELETION_HANDLE_FAILED", { error: err.message })
  }
}

// ════════════════════════════════════════════════════════════
//  Stats
// ════════════════════════════════════════════════════════════

function getStats() {
  return {
    cache_size: getCacheSize(),
    pending_deletions: deletionHandler.getStats().pendingDeletions,
  }
}

module.exports = {
  handleMessage,
  handleMessageDeleted,
  invalidate,
  getStats,
}
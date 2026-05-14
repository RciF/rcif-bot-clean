/**
 * ═══════════════════════════════════════════════════════════
 *  Ban Executor
 *
 *  ينفذ حظر عضو من رسالة نصية:
 *  - #حظر @user                  → حظر دائم بدون سبب
 *  - #حظر @user 7d               → حظر مؤقت (يتم رفعه بعد 7 أيام)
 *  - #حظر @user 7d سبب: مخالف    → حظر مؤقت + سبب
 *
 *  ⚠️ ملاحظة: Discord ما يدعم temp ban native — التطبيق يحفظ
 *  الـ unban_at في DB ويرفع الحظر تلقائياً (نظام موجود).
 * ═══════════════════════════════════════════════════════════
 */

const { PermissionFlagsBits } = require("discord.js")
const {
  resolveMember,
  resolveUser,
  validateModerationTarget,
  validatePermissions,
  buildSuccessEmbed,
  buildErrorEmbed,
  trySendDM,
  replyToMessage,
} = require("./_shared")
const { timeParser } = require("../argParsers")
const logger = require("../../loggerSystem")

// ════════════════════════════════════════════════════════════
//  execute
//
//  Inputs:
//    message: Discord message object
//    parsedArgs: { userId, duration, reason } from parseModerationArgs
//    defaults: { default_duration } from guild_command_defaults
//
//  Returns: { success: bool, replyMessage }
// ════════════════════════════════════════════════════════════

async function execute(message, parsedArgs, defaults = {}) {
  const { userId, duration, reason } = parsedArgs

  // ─── 1) فحص الصلاحيات ───
  const permCheck = validatePermissions(message.member, PermissionFlagsBits.BanMembers)
  if (!permCheck.ok) {
    const reply = await replyToMessage(message, { embeds: [buildErrorEmbed(permCheck.error)] })
    return { success: false, replyMessage: reply }
  }

  // ─── 2) جلب الـ user (يمكن مو في السيرفر) ───
  const targetUser = await resolveUser(message.client, userId)
  if (!targetUser) {
    const reply = await replyToMessage(message, {
      embeds: [buildErrorEmbed("❌ ما قدرت أجد هذا العضو")],
    })
    return { success: false, replyMessage: reply }
  }

  // ─── 3) جلب الـ member (لو موجود) للتحقق من الرتب ───
  const targetMember = await resolveMember(message.guild, userId)

  if (targetMember) {
    const validation = validateModerationTarget(message.member, targetMember, "حظر")
    if (!validation.ok) {
      const reply = await replyToMessage(message, {
        embeds: [buildErrorEmbed(validation.error)],
      })
      return { success: false, replyMessage: reply }
    }

    if (!targetMember.bannable) {
      const reply = await replyToMessage(message, {
        embeds: [buildErrorEmbed("❌ البوت ما يقدر يحظر هذا العضو")],
      })
      return { success: false, replyMessage: reply }
    }
  }

  // ─── 4) تحديد المدة (إذا فيها) ───
  // الأولوية: parsed > defaults > دائم
  let durationMs = null
  let durationText = "حظر دائم"

  if (duration?.ms) {
    durationMs = duration.ms
    durationText = timeParser.formatDuration(durationMs)
  } else if (defaults.default_duration) {
    // الـ default محفوظ كنص مثل "24h"
    const parsedDefault = timeParser.parseTime(defaults.default_duration)
    if (parsedDefault) {
      durationMs = parsedDefault.ms
      durationText = timeParser.formatDuration(durationMs)
    }
  }

  const finalReason = reason || "لم يتم تحديد سبب"
  const auditReason = `${finalReason} | بواسطة: ${message.author.username}`

  // ─── 5) محاولة إرسال DM قبل الحظر ───
  if (targetMember) {
    const dmEmbed = buildSuccessEmbed({
      title: "🚫 تم حظرك",
      target: null,
      executor: null,
      reason: finalReason,
      duration: durationMs ? durationText : "دائم",
      extraFields: [
        {
          name: "🏠 السيرفر",
          value: message.guild.name,
          inline: true,
        },
      ],
    }).setColor(0xef4444)

    await trySendDM(targetUser, dmEmbed)
  }

  // ─── 6) تنفيذ الحظر ───
  try {
    await message.guild.bans.create(userId, {
      reason: auditReason,
      deleteMessageSeconds: 0, // ما نحذف الرسائل افتراضياً
    })
  } catch (err) {
    logger.error("ALIAS_BAN_FAILED", {
      guildId: message.guild.id,
      userId,
      error: err.message,
    })

    const reply = await replyToMessage(message, {
      embeds: [buildErrorEmbed(`❌ فشل الحظر: ${err.message}`)],
    })
    return { success: false, replyMessage: reply }
  }

  // ─── 7) لو فيه مدة — سجّل في DB لـ auto-unban ───
  if (durationMs) {
    try {
      const moderationLogger = require("../../../utils/moderationLogger")
      if (moderationLogger?.recordBan) {
        await moderationLogger.recordBan({
          guildId: message.guild.id,
          userId,
          executorId: message.author.id,
          reason: finalReason,
          unbanAt: new Date(Date.now() + durationMs),
        })
      }
    } catch (err) {
      logger.warn("BAN_LOG_FAILED", { error: err.message })
    }
  }

  // ─── 8) رد في القناة ───
  const embed = buildSuccessEmbed({
    title: "🚫 تم حظر العضو",
    target: targetUser,
    executor: message.author,
    reason: finalReason,
    duration: durationText,
  }).setColor(0xef4444)

  const reply = await replyToMessage(message, { embeds: [embed] })

  return { success: true, replyMessage: reply }
}

module.exports = { execute }
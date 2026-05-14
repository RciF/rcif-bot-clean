/**
 * ═══════════════════════════════════════════════════════════
 *  Unban Executor
 *
 *  - #فك @user_id            → فك الحظر
 *  - #فك 123456789           → فك بـ raw ID
 * ═══════════════════════════════════════════════════════════
 */

const { PermissionFlagsBits } = require("discord.js")
const {
  resolveUser,
  validatePermissions,
  buildSuccessEmbed,
  buildErrorEmbed,
  replyToMessage,
} = require("./_shared")
const logger = require("../../loggerSystem")

async function execute(message, parsedArgs, defaults = {}) {
  const { userId, reason } = parsedArgs

  // ─── 1) صلاحيات ───
  const permCheck = validatePermissions(message.member, PermissionFlagsBits.BanMembers)
  if (!permCheck.ok) {
    const reply = await replyToMessage(message, { embeds: [buildErrorEmbed(permCheck.error)] })
    return { success: false, replyMessage: reply }
  }

  // ─── 2) جلب الـ user ───
  const targetUser = await resolveUser(message.client, userId)
  if (!targetUser) {
    const reply = await replyToMessage(message, {
      embeds: [buildErrorEmbed("❌ ما قدرت أجد هذا الـ user")],
    })
    return { success: false, replyMessage: reply }
  }

  const finalReason = reason || "لم يتم تحديد سبب"
  const auditReason = `${finalReason} | بواسطة: ${message.author.username}`

  // ─── 3) تنفيذ ───
  try {
    await message.guild.bans.remove(userId, auditReason)
  } catch (err) {
    // 10026 = Unknown Ban
    if (err.code === 10026) {
      const reply = await replyToMessage(message, {
        embeds: [buildErrorEmbed("⚠️ هذا العضو غير محظور أصلاً")],
      })
      return { success: false, replyMessage: reply }
    }

    logger.error("ALIAS_UNBAN_FAILED", {
      guildId: message.guild.id,
      userId,
      error: err.message,
    })

    const reply = await replyToMessage(message, {
      embeds: [buildErrorEmbed(`❌ فشل فك الحظر: ${err.message}`)],
    })
    return { success: false, replyMessage: reply }
  }

  // ─── 4) DB ───
  try {
    const moderationLogger = require("../../../utils/moderationLogger")
    if (moderationLogger?.recordUnban) {
      await moderationLogger.recordUnban({
        guildId: message.guild.id,
        userId,
        executorId: message.author.id,
        reason: finalReason,
      })
    }
  } catch (err) {
    logger.warn("UNBAN_LOG_FAILED", { error: err.message })
  }

  // ─── 5) رد ───
  const embed = buildSuccessEmbed({
    title: "✅ تم فك الحظر",
    target: targetUser,
    executor: message.author,
    reason: finalReason,
  }).setColor(0x22c55e)

  const reply = await replyToMessage(message, { embeds: [embed] })

  return { success: true, replyMessage: reply }
}

module.exports = { execute }
/**
 * ═══════════════════════════════════════════════════════════
 *  Unmute Executor
 *
 *  - #تكلم @user                → فك الكتم
 * ═══════════════════════════════════════════════════════════
 */

const { PermissionFlagsBits } = require("discord.js")
const {
  resolveMember,
  validateModerationTarget,
  validatePermissions,
  buildSuccessEmbed,
  buildErrorEmbed,
  trySendDM,
  replyToMessage,
} = require("./_shared")
const logger = require("../../loggerSystem")

async function execute(message, parsedArgs, defaults = {}) {
  const { userId, reason } = parsedArgs

  // ─── 1) صلاحيات ───
  const permCheck = validatePermissions(message.member, PermissionFlagsBits.ModerateMembers)
  if (!permCheck.ok) {
    const reply = await replyToMessage(message, { embeds: [buildErrorEmbed(permCheck.error)] })
    return { success: false, replyMessage: reply }
  }

  // ─── 2) العضو ───
  const targetMember = await resolveMember(message.guild, userId)
  if (!targetMember) {
    const reply = await replyToMessage(message, {
      embeds: [buildErrorEmbed("❌ ما قدرت أجد هذا العضو")],
    })
    return { success: false, replyMessage: reply }
  }

  // ─── 3) التحقق ───
  if (!targetMember.moderatable) {
    const reply = await replyToMessage(message, {
      embeds: [buildErrorEmbed("❌ البوت ما يقدر يعدل هذا العضو")],
    })
    return { success: false, replyMessage: reply }
  }

  // ─── 4) لو مو مكتوم ───
  if (!targetMember.isCommunicationDisabled()) {
    const reply = await replyToMessage(message, {
      embeds: [buildErrorEmbed("⚠️ هذا العضو غير مكتوم أصلاً")],
    })
    return { success: false, replyMessage: reply }
  }

  const finalReason = reason || "لم يتم تحديد سبب"
  const auditReason = `${finalReason} | بواسطة: ${message.author.username}`

  // ─── 5) تنفيذ ───
  try {
    await targetMember.timeout(null, auditReason)
  } catch (err) {
    logger.error("ALIAS_UNMUTE_FAILED", {
      guildId: message.guild.id,
      userId,
      error: err.message,
    })

    const reply = await replyToMessage(message, {
      embeds: [buildErrorEmbed(`❌ فشل فك الكتم: ${err.message}`)],
    })
    return { success: false, replyMessage: reply }
  }

  // ─── 6) DM ───
  const dmEmbed = buildSuccessEmbed({
    title: "🔊 تم فك كتمك",
    target: null,
    executor: null,
    reason: finalReason,
    extraFields: [
      { name: "🏠 السيرفر", value: message.guild.name, inline: true },
    ],
  }).setColor(0x22c55e)

  await trySendDM(targetMember.user, dmEmbed)

  // ─── 7) رد ───
  const embed = buildSuccessEmbed({
    title: "🔊 تم فك كتم العضو",
    target: targetMember.user,
    executor: message.author,
    reason: finalReason,
  }).setColor(0x22c55e)

  const reply = await replyToMessage(message, { embeds: [embed] })

  return { success: true, replyMessage: reply }
}

module.exports = { execute }
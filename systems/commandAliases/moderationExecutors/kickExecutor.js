/**
 * ═══════════════════════════════════════════════════════════
 *  Kick Executor
 *
 *  ينفذ طرد عضو من رسالة نصية:
 *  - #طرد @user                  → طرد
 *  - #طرد @user مزعج جداً        → طرد + سبب
 *
 *  ملاحظة: الـ kick ما يحتاج duration — العضو يقدر يرجع
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

  // ─── 1) فحص الصلاحيات ───
  const permCheck = validatePermissions(message.member, PermissionFlagsBits.KickMembers)
  if (!permCheck.ok) {
    const reply = await replyToMessage(message, { embeds: [buildErrorEmbed(permCheck.error)] })
    return { success: false, replyMessage: reply }
  }

  // ─── 2) جلب الـ member ───
  const targetMember = await resolveMember(message.guild, userId)
  if (!targetMember) {
    const reply = await replyToMessage(message, {
      embeds: [buildErrorEmbed("❌ هذا العضو مو في السيرفر")],
    })
    return { success: false, replyMessage: reply }
  }

  // ─── 3) التحقق ───
  const validation = validateModerationTarget(message.member, targetMember, "طرد")
  if (!validation.ok) {
    const reply = await replyToMessage(message, {
      embeds: [buildErrorEmbed(validation.error)],
    })
    return { success: false, replyMessage: reply }
  }

  if (!targetMember.kickable) {
    const reply = await replyToMessage(message, {
      embeds: [buildErrorEmbed("❌ البوت ما يقدر يطرد هذا العضو")],
    })
    return { success: false, replyMessage: reply }
  }

  const finalReason = reason || "لم يتم تحديد سبب"
  const auditReason = `${finalReason} | بواسطة: ${message.author.username}`

  // ─── 4) DM قبل الطرد ───
  const dmEmbed = buildSuccessEmbed({
    title: "👢 تم طردك",
    target: null,
    executor: null,
    reason: finalReason,
    extraFields: [
      { name: "🏠 السيرفر", value: message.guild.name, inline: true },
      { name: "ℹ️ ملاحظة", value: "تقدر ترجع للسيرفر برابط دعوة جديد", inline: false },
    ],
  }).setColor(0xf59e0b)

  await trySendDM(targetMember.user, dmEmbed)

  // ─── 5) تنفيذ ───
  try {
    await targetMember.kick(auditReason)
  } catch (err) {
    logger.error("ALIAS_KICK_FAILED", {
      guildId: message.guild.id,
      userId,
      error: err.message,
    })
    const reply = await replyToMessage(message, {
      embeds: [buildErrorEmbed(`❌ فشل الطرد: ${err.message}`)],
    })
    return { success: false, replyMessage: reply }
  }

  // ─── 6) رد ───
  const embed = buildSuccessEmbed({
    title: "👢 تم طرد العضو",
    target: targetMember.user,
    executor: message.author,
    reason: finalReason,
  }).setColor(0xf59e0b)

  const reply = await replyToMessage(message, { embeds: [embed] })

  return { success: true, replyMessage: reply }
}

module.exports = { execute }
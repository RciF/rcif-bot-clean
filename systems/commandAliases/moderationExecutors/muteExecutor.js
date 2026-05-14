/**
 * ═══════════════════════════════════════════════════════════
 *  Mute Executor (Timeout)
 *
 *  - #اسكت @user                → كتم بالوقت الافتراضي
 *  - #اسكت @user 30m             → كتم 30 دقيقة
 *  - #اسكت @user 30m مزعج        → كتم + سبب
 *
 *  لو ما فيه duration ولا default → نستخدم 10 دقائق
 *  الحد الأقصى = 28 يوم (Discord limit)
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
  MAX_TIMEOUT_MS,
  MIN_TIMEOUT_MS,
} = require("./_shared")
const { timeParser } = require("../argParsers")
const logger = require("../../loggerSystem")

const DEFAULT_MUTE_MS = 10 * 60 * 1000 // 10 minutes

async function execute(message, parsedArgs, defaults = {}) {
  const { userId, duration, reason } = parsedArgs

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
  const validation = validateModerationTarget(message.member, targetMember, "كتم")
  if (!validation.ok) {
    const reply = await replyToMessage(message, {
      embeds: [buildErrorEmbed(validation.error)],
    })
    return { success: false, replyMessage: reply }
  }

  if (!targetMember.moderatable) {
    const reply = await replyToMessage(message, {
      embeds: [buildErrorEmbed("❌ البوت ما يقدر يكتم هذا العضو")],
    })
    return { success: false, replyMessage: reply }
  }

  // ─── 4) لو مكتوم بالفعل ───
  if (targetMember.isCommunicationDisabled()) {
    const until = Math.floor(targetMember.communicationDisabledUntil.getTime() / 1000)
    const reply = await replyToMessage(message, {
      embeds: [
        buildErrorEmbed(`⚠️ هذا العضو مكتوم بالفعل\n⏰ ينتهي الكتم: <t:${until}:R>`),
      ],
    })
    return { success: false, replyMessage: reply }
  }

  // ─── 5) المدة ───
  let durationMs

  if (duration?.ms) {
    durationMs = duration.ms
  } else if (defaults.default_duration) {
    const parsedDefault = timeParser.parseTime(defaults.default_duration)
    durationMs = parsedDefault?.ms || DEFAULT_MUTE_MS
  } else {
    durationMs = DEFAULT_MUTE_MS
  }

  // ─── 6) فحص الحدود ───
  if (durationMs < MIN_TIMEOUT_MS) {
    const reply = await replyToMessage(message, {
      embeds: [buildErrorEmbed("❌ الحد الأدنى للكتم هو ثانية واحدة")],
    })
    return { success: false, replyMessage: reply }
  }

  if (durationMs > MAX_TIMEOUT_MS) {
    const reply = await replyToMessage(message, {
      embeds: [buildErrorEmbed("❌ الحد الأقصى للكتم هو 28 يوم (قيد من Discord)")],
    })
    return { success: false, replyMessage: reply }
  }

  const finalReason = reason || "لم يتم تحديد سبب"
  const auditReason = `${finalReason} | بواسطة: ${message.author.username}`
  const durationText = timeParser.formatDuration(durationMs)
  const expiresAt = Math.floor((Date.now() + durationMs) / 1000)

  // ─── 7) DM قبل الكتم ───
  const dmEmbed = buildSuccessEmbed({
    title: "🔇 تم كتمك",
    target: null,
    executor: null,
    reason: finalReason,
    duration: durationText,
    extraFields: [
      { name: "🏠 السيرفر", value: message.guild.name, inline: true },
      { name: "⏰ ينتهي", value: `<t:${expiresAt}:R>`, inline: true },
    ],
  }).setColor(0xf59e0b)

  await trySendDM(targetMember.user, dmEmbed)

  // ─── 8) تنفيذ ───
  try {
    await targetMember.timeout(durationMs, auditReason)
  } catch (err) {
    logger.error("ALIAS_MUTE_FAILED", {
      guildId: message.guild.id,
      userId,
      error: err.message,
    })
    const reply = await replyToMessage(message, {
      embeds: [buildErrorEmbed(`❌ فشل الكتم: ${err.message}`)],
    })
    return { success: false, replyMessage: reply }
  }

  // ─── 9) DB log ───
  try {
    const moderationLogger = require("../../../utils/moderationLogger")
    if (moderationLogger?.recordMute) {
      await moderationLogger.recordMute({
        guildId: message.guild.id,
        userId,
        executorId: message.author.id,
        reason: finalReason,
        unmuteAt: new Date(Date.now() + durationMs),
      })
    }
  } catch (err) {
    logger.warn("MUTE_LOG_FAILED", { error: err.message })
  }

  // ─── 10) رد ───
  const embed = buildSuccessEmbed({
    title: "🔇 تم كتم العضو",
    target: targetMember.user,
    executor: message.author,
    reason: finalReason,
    duration: durationText,
    extraFields: [
      { name: "⏰ ينتهي", value: `<t:${expiresAt}:R>`, inline: true },
    ],
  }).setColor(0xf59e0b)

  const reply = await replyToMessage(message, { embeds: [embed] })

  return { success: true, replyMessage: reply }
}

module.exports = { execute }
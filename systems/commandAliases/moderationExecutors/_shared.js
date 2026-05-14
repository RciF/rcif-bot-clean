/**
 * ═══════════════════════════════════════════════════════════
 *  Moderation Executors — Shared Helpers
 *
 *  يحتوي على:
 *  - validation للأعضاء (rank check, bot check, owner check)
 *  - embed builders موحدة
 *  - constants (max timeout, colors)
 * ═══════════════════════════════════════════════════════════
 */

const { EmbedBuilder, PermissionFlagsBits } = require("discord.js")

// ════════════════════════════════════════════════════════════
//  Constants
// ════════════════════════════════════════════════════════════

const MAX_TIMEOUT_MS = 28 * 24 * 60 * 60 * 1000 // 28 days (Discord limit)
const MIN_TIMEOUT_MS = 1000 // 1 second

const COLORS = {
  success: 0x22c55e,
  danger: 0xef4444,
  warning: 0xf59e0b,
  info: 0x3b82f6,
  neutral: 0x64748b,
}

// ════════════════════════════════════════════════════════════
//  resolveMember
//
//  يجيب member من ID مع تحويل من user → member
// ════════════════════════════════════════════════════════════

async function resolveMember(guild, userId) {
  if (!guild || !userId) return null

  try {
    const member = await guild.members.fetch(userId)
    return member
  } catch {
    return null
  }
}

// ════════════════════════════════════════════════════════════
//  resolveUser
//
//  يجيب user حتى لو مو في السيرفر (مفيد لـ unban)
// ════════════════════════════════════════════════════════════

async function resolveUser(client, userId) {
  if (!client || !userId) return null

  try {
    const user = await client.users.fetch(userId)
    return user
  } catch {
    return null
  }
}

// ════════════════════════════════════════════════════════════
//  validateModerationTarget
//
//  يفحص إن العضو قابل للإشراف:
//  - مو نفسه (المشرف ما يشرف نفسه)
//  - مو البوت
//  - مو المالك
//  - رتبة المشرف أعلى من رتبة الهدف
//  - رتبة البوت أعلى من رتبة الهدف
//
//  Returns: { ok: true } | { ok: false, error: "..." }
// ════════════════════════════════════════════════════════════

function validateModerationTarget(executor, targetMember, action = "إجراء") {
  if (!executor || !targetMember) {
    return { ok: false, error: "❌ ما قدرت أجد العضو" }
  }

  // مو نفسه
  if (executor.id === targetMember.id) {
    return { ok: false, error: `❌ ما تقدر ت${action} نفسك` }
  }

  // مو البوت
  const client = targetMember.client
  if (targetMember.id === client.user.id) {
    return { ok: false, error: `❌ ما تقدر ت${action} البوت` }
  }

  // مو مالك السيرفر
  if (targetMember.id === targetMember.guild.ownerId) {
    return { ok: false, error: `❌ ما تقدر ت${action} مالك السيرفر` }
  }

  // المشرف لازم رتبته أعلى من الهدف (إلا لو هو المالك)
  if (executor.id !== executor.guild.ownerId) {
    if (executor.roles.highest.position <= targetMember.roles.highest.position) {
      return {
        ok: false,
        error: `❌ ما تقدر ت${action} عضو رتبته أعلى منك أو تساويك`,
      }
    }
  }

  // البوت لازم رتبته أعلى من الهدف
  if (!targetMember.moderatable && !targetMember.bannable && !targetMember.kickable) {
    return {
      ok: false,
      error: `❌ البوت ما يقدر ي${action} هذا العضو. تأكد إن رتبة البوت أعلى منه`,
    }
  }

  return { ok: true }
}

// ════════════════════════════════════════════════════════════
//  validatePermissions
//
//  يفحص إن المشرف عنده الصلاحية المطلوبة
// ════════════════════════════════════════════════════════════

function validatePermissions(executor, permission) {
  if (!executor || !executor.permissions) {
    return { ok: false, error: "❌ ما قدرت أتحقق من الصلاحيات" }
  }

  if (executor.id === executor.guild.ownerId) {
    return { ok: true }
  }

  if (!executor.permissions.has(permission)) {
    return { ok: false, error: "❌ ما عندك الصلاحية لاستخدام هذا الأمر" }
  }

  return { ok: true }
}

// ════════════════════════════════════════════════════════════
//  Embed builders
// ════════════════════════════════════════════════════════════

function buildSuccessEmbed({ title, target, executor, reason, duration, extraFields = [] }) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.success)
    .setTitle(title)
    .setTimestamp()

  if (target?.displayAvatarURL) {
    embed.setThumbnail(target.displayAvatarURL({ dynamic: true, size: 128 }))
  }

  const fields = []

  if (target) {
    fields.push({
      name: "👤 العضو",
      value: `<@${target.id}> (\`${target.username || target.tag || target.id}\`)`,
      inline: true,
    })
  }

  if (duration) {
    fields.push({
      name: "⏱ المدة",
      value: duration,
      inline: true,
    })
  }

  if (reason) {
    fields.push({
      name: "📝 السبب",
      value: reason.slice(0, 1024),
      inline: false,
    })
  }

  if (executor) {
    fields.push({
      name: "👮 بواسطة",
      value: `<@${executor.id}>`,
      inline: true,
    })
  }

  fields.push(...extraFields)

  embed.addFields(fields)

  if (target?.id) {
    embed.setFooter({ text: `الآيدي: ${target.id}` })
  }

  return embed
}

function buildErrorEmbed(message) {
  return new EmbedBuilder()
    .setColor(COLORS.danger)
    .setDescription(message)
}

// ════════════════════════════════════════════════════════════
//  trySendDM
//
//  يحاول يرسل DM للعضو — يرجع true لو نجح، false لو فشل
// ════════════════════════════════════════════════════════════

async function trySendDM(user, embed) {
  if (!user || typeof user.send !== "function") return false

  try {
    await user.send({ embeds: [embed] })
    return true
  } catch {
    return false
  }
}

// ════════════════════════════════════════════════════════════
//  replyToMessage
//
//  يرد على رسالة مع تنظيف الأخطاء
// ════════════════════════════════════════════════════════════

async function replyToMessage(message, payload) {
  if (!message) return null

  const cleanPayload = typeof payload === "string"
    ? { content: payload }
    : { ...payload }

  // إزالة ephemeral (مو متاحة في الرسائل العادية)
  delete cleanPayload.ephemeral
  delete cleanPayload.flags

  try {
    return await message.channel.send({
      ...cleanPayload,
      reply: { messageReference: message.id, failIfNotExists: false },
      allowedMentions: { repliedUser: false },
    })
  } catch (err) {
    // لو فشل الرد، نحاول send بدون reference
    try {
      return await message.channel.send(cleanPayload)
    } catch {
      return null
    }
  }
}

module.exports = {
  MAX_TIMEOUT_MS,
  MIN_TIMEOUT_MS,
  COLORS,
  PermissionFlagsBits,

  resolveMember,
  resolveUser,
  validateModerationTarget,
  validatePermissions,
  buildSuccessEmbed,
  buildErrorEmbed,
  trySendDM,
  replyToMessage,
}
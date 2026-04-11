// systems/discordLogSystem.js
const { EmbedBuilder } = require("discord.js")
const databaseSystem = require("./databaseSystem")
const logger = require("./loggerSystem")

// ══════════════════════════════════════
// COLORS per action
// ══════════════════════════════════════
const COLORS = {
  BAN:           0xef4444, // أحمر
  UNBAN:         0x22c55e, // أخضر
  KICK:          0xf97316, // برتقالي
  MUTE:          0x8b5cf6, // بنفسجي
  UNMUTE:        0xa3e635, // أخضر فاتح
  WARN:          0xf59e0b, // أصفر
  CLEAR:         0x6366f1, // بنفسجي-أزرق
  LOCK:          0xef4444, // أحمر
  UNLOCK:        0x22c55e, // أخضر
  ROLE_ADD:      0x0ea5e9, // أزرق
  ROLE_REMOVE:   0x94a3b8, // رمادي
  NICKNAME:      0xfbbf24, // ذهبي
  SLOWMODE:      0x64748b, // رمادي داكن
  TICKET_OPEN:   0x22d3ee, // سماوي
  TICKET_CLOSE:  0xf87171, // أحمر فاتح
  TICKET_CLAIM:  0x4ade80, // أخضر
  TICKET_DELETE: 0xdc2626, // أحمر داكن
}

// ══════════════════════════════════════
// جلب قناة اللوق
// ══════════════════════════════════════
async function getLogChannel(guild) {
  try {
    const result = await databaseSystem.query(
      "SELECT log_channel_id FROM guilds WHERE id = $1",
      [guild.id]
    )
    const channelId = result?.rows?.[0]?.log_channel_id
    if (!channelId) return null

    const channel = guild.channels.cache.get(channelId)
    if (!channel) return null

    return channel
  } catch (err) {
    logger.error("LOG_GET_CHANNEL_FAILED", { error: err.message })
    return null
  }
}

// ══════════════════════════════════════
// الدالة الرئيسية للإرسال
// ══════════════════════════════════════
async function sendLog(guild, embedData) {
  try {
    const channel = await getLogChannel(guild)
    if (!channel) return

    const embed = new EmbedBuilder()
      .setColor(embedData.color)
      .setTitle(embedData.title)
      .setTimestamp()

    if (embedData.description) embed.setDescription(embedData.description)
    if (embedData.thumbnail)   embed.setThumbnail(embedData.thumbnail)
    if (embedData.fields)      embed.addFields(embedData.fields)
    if (embedData.footer)      embed.setFooter({ text: embedData.footer })

    await channel.send({ embeds: [embed] })

  } catch (err) {
    logger.error("LOG_SEND_FAILED", { error: err.message })
  }
}

// ══════════════════════════════════════
// BAN
// ══════════════════════════════════════
async function logBan(guild, { moderator, target, reason, deleteMessages }) {
  await sendLog(guild, {
    color: COLORS.BAN,
    title: "🔨 تم حظر عضو",
    thumbnail: target.displayAvatarURL?.({ dynamic: true }) || target.defaultAvatarURL,
    fields: [
      { name: "👤 العضو",       value: `${target} (\`${target.username}\`)`,       inline: true  },
      { name: "🆔 ID",          value: `\`${target.id}\``,                          inline: true  },
      { name: "👮 المشرف",      value: `${moderator} (\`${moderator.username}\`)`, inline: false },
      { name: "📝 السبب",       value: reason,                                      inline: false },
      { name: "🗑 حذف الرسائل", value: deleteMessages || "لا",                     inline: true  },
    ],
    footer: `حظر | ${target.id}`
  })
}

// ══════════════════════════════════════
// KICK
// ══════════════════════════════════════
async function logKick(guild, { moderator, target, reason }) {
  await sendLog(guild, {
    color: COLORS.KICK,
    title: "👢 تم طرد عضو",
    thumbnail: target.displayAvatarURL?.({ dynamic: true }) || target.defaultAvatarURL,
    fields: [
      { name: "👤 العضو",  value: `${target} (\`${target.username}\`)`,       inline: true  },
      { name: "🆔 ID",     value: `\`${target.id}\``,                          inline: true  },
      { name: "👮 المشرف", value: `${moderator} (\`${moderator.username}\`)`, inline: false },
      { name: "📝 السبب",  value: reason,                                      inline: false },
    ],
    footer: `طرد | ${target.id}`
  })
}

// ══════════════════════════════════════
// MUTE
// ══════════════════════════════════════
async function logMute(guild, { moderator, target, reason, duration }) {
  await sendLog(guild, {
    color: COLORS.MUTE,
    title: "🔇 تم كتم عضو",
    thumbnail: target.displayAvatarURL?.({ dynamic: true }) || target.defaultAvatarURL,
    fields: [
      { name: "👤 العضو",  value: `${target} (\`${target.username}\`)`,       inline: true  },
      { name: "🆔 ID",     value: `\`${target.id}\``,                          inline: true  },
      { name: "⏱ المدة",   value: duration || "غير محدد",                     inline: true  },
      { name: "👮 المشرف", value: `${moderator} (\`${moderator.username}\`)`, inline: false },
      { name: "📝 السبب",  value: reason,                                      inline: false },
    ],
    footer: `كتم | ${target.id}`
  })
}

// ══════════════════════════════════════
// UNMUTE
// ══════════════════════════════════════
async function logUnmute(guild, { moderator, target, reason }) {
  await sendLog(guild, {
    color: COLORS.UNMUTE,
    title: "🔊 تم فك كتم عضو",
    thumbnail: target.displayAvatarURL?.({ dynamic: true }) || target.defaultAvatarURL,
    fields: [
      { name: "👤 العضو",  value: `${target} (\`${target.username}\`)`,       inline: true  },
      { name: "🆔 ID",     value: `\`${target.id}\``,                          inline: true  },
      { name: "👮 المشرف", value: `${moderator} (\`${moderator.username}\`)`, inline: false },
      { name: "📝 السبب",  value: reason,                                      inline: false },
    ],
    footer: `فك كتم | ${target.id}`
  })
}

// ══════════════════════════════════════
// WARN
// ══════════════════════════════════════
async function logWarn(guild, { moderator, target, reason, totalWarnings }) {
  await sendLog(guild, {
    color: COLORS.WARN,
    title: "⚠️ تم تحذير عضو",
    thumbnail: target.displayAvatarURL?.({ dynamic: true }) || target.defaultAvatarURL,
    fields: [
      { name: "👤 العضو",         value: `${target} (\`${target.username}\`)`,       inline: true  },
      { name: "🆔 ID",            value: `\`${target.id}\``,                          inline: true  },
      { name: "📊 إجمالي التحذيرات", value: `${totalWarnings}`,                      inline: true  },
      { name: "👮 المشرف",        value: `${moderator} (\`${moderator.username}\`)`, inline: false },
      { name: "📝 السبب",         value: reason,                                      inline: false },
    ],
    footer: `تحذير | ${target.id}`
  })
}

// ══════════════════════════════════════
// CLEAR
// ══════════════════════════════════════
async function logClear(guild, { moderator, channel, count, filter }) {
  await sendLog(guild, {
    color: COLORS.CLEAR,
    title: "🗑 تم مسح رسائل",
    fields: [
      { name: "📢 القناة",   value: `${channel}`,                               inline: true  },
      { name: "🔢 العدد",    value: `${count} رسالة`,                           inline: true  },
      { name: "🔍 الفلتر",   value: filter || "بدون فلتر",                     inline: true  },
      { name: "👮 المشرف",   value: `${moderator} (\`${moderator.username}\`)`, inline: false },
    ],
    footer: `مسح | ${channel.id}`
  })
}

// ══════════════════════════════════════
// LOCK / UNLOCK
// ══════════════════════════════════════
async function logLock(guild, { moderator, channel, reason }) {
  await sendLog(guild, {
    color: COLORS.LOCK,
    title: "🔒 تم قفل قناة",
    fields: [
      { name: "📢 القناة",  value: `${channel}`,                               inline: true  },
      { name: "👮 المشرف",  value: `${moderator} (\`${moderator.username}\`)`, inline: false },
      { name: "📝 السبب",   value: reason || "لم يتم تحديد سبب",              inline: false },
    ],
    footer: `قفل | ${channel.id}`
  })
}

async function logUnlock(guild, { moderator, channel, reason }) {
  await sendLog(guild, {
    color: COLORS.UNLOCK,
    title: "🔓 تم فتح قناة",
    fields: [
      { name: "📢 القناة",  value: `${channel}`,                               inline: true  },
      { name: "👮 المشرف",  value: `${moderator} (\`${moderator.username}\`)`, inline: false },
      { name: "📝 السبب",   value: reason || "لم يتم تحديد سبب",              inline: false },
    ],
    footer: `فتح | ${channel.id}`
  })
}

// ══════════════════════════════════════
// ROLE ADD / REMOVE
// ══════════════════════════════════════
async function logRoleAdd(guild, { moderator, target, role }) {
  await sendLog(guild, {
    color: COLORS.ROLE_ADD,
    title: "✅ تم إعطاء رتبة",
    thumbnail: target.displayAvatarURL?.({ dynamic: true }) || target.defaultAvatarURL,
    fields: [
      { name: "👤 العضو",  value: `${target} (\`${target.username}\`)`,       inline: true  },
      { name: "🏷 الرتبة",  value: `${role}`,                                  inline: true  },
      { name: "👮 المشرف", value: `${moderator} (\`${moderator.username}\`)`, inline: false },
    ],
    footer: `إعطاء رتبة | ${target.id}`
  })
}

async function logRoleRemove(guild, { moderator, target, role }) {
  await sendLog(guild, {
    color: COLORS.ROLE_REMOVE,
    title: "❌ تم سحب رتبة",
    thumbnail: target.displayAvatarURL?.({ dynamic: true }) || target.defaultAvatarURL,
    fields: [
      { name: "👤 العضو",  value: `${target} (\`${target.username}\`)`,       inline: true  },
      { name: "🏷 الرتبة",  value: `${role}`,                                  inline: true  },
      { name: "👮 المشرف", value: `${moderator} (\`${moderator.username}\`)`, inline: false },
    ],
    footer: `سحب رتبة | ${target.id}`
  })
}

// ══════════════════════════════════════
// NICKNAME
// ══════════════════════════════════════
async function logNickname(guild, { moderator, target, oldNick, newNick }) {
  await sendLog(guild, {
    color: COLORS.NICKNAME,
    title: "✏️ تم تغيير لقب",
    thumbnail: target.displayAvatarURL?.({ dynamic: true }) || target.defaultAvatarURL,
    fields: [
      { name: "👤 العضو",    value: `${target} (\`${target.username}\`)`,       inline: true  },
      { name: "🆔 ID",       value: `\`${target.id}\``,                          inline: true  },
      { name: "📝 القديم",   value: oldNick || "بدون لقب",                      inline: true  },
      { name: "✨ الجديد",   value: newNick || "تم الإزالة",                    inline: true  },
      { name: "👮 المشرف",   value: `${moderator} (\`${moderator.username}\`)`, inline: false },
    ],
    footer: `لقب | ${target.id}`
  })
}

// ══════════════════════════════════════
// SLOWMODE
// ══════════════════════════════════════
async function logSlowmode(guild, { moderator, channel, duration }) {
  await sendLog(guild, {
    color: COLORS.SLOWMODE,
    title: duration === "إيقاف" ? "💨 تم إيقاف السلو مود" : "🐢 تم تفعيل السلو مود",
    fields: [
      { name: "📢 القناة",  value: `${channel}`,                               inline: true  },
      { name: "⏱ المدة",    value: duration,                                   inline: true  },
      { name: "👮 المشرف",  value: `${moderator} (\`${moderator.username}\`)`, inline: false },
    ],
    footer: `سلو مود | ${channel.id}`
  })
}

// ══════════════════════════════════════
// TICKET
// ══════════════════════════════════════
async function logTicketOpen(guild, { user, channel, ticketId }) {
  await sendLog(guild, {
    color: COLORS.TICKET_OPEN,
    title: "🎫 تم فتح تذكرة",
    fields: [
      { name: "👤 المستخدم", value: `${user} (\`${user.username}\`)`, inline: true  },
      { name: "📢 القناة",   value: `${channel}`,                     inline: true  },
      { name: "🆔 التذكرة",  value: `#${ticketId}`,                   inline: true  },
    ],
    footer: `تذكرة | ${user.id}`
  })
}

async function logTicketClose(guild, { moderator, user, channel, ticketId }) {
  await sendLog(guild, {
    color: COLORS.TICKET_CLOSE,
    title: "🔒 تم إغلاق تذكرة",
    fields: [
      { name: "👤 صاحب التذكرة", value: `${user} (\`${user.username}\`)`,           inline: true  },
      { name: "📢 القناة",        value: `\`${channel}\``,                           inline: true  },
      { name: "🆔 التذكرة",       value: `#${ticketId}`,                             inline: true  },
      { name: "👮 أُغلقت بواسطة", value: `${moderator} (\`${moderator.username}\`)`, inline: false },
    ],
    footer: `إغلاق تذكرة | ${ticketId}`
  })
}

async function logTicketClaim(guild, { moderator, channel, ticketId }) {
  await sendLog(guild, {
    color: COLORS.TICKET_CLAIM,
    title: "🙋 تم استلام تذكرة",
    fields: [
      { name: "📢 القناة",   value: `\`${channel}\``,                               inline: true  },
      { name: "🆔 التذكرة",  value: `#${ticketId}`,                                 inline: true  },
      { name: "👮 المستلم",  value: `${moderator} (\`${moderator.username}\`)`,     inline: false },
    ],
    footer: `استلام تذكرة | ${ticketId}`
  })
}

async function logTicketDelete(guild, { moderator, ticketId, userName }) {
  await sendLog(guild, {
    color: COLORS.TICKET_DELETE,
    title: "🗑 تم حذف تذكرة",
    fields: [
      { name: "🆔 التذكرة",      value: `#${ticketId}`,                               inline: true  },
      { name: "👤 صاحبها",       value: userName || "غير معروف",                     inline: true  },
      { name: "👮 حُذفت بواسطة", value: `${moderator} (\`${moderator.username}\`)`, inline: false },
    ],
    footer: `حذف تذكرة | ${ticketId}`
  })
}

module.exports = {
  logBan,
  logKick,
  logMute,
  logUnmute,
  logWarn,
  logClear,
  logLock,
  logUnlock,
  logRoleAdd,
  logRoleRemove,
  logNickname,
  logSlowmode,
  logTicketOpen,
  logTicketClose,
  logTicketClaim,
  logTicketDelete,
}
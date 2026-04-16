const { EmbedBuilder } = require("discord.js")
const databaseManager = require("./databaseManager")
const logger = require("../systems/loggerSystem")

const cache = new Map()
const CACHE_TTL = 60 * 1000

async function getLogSettings(guildId) {
  const cached = cache.get(guildId)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }
  try {
    const result = await databaseManager.query(
      "SELECT * FROM log_settings WHERE guild_id = $1",
      [guildId]
    )
    const data = result.rows[0] || null
    cache.set(guildId, { data, timestamp: Date.now() })
    return data
  } catch (err) {
    logger.error("LOG_SETTINGS_FETCH_FAILED", { error: err.message })
    return null
  }
}

function clearCache(guildId) {
  if (guildId) {
    cache.delete(guildId)
  } else {
    cache.clear()
  }
}

// ✅ FIX: صحح mapping الـ voice events
// المشكلة: الـ keys كانت voice_join/leave/move لكن EVENT_CHANNEL_MAP ما يعرفها
// الحل: توحيد الـ key لـ voice_join/voice_leave/voice_move مع نفس column
const EVENT_CHANNEL_MAP = {
  message_delete:       "message_delete_channel",
  message_update:       "message_update_channel",
  message_delete_bulk:  "message_delete_bulk_channel",
  member_join:          "member_join_channel",
  member_leave:         "member_leave_channel",
  member_ban:           "member_ban_channel",
  member_unban:         "member_unban_channel",
  member_update:        "member_update_channel",
  channel_create:       "channel_create_channel",
  channel_delete:       "channel_delete_channel",
  channel_update:       "channel_update_channel",
  role_create:          "role_create_channel",
  role_delete:          "role_delete_channel",
  role_update:          "role_update_channel",
  // ✅ FIX: كل voice events تستخدم نفس الـ column
  voice_join:           "voice_channel",
  voice_leave:          "voice_channel",
  voice_move:           "voice_channel",
  // ✅ FIX: voice_update كان يُستدعى من الـ event لكن ما كان في الـ map
  voice_update:         "voice_channel",
  guild_update:         "guild_update_channel",
  emoji_create:         "emoji_channel",
  emoji_delete:         "emoji_channel",
  invite_create:        "invite_channel",
  invite_delete:        "invite_channel",
}

const EVENT_TYPES = [
  { key: "message_delete",      column: "message_delete_channel",      label: "حذف الرسائل",      emoji: "🗑️" },
  { key: "message_update",      column: "message_update_channel",      label: "تعديل الرسائل",    emoji: "✏️" },
  { key: "message_delete_bulk", column: "message_delete_bulk_channel", label: "حذف رسائل جماعي", emoji: "🗑️" },
  { key: "member_join",         column: "member_join_channel",         label: "دخول الأعضاء",     emoji: "📥" },
  { key: "member_leave",        column: "member_leave_channel",        label: "خروج الأعضاء",     emoji: "📤" },
  { key: "member_ban",          column: "member_ban_channel",          label: "حظر الأعضاء",      emoji: "🔨" },
  { key: "member_unban",        column: "member_unban_channel",        label: "فك الحظر",         emoji: "🔓" },
  { key: "member_update",       column: "member_update_channel",       label: "تعديل الأعضاء",    emoji: "👤" },
  { key: "channel_create",      column: "channel_create_channel",      label: "إنشاء القنوات",    emoji: "➕" },
  { key: "channel_delete",      column: "channel_delete_channel",      label: "حذف القنوات",      emoji: "➖" },
  { key: "channel_update",      column: "channel_update_channel",      label: "تعديل القنوات",    emoji: "✏️" },
  { key: "role_create",         column: "role_create_channel",         label: "إنشاء الأدوار",    emoji: "🏷️" },
  { key: "role_delete",         column: "role_delete_channel",         label: "حذف الأدوار",      emoji: "🗑️" },
  { key: "role_update",         column: "role_update_channel",         label: "تعديل الأدوار",    emoji: "✏️" },
  // ✅ FIX: توحيد voice تحت key واحد في الـ UI
  { key: "voice_join",          column: "voice_channel",               label: "قنوات الصوت",      emoji: "🔊" },
  { key: "guild_update",        column: "guild_update_channel",        label: "تعديل السيرفر",    emoji: "⚙️" },
  { key: "emoji_create",        column: "emoji_channel",               label: "الإيموجي",         emoji: "😀" },
  { key: "invite_create",       column: "invite_channel",              label: "الدعوات",          emoji: "🔗" },
]

const LOG_COLORS = {
  delete:  0xe74c3c,
  update:  0xe67e22,
  join:    0x2ecc71,
  leave:   0xe74c3c,
  ban:     0xc0392b,
  unban:   0x27ae60,
  create:  0x3498db,
  role:    0x9b59b6,
  member:  0xf39c12,
  voice:   0x1abc9c,
  server:  0x95a5a6,
  emoji:   0xf1c40f,
  invite:  0x2980b9,
}

async function sendLog(client, guildId, eventType, options = {}) {
  try {
    const settings = await getLogSettings(guildId)

    if (!settings || !settings.enabled) return

    const channelColumn = EVENT_CHANNEL_MAP[eventType]
    if (!channelColumn) return

    const channelId = settings[channelColumn]
    if (!channelId) return

    const guild = client.guilds.cache.get(guildId)
    if (!guild) return

    const channel = guild.channels.cache.get(channelId)
    if (!channel) return

    const permissions = channel.permissionsFor(guild.members.me)
    if (!permissions || !permissions.has(["ViewChannel", "SendMessages", "EmbedLinks"])) return

    const embed = new EmbedBuilder()
      .setTitle(options.title || "📋 سجل")
      .setColor(options.color || 0x2b2d31)
      .setTimestamp()

    if (options.description) embed.setDescription(options.description)
    if (options.fields && options.fields.length > 0) embed.addFields(options.fields)
    if (options.thumbnail) embed.setThumbnail(options.thumbnail)
    if (options.footer) embed.setFooter({ text: options.footer })

    await channel.send({ embeds: [embed] })

  } catch (err) {
    logger.error("LOG_SEND_FAILED", {
      guildId,
      eventType,
      error: err.message
    })
  }
}

module.exports = {
  sendLog,
  getLogSettings,
  clearCache,
  EVENT_TYPES,
  EVENT_CHANNEL_MAP,
  LOG_COLORS
}
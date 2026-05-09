// ══════════════════════════════════════════════════════════════════
//  LOG SENDER
//  المسار: utils/logSender.js
//
//  يدعم schema مزدوج:
//   1) Flat columns (legacy): message_delete_channel, member_join_channel, ...
//   2) JSONB من الداش: events: { message_delete: {enabled, channel}, ... }
//                      + master_channel + use_single_channel
//
//  أولوية القراءة:
//   - لو use_single_channel = true → master_channel للجميع
//   - وإلا → events[key].channel من JSONB لو موجودة وenabled
//   - وإلا → العمود الـ flat
//   - fallback: master_channel
// ══════════════════════════════════════════════════════════════════

const { EmbedBuilder } = require("discord.js")
const databaseManager = require("./databaseManager")
const logger = require("../systems/loggerSystem")

const cache = new Map()
const CACHE_TTL = 60 * 1000

// ══════════════════════════════════════
//  JSON parser
// ══════════════════════════════════════

function parseJsonObject(raw) {
  if (!raw) return {}
  if (typeof raw === "object" && !Array.isArray(raw)) return raw
  if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw)
      return (p && typeof p === "object" && !Array.isArray(p)) ? p : {}
    } catch { return {} }
  }
  return {}
}

// ══════════════════════════════════════
//  Settings loader
// ══════════════════════════════════════

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
    const row = result.rows[0] || null
    let data = row
    if (data) {
      // normalize: events JSONB → object
      data = { ...data, events: parseJsonObject(data.events) }
    }
    cache.set(guildId, { data, timestamp: Date.now() })
    return data
  } catch (err) {
    logger.error("LOG_SETTINGS_FETCH_FAILED", { error: err.message })
    return null
  }
}

function clearCache(guildId) {
  if (guildId) cache.delete(guildId)
  else cache.clear()
}

// ══════════════════════════════════════
//  EVENT MAPS
// ══════════════════════════════════════

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
  voice_join:           "voice_channel",
  voice_leave:          "voice_channel",
  voice_move:           "voice_channel",
  voice_update:         "voice_channel",
  guild_update:         "guild_update_channel",
  emoji_create:         "emoji_channel",
  emoji_delete:         "emoji_channel",
  invite_create:        "invite_channel",
  invite_delete:        "invite_channel",
  event_create:         "event_channel",
  event_cancel:         "event_channel",
  event_start:          "event_channel",
  event_end:            "event_channel",
}

const EVENT_TYPES = [
  { key: "message_delete",      column: "message_delete_channel",      label: "حذف الرسائل",        emoji: "🗑️" },
  { key: "message_update",      column: "message_update_channel",      label: "تعديل الرسائل",      emoji: "✏️" },
  { key: "message_delete_bulk", column: "message_delete_bulk_channel", label: "حذف رسائل جماعي",   emoji: "🗑️" },
  { key: "member_join",         column: "member_join_channel",         label: "دخول الأعضاء",       emoji: "📥" },
  { key: "member_leave",        column: "member_leave_channel",        label: "خروج الأعضاء",       emoji: "📤" },
  { key: "member_ban",          column: "member_ban_channel",          label: "حظر الأعضاء",        emoji: "🔨" },
  { key: "member_unban",        column: "member_unban_channel",        label: "رفع الحظر",          emoji: "✅" },
  { key: "member_update",       column: "member_update_channel",       label: "تحديث الأعضاء",      emoji: "📝" },
  { key: "channel_create",      column: "channel_create_channel",      label: "إنشاء القنوات",      emoji: "➕" },
  { key: "channel_delete",      column: "channel_delete_channel",      label: "حذف القنوات",        emoji: "➖" },
  { key: "channel_update",      column: "channel_update_channel",      label: "تعديل القنوات",      emoji: "🔧" },
  { key: "role_create",         column: "role_create_channel",         label: "إنشاء الأدوار",      emoji: "🏷️" },
  { key: "role_delete",         column: "role_delete_channel",         label: "حذف الأدوار",        emoji: "🗑️" },
  { key: "role_update",         column: "role_update_channel",         label: "تعديل الأدوار",      emoji: "🔧" },
  { key: "voice_join",          column: "voice_channel",               label: "القنوات الصوتية",    emoji: "🔊" },
  { key: "guild_update",        column: "guild_update_channel",        label: "تحديث السيرفر",      emoji: "🏠" },
  { key: "emoji_create",        column: "emoji_channel",               label: "الإيموجي",           emoji: "😀" },
  { key: "invite_create",       column: "invite_channel",              label: "الدعوات",            emoji: "🔗" },
  { key: "event_create",        column: "event_channel",               label: "سجل الفعاليات",      emoji: "📅" },
]

const LOG_COLORS = {
  delete:  0xe74c3c,
  create:  0x2ecc71,
  update:  0x3498db,
  join:    0x2ecc71,
  leave:   0xe67e22,
  ban:     0xe74c3c,
  unban:   0x2ecc71,
  member:  0xf39c12,
  voice:   0x1abc9c,
  server:  0x95a5a6,
  emoji:   0xf1c40f,
  invite:  0x2980b9,
  event:   0x8b5cf6,
}

// ══════════════════════════════════════
//  Channel resolver — حسب الأولوية
// ══════════════════════════════════════

function resolveChannelId(settings, eventType) {
  if (!settings) return null

  // 1) قناة موحدة لكل اللوقات
  if (settings.use_single_channel === true && settings.master_channel) {
    // تحقق إن الحدث مفعّل في events JSONB لو موجود (وإلا اعتبره مفعّل افتراضياً)
    const events = settings.events || {}
    const evCfg = events[eventType]
    if (evCfg && evCfg.enabled === false) return null
    return settings.master_channel
  }

  // 2) JSONB events من الداش
  const events = settings.events || {}
  const evCfg = events[eventType]
  if (evCfg && evCfg.enabled !== false) {
    if (evCfg.channel) return evCfg.channel
    // مفعّل لكن بدون channel → استخدم master_channel كـ fallback
    if (settings.master_channel) return settings.master_channel
  }

  // 3) عمود flat قديم
  const flatColumn = EVENT_CHANNEL_MAP[eventType]
  if (flatColumn && settings[flatColumn]) {
    return settings[flatColumn]
  }

  // 4) لا شيء
  return null
}

// ══════════════════════════════════════
//  Send log
// ══════════════════════════════════════

async function sendLog(client, guildId, eventType, options = {}) {
  try {
    const settings = await getLogSettings(guildId)
    if (!settings || !settings.enabled) return

    const channelId = resolveChannelId(settings, eventType)
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
  resolveChannelId,
  EVENT_TYPES,
  EVENT_CHANNEL_MAP,
  LOG_COLORS
}
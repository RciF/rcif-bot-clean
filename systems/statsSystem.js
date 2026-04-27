// ═══════════════════════════════════════════════════════════
//  STATS SYSTEM — قنوات إحصائيات السيرفر التلقائية
//  الفكرة: قنوات Voice تُعدَّل اسمها تلقائياً كل دقيقة
// ═══════════════════════════════════════════════════════════

const { ChannelType, PermissionFlagsBits } = require("discord.js")
const databaseSystem = require("./databaseSystem")
const logger = require("./loggerSystem")

// ─── كاش لتقليل ضغط API ───
const updateCooldowns = new Map() // guildId -> lastUpdateTimestamp
const UPDATE_INTERVAL = 5 * 60 * 1000 // 5 دقائق بين كل تحديث (Discord limit)

// ─── أنواع الإحصائيات المدعومة ───
const STAT_TYPES = {
  total_members:   { label: "👥 الأعضاء",        format: (v) => `👥 الأعضاء: ${v.toLocaleString("ar-SA")}` },
  online_members:  { label: "🟢 متصل",            format: (v) => `🟢 متصل: ${v.toLocaleString("ar-SA")}` },
  bot_members:     { label: "🤖 البوتات",          format: (v) => `🤖 البوتات: ${v.toLocaleString("ar-SA")}` },
  human_members:   { label: "👤 البشر",            format: (v) => `👤 البشر: ${v.toLocaleString("ar-SA")}` },
  text_channels:   { label: "💬 القنوات النصية",   format: (v) => `💬 نصية: ${v.toLocaleString("ar-SA")}` },
  voice_channels:  { label: "🔊 القنوات الصوتية",  format: (v) => `🔊 صوتية: ${v.toLocaleString("ar-SA")}` },
  total_channels:  { label: "📡 كل القنوات",       format: (v) => `📡 القنوات: ${v.toLocaleString("ar-SA")}` },
  roles_count:     { label: "🏷️ الرتب",           format: (v) => `🏷️ الرتب: ${v.toLocaleString("ar-SA")}` },
  boost_count:     { label: "🚀 البوستات",         format: (v) => `🚀 البوست: ${v.toLocaleString("ar-SA")}` },
  boost_level:     { label: "💜 مستوى البوست",     format: (v) => `💜 المستوى: ${v}` },
}

// ═══════════════════════════════════════════════════════════
//  قاعدة البيانات
// ═══════════════════════════════════════════════════════════

async function getGuildStats(guildId) {
  try {
    const result = await databaseSystem.query(
      "SELECT * FROM stats_channels WHERE guild_id = $1 ORDER BY position ASC",
      [guildId]
    )
    return result.rows || []
  } catch (err) {
    logger.error("STATS_GET_CHANNELS_FAILED", { error: err.message })
    return []
  }
}

async function addStatChannel(guildId, channelId, statType, position = 0) {
  try {
    await databaseSystem.query(`
      INSERT INTO stats_channels (guild_id, channel_id, stat_type, position)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (guild_id, stat_type) DO UPDATE SET
        channel_id = $2,
        position = $4
    `, [guildId, channelId, statType, position])
    return true
  } catch (err) {
    logger.error("STATS_ADD_CHANNEL_FAILED", { error: err.message })
    return false
  }
}

async function removeStatChannel(guildId, statType) {
  try {
    const result = await databaseSystem.query(
      "DELETE FROM stats_channels WHERE guild_id = $1 AND stat_type = $2 RETURNING channel_id",
      [guildId, statType]
    )
    return result.rows[0]?.channel_id || null
  } catch (err) {
    logger.error("STATS_REMOVE_CHANNEL_FAILED", { error: err.message })
    return null
  }
}

async function clearGuildStats(guildId) {
  try {
    const result = await databaseSystem.query(
      "DELETE FROM stats_channels WHERE guild_id = $1 RETURNING channel_id",
      [guildId]
    )
    return result.rows.map(r => r.channel_id)
  } catch (err) {
    logger.error("STATS_CLEAR_FAILED", { error: err.message })
    return []
  }
}

// ═══════════════════════════════════════════════════════════
//  جلب القيم الحقيقية
// ═══════════════════════════════════════════════════════════

async function fetchStatValue(guild, statType) {
  try {
    switch (statType) {
      case "total_members":
        return guild.memberCount

      case "online_members": {
        // نحتاج fetch للـ presences
        await guild.members.fetch()
        return guild.members.cache.filter(m => m.presence?.status === "online").size
      }

      case "bot_members":
        await guild.members.fetch()
        return guild.members.cache.filter(m => m.user.bot).size

      case "human_members":
        await guild.members.fetch()
        return guild.members.cache.filter(m => !m.user.bot).size

      case "text_channels":
        return guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size

      case "voice_channels":
        return guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size

      case "total_channels":
        return guild.channels.cache.size

      case "roles_count":
        return guild.roles.cache.filter(r => r.id !== guild.id).size

      case "boost_count":
        return guild.premiumSubscriptionCount || 0

      case "boost_level":
        return guild.premiumTier || 0

      default:
        return 0
    }
  } catch (err) {
    logger.error("STATS_FETCH_VALUE_FAILED", { error: err.message, statType })
    return 0
  }
}

// ═══════════════════════════════════════════════════════════
//  تحديث قنوات الإحصائيات
// ═══════════════════════════════════════════════════════════

async function updateGuildStatsChannels(guild) {
  if (!guild) return

  // التحقق من الكولداون
  const lastUpdate = updateCooldowns.get(guild.id)
  const now = Date.now()
  if (lastUpdate && now - lastUpdate < UPDATE_INTERVAL) return

  updateCooldowns.set(guild.id, now)

  const statChannels = await getGuildStats(guild.id)
  if (!statChannels.length) return

  for (const stat of statChannels) {
    try {
      const channel = guild.channels.cache.get(stat.channel_id)
      if (!channel) continue

      // تحقق إن البوت يقدر يعدل اسم القناة
      const perms = channel.permissionsFor(guild.members.me)
      if (!perms?.has(PermissionFlagsBits.ManageChannels)) continue

      const value = await fetchStatValue(guild, stat.stat_type)
      const statDef = STAT_TYPES[stat.stat_type]
      if (!statDef) continue

      const newName = statDef.format(value)

      // تجنب تحديث غير ضروري
      if (channel.name === newName) continue

      await channel.setName(newName, "إحصائيات تلقائية")

      // تأخير بين كل قناة (تجنب rate limit)
      await new Promise(r => setTimeout(r, 1500))

    } catch (err) {
      logger.error("STATS_UPDATE_CHANNEL_FAILED", {
        error: err.message,
        guildId: guild.id,
        channelId: stat.channel_id
      })
    }
  }
}

// ═══════════════════════════════════════════════════════════
//  تحديث كل السيرفرات (يُستدعى كل 5 دقائق)
// ═══════════════════════════════════════════════════════════

async function updateAllGuilds(client) {
  for (const [, guild] of client.guilds.cache) {
    try {
      await updateGuildStatsChannels(guild)
      // تأخير بين كل سيرفر
      await new Promise(r => setTimeout(r, 2000))
    } catch (err) {
      logger.error("STATS_UPDATE_ALL_FAILED", { error: err.message, guildId: guild.id })
    }
  }
}
// ═══════════════════════════════════════════════════════════
//  ALIASES — لتوافق أوامر الإحصائيات
// ═══════════════════════════════════════════════════════════

function formatChannelName(statType, value) {
  const statDef = STAT_TYPES[statType]
  if (!statDef) return `📊 ${value}`
  return statDef.format(value)
}
// ═══════════════════════════════════════════════════════════
//  Exports
// ═══════════════════════════════════════════════════════════

module.exports = {
  STAT_TYPES,
  getGuildStats,
  addStatChannel,
  removeStatChannel,
  clearGuildStats,
  fetchStatValue,
  updateGuildStatsChannels,
  updateAllGuilds,

  // ─── Aliases ───
  getChannel:         (guildId, statType) => getGuildStats(guildId).then(rows => rows.find(r => r.stat_type === statType) || null),
  getAllChannels:      getGuildStats,
  saveChannel:        (guildId, channelId, statType) => addStatChannel(guildId, channelId, statType),
  deleteChannel:      removeStatChannel,
  deleteAllChannels:  clearGuildStats,
  calculateStatValue: fetchStatValue,
  formatChannelName,
}
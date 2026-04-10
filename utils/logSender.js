const { EmbedBuilder } = require("discord.js")
const databaseManager = require("./databaseManager")
const logger = require("../systems/loggerSystem")

// cache log settings per guild (refresh every 60s)
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

/**
 * Send a log embed to the guild's log channel
 * @param {import("discord.js").Client} client - Discord client
 * @param {string} guildId - Guild ID
 * @param {string} eventType - Event type key (e.g. "message_delete")
 * @param {object} options - Embed options
 * @param {string} options.title - Embed title
 * @param {string} [options.description] - Embed description
 * @param {number} [options.color] - Embed color
 * @param {Array} [options.fields] - Embed fields
 * @param {string} [options.thumbnail] - Thumbnail URL
 * @param {string} [options.footer] - Footer text
 */
async function sendLog(client, guildId, eventType, options = {}) {
  try {
    const settings = await getLogSettings(guildId)

    // no settings or logs disabled
    if (!settings || !settings.enabled) return
    if (!settings.log_channel_id) return

    // check if this event type is enabled
    if (settings[eventType] === false) return

    const guild = client.guilds.cache.get(guildId)
    if (!guild) return

    const channel = guild.channels.cache.get(settings.log_channel_id)
    if (!channel) return

    // check bot permissions
    const permissions = channel.permissionsFor(guild.members.me)
    if (!permissions || !permissions.has(["ViewChannel", "SendMessages", "EmbedLinks"])) {
      return
    }

    const embed = new EmbedBuilder()
      .setTitle(options.title || "📋 سجل")
      .setColor(options.color || 0x2b2d31)
      .setTimestamp()

    if (options.description) {
      embed.setDescription(options.description)
    }

    if (options.fields && options.fields.length > 0) {
      embed.addFields(options.fields)
    }

    if (options.thumbnail) {
      embed.setThumbnail(options.thumbnail)
    }

    if (options.footer) {
      embed.setFooter({ text: options.footer })
    }

    await channel.send({ embeds: [embed] })
  } catch (err) {
    logger.error("LOG_SEND_FAILED", {
      guildId,
      eventType,
      error: err.message
    })
  }
}

// color presets for different event types
const LOG_COLORS = {
  delete: 0xe74c3c,    // red
  update: 0xe67e22,    // orange
  join: 0x2ecc71,      // green
  leave: 0xe74c3c,     // red
  ban: 0xc0392b,       // dark red
  unban: 0x27ae60,     // dark green
  create: 0x3498db,    // blue
  role: 0x9b59b6,      // purple
  member: 0xf39c12     // yellow
}

module.exports = {
  sendLog,
  getLogSettings,
  clearCache,
  LOG_COLORS
}
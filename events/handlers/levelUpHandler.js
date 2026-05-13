// ══════════════════════════════════════════════════════════════════
//  Level-Up Handler — يبني وي رسل رسالة الترقية
// ══════════════════════════════════════════════════════════════════

const { EmbedBuilder } = require("discord.js")
const logger = require("../../systems/loggerSystem")

function parseJsonField(raw) {
  if (!raw) return null
  if (typeof raw === "object") return raw
  if (typeof raw === "string") {
    try { return JSON.parse(raw) } catch { return null }
  }
  return null
}

function applyLevelUpVariables(text, message, level, oldLevel, xpAdded) {
  if (!text || typeof text !== "string") return text
  return text
    .replace(/\{user\}/g, `<@${message.author.id}>`)
    .replace(/\{username\}/g, message.author.username)
    .replace(/\{server\}/g, message.guild.name)
    .replace(/\{level\}/g, String(level))
    .replace(/\{old_level\}/g, String(oldLevel))
    .replace(/\{xp\}/g, String(xpAdded || 0))
}

async function sendLevelUpMessage(message, result) {
  const settings = result.settings || {}
  const cfg = parseJsonField(settings.level_up_message) || {}

  if (cfg.enabled === false) return

  let targetChannel = message.channel
  const channelId = cfg.channel || settings.levelup_channel_id
  if (channelId) {
    const ch = message.guild.channels.cache.get(channelId)
    if (ch) targetChannel = ch
  }

  const template = (typeof cfg.template === "string" && cfg.template.trim())
    ? cfg.template
    : "🎉 {user} وصل للمستوى **{level}**!"

  const content = applyLevelUpVariables(
    template, message, result.level, result.oldLevel, result.xpAdded
  )

  const embed = new EmbedBuilder()
    .setColor(0x22c55e)
    .setDescription(content)
    .setThumbnail(message.author.displayAvatarURL({ dynamic: true, size: 128 }))
    .setTimestamp()

  if (Array.isArray(result.grantedRoles) && result.grantedRoles.length > 0) {
    const rolesText = result.grantedRoles
      .map(r => `<@&${r.role_id}> (مستوى ${r.level})`)
      .join("\n")
    embed.addFields({
      name: "🎁 رتبة جديدة",
      value: rolesText.slice(0, 1024),
      inline: false
    })
  }

  await targetChannel.send({ embeds: [embed] }).catch(err => {
    logger.error("LEVEL_UP_SEND_FAILED", { error: err.message })
  })
}

module.exports = { sendLevelUpMessage }
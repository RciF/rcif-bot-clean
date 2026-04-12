const { EmbedBuilder } = require("discord.js")
const databaseSystem = require("../../systems/databaseSystem")
const logger = require("../../systems/loggerSystem")

async function getWelcomeSettings(guildId) {
  try {
    return await databaseSystem.queryOne(
      "SELECT * FROM welcome_settings WHERE guild_id = $1",
      [guildId]
    )
  } catch {
    return null
  }
}

module.exports = {
  name: "guildMemberRemove",

  async execute(member, client) {
    try {
      if (!member.guild) return

      const settings = await getWelcomeSettings(member.guild.id)
      if (!settings || !settings.enabled) return
      if (!settings.goodbye_channel_id) return

      const channel = member.guild.channels.cache.get(settings.goodbye_channel_id)
      if (!channel) return

      const embed = new EmbedBuilder()
        .setColor(0xef4444)
        .setTitle("👋 عضو غادر")
        .setDescription(
          settings.goodbye_message
            ? settings.goodbye_message
                .replace("{username}", member.user.username)
                .replace("{server}", member.guild.name)
            : `**${member.user.username}** غادر السيرفر`
        )
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 128 }))
        .addFields(
          { name: "👥 عدد الأعضاء الآن", value: `${member.guild.memberCount}`, inline: true }
        )
        .setTimestamp()

      await channel.send({ embeds: [embed] })

    } catch (err) {
      logger.error("GOODBYE_FAILED", { error: err.message })
    }
  }
}
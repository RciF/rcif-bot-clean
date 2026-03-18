const { SlashCommandBuilder } = require("discord.js")
const metricsSystem = require("../../systems/metricsSystem")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("metrics")
    .setDescription("عرض إحصائيات البوت"),

  async execute(interaction, client) {

    const metrics = metricsSystem.getMetrics()

    const guilds = client.guilds.cache.size
    const users = client.users.cache.size

    await interaction.reply(
      `📊 Guilds: ${guilds}\n👥 Users: ${users}\n⚙ Systems Active`
    )

  },
}
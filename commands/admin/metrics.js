const { SlashCommandBuilder } = require("discord.js")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("metrics")
    .setDescription("عرض إحصائيات البوت"),

  async execute(interaction, client) {
    try {
      const guilds = client.guilds.cache.size
      const users = client.users.cache.size

      await interaction.reply(
        `📊 Guilds: ${guilds}\n👥 Users: ${users}\n⚙ Systems: Active`
      )
    } catch (error) {
      await interaction.reply("❌ حصل خطأ في عرض الإحصائيات")
    }
  },
}
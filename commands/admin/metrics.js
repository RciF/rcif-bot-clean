const { SlashCommandBuilder } = require("discord.js")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("metrics")
    .setDescription("عرض إحصائيات البوت"),

  async execute(interaction) {
    try {
      const client = interaction.client
      const guilds = client.guilds.cache.size
      const users = client.guilds.cache.reduce(
        (acc, g) => acc + (g.memberCount || 0), 0
      )
      const channels = client.channels.cache.size

      await interaction.reply(
        `📊 السيرفرات: ${guilds}\n👥 المستخدمون: ${users}\n📡 القنوات: ${channels}\n⚙ الأنظمة: نشطة`
      )
    } catch (error) {
      console.error("[metrics] Error:", error)
      if (!interaction.replied) {
        await interaction.reply({ content: "❌ حصل خطأ في عرض الإحصائيات", ephemeral: true })
      }
    }
  },
}
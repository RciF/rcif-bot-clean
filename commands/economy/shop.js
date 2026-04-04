const { SlashCommandBuilder, EmbedBuilder } = require("discord.js")
const config = require("../../config")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("shop")
    .setDescription("عرض المتجر"),

  async execute(interaction) {
    try {
      const items = config.shopItems

      let description = ""
      for (const key in items) {
        const item = items[key]
        description += `• ${item.name} — **${item.price}** كوين (\`${key}\`)\n`
      }

      const embed = new EmbedBuilder()
        .setTitle("🛒 المتجر")
        .setDescription(description || "لا يوجد عناصر")
        .setColor(0x00ff99)
        .setFooter({ text: "استخدم /buy واكتب اسم العنصر بالانجليزي" })

      await interaction.reply({ embeds: [embed] })

    } catch (error) {
      console.error("SHOP_COMMAND_ERROR", error)
      if (!interaction.replied) {
        await interaction.reply({ content: "❌ حصل خطأ في المتجر", ephemeral: true })
      }
    }
  }
}
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js")

// 🧠 متجر بسيط (نطوره بعدين)
const SHOP_ITEMS = [
  { id: "potion", name: "🧪 جرعة", price: 50 },
  { id: "sword", name: "⚔️ سيف", price: 150 },
  { id: "shield", name: "🛡️ درع", price: 120 }
]

module.exports = {
  data: new SlashCommandBuilder()
    .setName("shop")
    .setDescription("عرض المتجر"),

  async execute(interaction) {
    try {

      let description = ""

      for (const item of SHOP_ITEMS) {
        description += `• ${item.name} — **${item.price}** كوين\n`
      }

      const embed = new EmbedBuilder()
        .setTitle("🛒 المتجر")
        .setDescription(description || "لا يوجد عناصر")
        .setColor(0x00ff99)

      await interaction.reply({
        embeds: [embed]
      })

    } catch (error) {

      console.error("SHOP_COMMAND_ERROR", error)

      await interaction.reply({
        content: "❌ حصل خطأ في المتجر",
        ephemeral: true
      })

    }
  }
}
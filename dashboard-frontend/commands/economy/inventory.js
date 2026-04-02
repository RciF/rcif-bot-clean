const { SlashCommandBuilder, EmbedBuilder } = require("discord.js")
const inventoryRepository = require("../../repositories/inventoryRepository")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("inventory")
    .setDescription("عرض العناصر التي تملكها"),

  async execute(interaction) {
    try {

      if (!interaction.guild) {
        return interaction.reply({
          content: "❌ هذا الأمر داخل السيرفر فقط",
          ephemeral: true
        })
      }

      const userId = interaction.user.id
      const guildId = interaction.guild.id

      // ❌ احذف optional chaining
      const items = await inventoryRepository.getInventory(userId, guildId)

      if (!items || items.length === 0) {
        return interaction.reply({
          content: "📦 حقيبتك فارغة.",
          ephemeral: true
        })
      }

      const description = items
        .map(item => `• ${item.item_id} × ${item.quantity}`)
        .join("\n")

      const embed = new EmbedBuilder()
        .setTitle("🎒 حقيبتك")
        .setDescription(description)
        .setColor(0x00aeff)

      await interaction.reply({
        embeds: [embed]
      })

    } catch (error) {

      console.error("INVENTORY_COMMAND_ERROR", error)

      await interaction.reply({
        content: "❌ حصل خطأ في عرض الحقيبة",
        ephemeral: true
      })

    }
  }
}
const { SlashCommandBuilder } = require("discord.js")
const economyRepository = require("../../repositories/economyRepository")
const inventoryRepository = require("../../repositories/inventoryRepository")

const shopItems = {
  fishing_rod: { id: "fishing_rod", name: "🎣 صنارة", price: 300 },
  laptop: { id: "laptop", name: "💻 لابتوب", price: 800 },
  car: { id: "car", name: "🚗 سيارة", price: 5000 }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("buy")
    .setDescription("شراء عنصر من المتجر")
    .addStringOption(option =>
      option
        .setName("item")
        .setDescription("اسم العنصر")
        .setRequired(true)
    ),

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
      const itemId = interaction.options.getString("item")

      const item = shopItems[itemId]

      if (!item) {
        return interaction.reply({
          content: "❌ العنصر غير موجود",
          ephemeral: true
        })
      }

      let user = await economyRepository.getUser(userId)
      if (!user) user = await economyRepository.createUser(userId)

      if ((user.coins || 0) < item.price) {
        return interaction.reply({
          content: "❌ ليس لديك كوين كافي",
          ephemeral: true
        })
      }

      // ✅ خصم آمن
      await economyRepository.removeCoins(userId, item.price)

      // ✅ إضافة للانفنتوري
      await inventoryRepository.addItem(userId, guildId, item.id, 1)

      await interaction.reply(
        `🛒 اشتريت **${item.name}** مقابل **${item.price}** كوين`
      )

    } catch (error) {

      console.error("BUY_COMMAND_ERROR", error)

      await interaction.reply({
        content: "❌ حصل خطأ في عملية الشراء",
        ephemeral: true
      })

    }
  }
}
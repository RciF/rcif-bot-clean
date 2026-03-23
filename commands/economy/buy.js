const { SlashCommandBuilder } = require("discord.js")
const database = require("../../systems/databaseSystem")

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

    const client = await database.getClient()

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

      await client.query("BEGIN")

      // ✅ خصم مشروط (يمنع السبام)
      const debit = await client.query(
        `
        UPDATE economy_users
        SET coins = coins - $1
        WHERE user_id = $2 AND coins >= $1
        RETURNING coins;
        `,
        [item.price, userId]
      )

      if (!debit.rows.length) {
        await client.query("ROLLBACK")
        return interaction.reply({
          content: "❌ ليس لديك كوين كافي",
          ephemeral: true
        })
      }

      // ✅ إضافة للانفنتوري
      await client.query(
        `
        INSERT INTO inventory (user_id, guild_id, item_id, quantity)
        VALUES ($1, $2, $3, 1)
        ON CONFLICT (user_id, guild_id, item_id)
        DO UPDATE SET quantity = inventory.quantity + 1;
        `,
        [userId, guildId, item.id]
      )

      await client.query("COMMIT")

      await interaction.reply(
        `🛒 اشتريت **${item.name}** مقابل **${item.price}** كوين`
      )

    } catch (error) {

      await client.query("ROLLBACK")

      console.error("BUY_ERROR", error)

      await interaction.reply({
        content: "❌ حصل خطأ في الشراء",
        ephemeral: true
      })

    } finally {
      client.release()
    }
  }
}
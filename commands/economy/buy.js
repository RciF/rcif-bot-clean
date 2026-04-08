const { SlashCommandBuilder, EmbedBuilder } = require("discord.js")
const database = require("../../systems/databaseSystem")
const config = require("../../config")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("buy")
    .setDescription("شراء عنصر من المتجر")
    .addStringOption(option =>
      option
        .setName("item")
        .setDescription("اسم العنصر")
        .setRequired(true)
        .addChoices(
          ...Object.entries(config.shopItems).map(([key, val]) => ({
            name: `${val.name} — ${val.price} كوين`,
            value: key
          }))
        )
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true })

    try {
      const userId = interaction.user.id
      const guildId = interaction.guild.id
      const itemId = interaction.options.getString("item")
      const item = config.shopItems[itemId]

      if (!item) {
        return await interaction.editReply({ content: "❌ العنصر غير موجود." })
      }

      await database.transaction(async (client) => {
        const debit = await client.query(
          `UPDATE economy_users SET coins = coins - $1 WHERE user_id = $2 AND coins >= $1 RETURNING coins`,
          [item.price, userId]
        )

        if (!debit.rows.length) throw new Error("NO_MONEY")

        await client.query(
          `INSERT INTO inventory (user_id, guild_id, item_id, quantity)
           VALUES ($1, $2, $3, 1)
           ON CONFLICT (user_id, guild_id, item_id)
           DO UPDATE SET quantity = inventory.quantity + 1`,
          [userId, guildId, itemId]
        )
      })

      const embed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle("✅ تم الشراء!")
        .setDescription(`اشتريت **${item.name}** مقابل **${item.price}** كوين`)

      await interaction.editReply({ embeds: [embed] })

    } catch (error) {
      if (error.message === "NO_MONEY") {
        return await interaction.editReply({ content: "❌ ما عندك كوين كافي." })
      }
      console.error("BUY_ERROR", error)
      await interaction.editReply({ content: "❌ حصل خطأ، حاول مرة ثانية." })
    }
  }
}
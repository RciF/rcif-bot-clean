const { SlashCommandBuilder } = require("discord.js")
const database = require("../../systems/databaseSystem")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("transfer")
    .setDescription("تحويل كوين لشخص")
    .addUserOption(option =>
      option.setName("user")
        .setDescription("الشخص الذي تريد التحويل له")
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName("amount")
        .setDescription("عدد الكوين")
        .setRequired(true)
    ),

  async execute(interaction) {

    const client = await database.getClient()

    try {

      const senderId = interaction.user.id
      const targetUser = interaction.options.getUser("user")
      const amount = interaction.options.getInteger("amount")

      if (amount <= 0) {
        return interaction.reply({ content: "❌ مبلغ غير صالح", ephemeral: true })
      }

      if (targetUser.id === senderId) {
        return interaction.reply({ content: "❌ لا يمكنك التحويل لنفسك", ephemeral: true })
      }

      await client.query("BEGIN")

      // ✅ خصم آمن (ما ينقص إلا إذا فيه رصيد)
      const debit = await client.query(
        `
        UPDATE economy_users
        SET coins = coins - $1
        WHERE user_id = $2 AND coins >= $1
        RETURNING coins;
        `,
        [amount, senderId]
      )

      if (!debit.rows.length) {
        await client.query("ROLLBACK")
        return interaction.reply({ content: "❌ ليس لديك كوين كافي", ephemeral: true })
      }

      // ✅ إضافة للمستلم
      await client.query(
        `
        INSERT INTO economy_users (user_id, coins, last_daily, last_work, inventory)
        VALUES ($1, $2, 0, 0, $3)
        ON CONFLICT (user_id)
        DO UPDATE SET coins = economy_users.coins + $2;
        `,
        [targetUser.id, amount, []]
      )

      await client.query("COMMIT")

      await interaction.reply(
        `💸 تم تحويل **${amount}** كوين إلى ${targetUser.username}`
      )

    } catch (error) {

      await client.query("ROLLBACK")

      console.error("TRANSFER_ERROR", error)

      await interaction.reply({
        content: "❌ حصل خطأ في التحويل",
        ephemeral: true
      })

    } finally {
      client.release()
    }
  },
}
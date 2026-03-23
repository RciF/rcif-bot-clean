const { SlashCommandBuilder } = require("discord.js")
const database = require("../../systems/databaseSystem")

const WORK_COOLDOWN = 60 * 60 * 1000 // ساعة

module.exports = {
  data: new SlashCommandBuilder()
    .setName("work")
    .setDescription("العمل لكسب كوين"),

  async execute(interaction) {
    try {

      const userId = interaction.user.id
      const now = Date.now()
      const reward = Math.floor(Math.random() * 50) + 10

      const result = await database.query(
        `
        UPDATE economy_users
        SET coins = coins + $1,
            last_work = $2
        WHERE user_id = $3
        AND ($2 - last_work) >= $4
        RETURNING coins;
        `,
        [reward, now, userId, WORK_COOLDOWN]
      )

      // ❌ cooldown شغال
      if (!result.rows.length) {
        return interaction.reply({
          content: "⏳ انتظر قبل العمل مرة أخرى",
          ephemeral: true
        })
      }

      await interaction.reply(`💼 عملت وكسبت **${reward}** كوين`)

    } catch (error) {

      console.error("WORK_ERROR", error)

      await interaction.reply({
        content: "❌ خطأ",
        ephemeral: true
      })

    }
  },
}
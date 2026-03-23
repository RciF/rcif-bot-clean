const { SlashCommandBuilder } = require("discord.js")
const database = require("../../systems/databaseSystem")

const DAILY_COOLDOWN = 86400000

module.exports = {
  data: new SlashCommandBuilder()
    .setName("daily")
    .setDescription("الحصول على المكافأة اليومية"),

  async execute(interaction) {
    try {

      const userId = interaction.user.id
      const now = Date.now()
      const reward = 100

      const result = await database.query(
        `
        UPDATE economy_users
        SET coins = coins + $1,
            last_daily = $2
        WHERE user_id = $3
        AND ($2 - last_daily) >= $4
        RETURNING coins;
        `,
        [reward, now, userId, DAILY_COOLDOWN]
      )

      if (!result.rows.length) {
        return interaction.reply({
          content: "⏳ انتظر 24 ساعة",
          ephemeral: true
        })
      }

      await interaction.reply(`🎁 استلمت ${reward} كوين!`)

    } catch (error) {

      console.error(error)

      await interaction.reply({
        content: "❌ خطأ",
        ephemeral: true
      })

    }
  }
}
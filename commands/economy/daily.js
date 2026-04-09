const { SlashCommandBuilder, EmbedBuilder } = require("discord.js")
const database = require("../../systems/databaseSystem")
const { DAILY_REWARD, DAILY_COOLDOWN, formatPriceExact } = require("../../config/economyConfig")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("يومي")
    .setDescription("استلم مكافأتك اليومية")
    .setDMPermission(false),

  async execute(interaction) {
    try {
      if (!interaction.guild) {
        return interaction.reply({ content: "❌ هذا الأمر داخل السيرفر فقط", ephemeral: true })
      }

      const userId = interaction.user.id
      const now = Date.now()

      // ✅ جلب أو إنشاء المستخدم
      await database.query(
        `INSERT INTO economy_users (user_id, coins, last_daily, last_work, inventory)
         VALUES ($1, 0, 0, 0, '[]')
         ON CONFLICT (user_id) DO NOTHING`,
        [userId]
      )

      const userResult = await database.query(
        "SELECT * FROM economy_users WHERE user_id = $1",
        [userId]
      )
      const user = userResult.rows[0]

      // ✅ تحقق: الكولداون
      const timeSinceLast = now - (Number(user.last_daily) || 0)

      if (timeSinceLast < DAILY_COOLDOWN) {
        const remaining = DAILY_COOLDOWN - timeSinceLast
        const hours = Math.floor(remaining / (60 * 60 * 1000))
        const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000))
        const seconds = Math.floor((remaining % (60 * 1000)) / 1000)

        const embed = new EmbedBuilder()
          .setColor(0xef4444)
          .setTitle("⏳ المكافأة اليومية غير متاحة")
          .setDescription(`لازم تنتظر قبل ما تقدر تستلم مكافأتك مرة ثانية.`)
          .addFields(
            { name: "⏰ الوقت المتبقي", value: `**${hours}** ساعة و **${minutes}** دقيقة و **${seconds}** ثانية`, inline: false }
          )
          .setFooter({ text: `رصيدك الحالي: ${formatPriceExact(user.coins)} كوين` })
          .setTimestamp()

        return interaction.reply({ embeds: [embed], ephemeral: true })
      }

      // ✅ مكافأة عشوائية (±50% من DAILY_REWARD)
      const bonus = Math.floor(Math.random() * DAILY_REWARD * 0.5)
      const reward = DAILY_REWARD + bonus

      // ✅ تحديث الرصيد
      const result = await database.query(
        `UPDATE economy_users SET coins = coins + $1, last_daily = $2
         WHERE user_id = $3 RETURNING coins`,
        [reward, now, userId]
      )

      const newBalance = result.rows[0]?.coins || 0

      // ✅ Embed النجاح
      const embed = new EmbedBuilder()
        .setColor(0x22c55e)
        .setTitle("🎁 المكافأة اليومية")
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true, size: 128 }))
        .addFields(
          { name: "💰 المكافأة", value: `**+${formatPriceExact(reward)}** كوين`, inline: true },
          { name: "🎲 بونص إضافي", value: `**+${formatPriceExact(bonus)}** كوين`, inline: true },
          { name: "💳 رصيدك الجديد", value: `**${formatPriceExact(newBalance)}** كوين`, inline: true }
        )
        .setFooter({ text: "تقدر تستلم المكافأة كل 24 ساعة" })
        .setTimestamp()

      return interaction.reply({ embeds: [embed] })

    } catch (err) {
      console.error("[DAILY ERROR]", err)

      if (interaction.replied || interaction.deferred) {
        return interaction.followUp({ content: "❌ حدث خطأ في المكافأة اليومية.", ephemeral: true })
      }
      return interaction.reply({ content: "❌ حدث خطأ في المكافأة اليومية.", ephemeral: true })
    }
  },
}
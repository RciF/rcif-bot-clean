const { SlashCommandBuilder, EmbedBuilder } = require("discord.js")
const database = require("../../systems/databaseSystem")
const { ALL_ITEMS, calculateNetWorth, getProgressStage, formatPriceExact, formatPrice } = require("../../config/economyConfig")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("رصيد")
    .setDescription("عرض رصيدك وثروتك وممتلكاتك")
    .setDMPermission(false)
    .addUserOption(option =>
      option
        .setName("العضو")
        .setDescription("عرض رصيد عضو آخر (اختياري)")
        .setRequired(false)
    ),

  async execute(interaction) {
    try {
      if (!interaction.guild) {
        return interaction.reply({ content: "❌ هذا الأمر داخل السيرفر فقط", ephemeral: true })
      }

      const targetUser = interaction.options.getUser("العضو") || interaction.user
      const userId = targetUser.id
      const guildId = interaction.guild.id
 

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
      if (!user) {
        return interaction.reply({ content: "❌ ما قدرت أجلب بيانات المستخدم.", ephemeral: true })
      }

      // ✅ جلب الممتلكات
      const assetsResult = await database.query(
        "SELECT item_id, quantity FROM inventory WHERE user_id = $1 ",
        [userId]
      )
      const playerAssets = assetsResult.rows || []

      // ✅ حساب الثروة والمرحلة
      const netWorth = calculateNetWorth(user.coins, playerAssets)
      const stage = getProgressStage(playerAssets)

      // ✅ عدد الممتلكات
      const totalItems = playerAssets.reduce((sum, a) => sum + (a.quantity || 0), 0)

      // ✅ أغلى ممتلكة
      let topAsset = null
      let topAssetValue = 0
      for (const asset of playerAssets) {
        const def = ALL_ITEMS[asset.item_id]
        if (def && def.price > topAssetValue) {
          topAsset = def
          topAssetValue = def.price
        }
      }

      // ✅ Embed
      const embed = new EmbedBuilder()
        .setColor(0xf59e0b)
        .setTitle(`💰 محفظة ${targetUser.username}`)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 128 }))
        .addFields(
          { name: "💵 الرصيد", value: `**${formatPriceExact(user.coins)}** كوين`, inline: true },
          { name: "💎 صافي الثروة", value: `**${formatPrice(netWorth)}** كوين`, inline: true },
          { name: "📦 الممتلكات", value: `**${totalItems}** عنصر`, inline: true },
          { name: "📊 المرحلة", value: `${stage.emoji} **${stage.stage}** (مستوى ${stage.level})`, inline: false }
        )

      if (topAsset) {
        embed.addFields({
          name: "👑 أغلى ممتلكة",
          value: `${topAsset.emoji} ${topAsset.name} — ${formatPrice(topAsset.price)} كوين`,
          inline: false
        })
      }

      embed.setFooter({ text: `ID: ${targetUser.id}` })
      embed.setTimestamp()

      return interaction.reply({ embeds: [embed] })

    } catch (err) {
      console.error("[BALANCE ERROR]", err)

      if (interaction.replied || interaction.deferred) {
        return interaction.followUp({ content: "❌ حدث خطأ في عرض الرصيد.", ephemeral: true })
      }
      return interaction.reply({ content: "❌ حدث خطأ في عرض الرصيد.", ephemeral: true })
    }
  },
}
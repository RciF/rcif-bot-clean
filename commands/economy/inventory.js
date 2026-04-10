const { SlashCommandBuilder, EmbedBuilder } = require("discord.js")
const database = require("../../systems/databaseSystem")
const { ALL_ITEMS, CATEGORIES, CAR_CATEGORIES, HOUSE_TYPES, calculateNetWorth, getProgressStage, formatPriceExact, formatPrice, checkWorldDomination } = require("../../config/economyConfig")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ممتلكاتي")
    .setDescription("عرض جميع ممتلكاتك (سيارات، عقارات، بنية تحتية)")
    .setDMPermission(false)
    .addUserOption(option =>
      option
        .setName("العضو")
        .setDescription("عرض ممتلكات عضو آخر (اختياري)")
        .setRequired(false)
    ),

  async execute(interaction) {
    try {
      if (!interaction.guild) {
        return interaction.reply({ content: "❌ هذا الأمر داخل السيرفر فقط", ephemeral: true })
      }

      const targetUser = interaction.options.getUser("العضو") || interaction.user
      const userId = targetUser.id
      

      // ✅ جلب الممتلكات
      const assetsResult = await database.query(
        "SELECT item_id, quantity FROM inventory WHERE user_id = $1  AND quantity > 0",
        [userId]
      )
      const playerAssets = assetsResult.rows || []

      // ✅ جلب الرصيد
      await database.query(
        `INSERT INTO economy_users (user_id, coins, last_daily, last_work, inventory)
         VALUES ($1, 0, 0, 0, '[]') ON CONFLICT (user_id) DO NOTHING`,
        [userId]
      )
      const userResult = await database.query(
        "SELECT coins FROM economy_users WHERE user_id = $1",
        [userId]
      )
      const coins = userResult.rows[0]?.coins || 0

      // ✅ لو ما عنده شيء
      if (playerAssets.length === 0) {
        const embed = new EmbedBuilder()
          .setColor(0x64748b)
          .setTitle(`📦 ممتلكات ${targetUser.username}`)
          .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 128 }))
          .setDescription("🏜️ ما عنده أي ممتلكات بعد.\nاستخدم `/متجر` عشان تبدأ رحلتك!")
          .addFields(
            { name: "💵 الرصيد", value: `**${formatPriceExact(coins)}** كوين`, inline: true }
          )
          .setTimestamp()

        return interaction.reply({ embeds: [embed] })
      }

      // ✅ تصنيف الممتلكات
      const grouped = {}
      for (const asset of playerAssets) {
        const def = ALL_ITEMS[asset.item_id]
        if (!def) continue
        const cat = def.category
        if (!grouped[cat]) grouped[cat] = []
        grouped[cat].push({ ...def, quantity: asset.quantity })
      }

      // ✅ حساب الإحصائيات
      const netWorth = calculateNetWorth(coins, playerAssets)
      const stage = getProgressStage(playerAssets)
      const worldCheck = checkWorldDomination(playerAssets)
      const totalItems = playerAssets.reduce((sum, a) => sum + (a.quantity || 0), 0)

      // عدد السيارات والبيوت
      const totalCars = playerAssets
        .filter(a => CAR_CATEGORIES.includes(ALL_ITEMS[a.item_id]?.category))
        .reduce((sum, a) => sum + (a.quantity || 0), 0)

      const totalHouses = playerAssets
        .filter(a => HOUSE_TYPES.includes(a.item_id))
        .reduce((sum, a) => sum + (a.quantity || 0), 0)

      // ✅ بناء الـ Embed
      const embed = new EmbedBuilder()
        .setColor(0xf59e0b)
        .setTitle(`📦 ممتلكات ${targetUser.username}`)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 128 }))
        .addFields(
          { name: "💵 الرصيد", value: `**${formatPriceExact(coins)}** كوين`, inline: true },
          { name: "💎 صافي الثروة", value: `**${formatPrice(netWorth)}** كوين`, inline: true },
          { name: "📊 المرحلة", value: `${stage.emoji} ${stage.stage}`, inline: true },
          { name: "📦 إجمالي العناصر", value: `**${totalItems}**`, inline: true },
          { name: "🚗 السيارات", value: `**${totalCars}**`, inline: true },
          { name: "🏠 العقارات", value: `**${totalHouses}**`, inline: true }
        )

      // ✅ عرض كل فئة
      const sortedCategories = Object.entries(CATEGORIES).sort((a, b) => a[1].order - b[1].order)

      for (const [catId, cat] of sortedCategories) {
        const items = grouped[catId]
        if (!items || items.length === 0) continue

        // ترتيب حسب السعر
        items.sort((a, b) => b.price - a.price)

        let text = ""
        for (const item of items) {
          const totalValue = item.price * item.quantity
          text += `${item.emoji} **${item.name}** × ${item.quantity}`
          text += ` — ${formatPrice(totalValue)} كوين\n`
        }

        embed.addFields({
          name: cat.name,
          value: text || "لا يوجد",
          inline: false
        })
      }

      // ✅ تقدم السيطرة على العالم
      if (worldCheck.continents > 0) {
        const progress = `${"🌍".repeat(worldCheck.continents)}${"⬜".repeat(worldCheck.required - worldCheck.continents)}`
        embed.addFields({
          name: "🌍 السيطرة على العالم",
          value: `${progress}\n**${worldCheck.continents}/${worldCheck.required}** قارة${worldCheck.dominated ? "\n👑 **مستولٍ على العالم!**" : ""}`,
          inline: false
        })
      }

      embed.setFooter({ text: `ID: ${targetUser.id}` })
      embed.setTimestamp()

      return interaction.reply({ embeds: [embed] })

    } catch (err) {
      console.error("[INVENTORY ERROR]", err)

      if (interaction.replied || interaction.deferred) {
        return interaction.followUp({ content: "❌ حدث خطأ في عرض الممتلكات.", ephemeral: true })
      }
      return interaction.reply({ content: "❌ حدث خطأ في عرض الممتلكات.", ephemeral: true })
    }
  },
}
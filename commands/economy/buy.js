const { SlashCommandBuilder, EmbedBuilder } = require("discord.js")
const database = require("../../systems/databaseSystem")
const { ALL_ITEMS, CAR_CATEGORIES, checkRequirement, checkCarCapacity, checkWorldDomination, formatPriceExact, formatPrice, getProgressStage, WORLD_CONTINENTS_REQUIRED } = require("../../config/economyConfig")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("شراء")
    .setDescription("شراء عنصر من المتجر (سيارة، عقار، بنية تحتية)")
    .setDMPermission(false)
    .addStringOption(option =>
      option
        .setName("العنصر")
        .setDescription("اكتب اسم العنصر أو جزء منه")
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addIntegerOption(option =>
      option
        .setName("الكمية")
        .setDescription("عدد العناصر (الافتراضي 1)")
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(10)
    ),

  // ✅ Autocomplete — يقترح العناصر وهو يكتب
  async autocomplete(interaction) {
    try {
      const focused = interaction.options.getFocused().toLowerCase()
      const items = Object.values(ALL_ITEMS)

      const filtered = items
        .filter(item => {
          const searchText = `${item.name} ${item.id} ${item.description}`.toLowerCase()
          return searchText.includes(focused) || focused === ""
        })
        .sort((a, b) => a.price - b.price)
        .slice(0, 25)

      await interaction.respond(
        filtered.map(item => ({
          name: `${item.emoji} ${item.name} — ${formatPrice(item.price)} كوين`,
          value: item.id
        }))
      )
    } catch {
      // نتجاهل أخطاء الـ autocomplete
    }
  },

  async execute(interaction) {
    try {
      if (!interaction.guild) {
        return interaction.reply({ content: "❌ هذا الأمر داخل السيرفر فقط", ephemeral: true })
      }

      const userId = interaction.user.id
      const itemId = interaction.options.getString("العنصر")
      const quantity = interaction.options.getInteger("الكمية") || 1

      // ✅ تحقق: العنصر موجود
      const item = ALL_ITEMS[itemId]
      if (!item) {
        return interaction.reply({ content: "❌ عنصر غير موجود. استخدم القائمة المقترحة.", ephemeral: true })
      }

      const totalCost = item.price * quantity

      // ✅ تأجيل الرد
      await interaction.deferReply()

      // ✅ بدء المعاملة
      const client = await database.getClient()

      try {
        await client.query("BEGIN")

        // ✅ جلب المستخدم
        await client.query(
          `INSERT INTO economy_users (user_id, coins, last_daily, last_work, inventory)
           VALUES ($1, 0, 0, 0, '[]') ON CONFLICT (user_id) DO NOTHING`,
          [userId]
        )

        const userResult = await client.query(
          "SELECT * FROM economy_users WHERE user_id = $1 FOR UPDATE",
          [userId]
        )
        const user = userResult.rows[0]

        // ✅ تحقق: الرصيد كافي
        if (user.coins < totalCost) {
          await client.query("ROLLBACK")
          const shortage = totalCost - user.coins
          return interaction.editReply({
            embeds: [
              new EmbedBuilder()
                .setColor(0xef4444)
                .setTitle("❌ رصيد غير كافي")
                .addFields(
                  { name: "💰 رصيدك", value: `**${formatPriceExact(user.coins)}** كوين`, inline: true },
                  { name: "🏷️ السعر", value: `**${formatPriceExact(totalCost)}** كوين`, inline: true },
                  { name: "📉 ينقصك", value: `**${formatPriceExact(shortage)}** كوين`, inline: true }
                )
            ]
          })
        }

        // ✅ جلب ممتلكات اللاعب
        const assetsResult = await client.query(
          "SELECT item_id, quantity FROM inventory WHERE user_id = $1",
          [userId]
        )
        const playerAssets = assetsResult.rows || []

        // ✅ تحقق: شروط الشراء
        const reqCheck = checkRequirement(item, playerAssets)
        if (!reqCheck.allowed) {
          await client.query("ROLLBACK")
          return interaction.editReply({
            embeds: [
              new EmbedBuilder()
                .setColor(0xef4444)
                .setTitle("🔒 شرط غير مستوفى")
                .setDescription(reqCheck.message)
                .addFields(
                  { name: "🏷️ العنصر", value: `${item.emoji} ${item.name}`, inline: true },
                  { name: "📋 الشرط", value: item.requiresText, inline: true }
                )
            ]
          })
        }

        // ✅ تحقق: سعة السيارات
        if (CAR_CATEGORIES.includes(item.category)) {
          const capCheck = checkCarCapacity(playerAssets)
          if (!capCheck.allowed) {
            await client.query("ROLLBACK")
            return interaction.editReply({
              embeds: [
                new EmbedBuilder()
                  .setColor(0xef4444)
                  .setTitle("🚗 ما فيه مكان للسيارة")
                  .setDescription(capCheck.message)
              ]
            })
          }
        }

        // ✅ خصم الرصيد
        await client.query(
          "UPDATE economy_users SET coins = coins - $1 WHERE user_id = $2",
          [totalCost, userId]
        )

        // ✅ إضافة العنصر للمخزون (global)
        await client.query(
          `INSERT INTO inventory (user_id, guild_id, item_id, quantity)
           VALUES ($1, 'global', $2, $3)
           ON CONFLICT (user_id, guild_id, item_id)
           DO UPDATE SET quantity = inventory.quantity + $3`,
          [userId, itemId, quantity]
        )

        await client.query("COMMIT")

        // ✅ الرصيد بعد الشراء
        const newBalance = user.coins - totalCost

        // ✅ جلب الممتلكات المحدثة
        const updatedAssetsResult = await database.query(
          "SELECT item_id, quantity FROM inventory WHERE user_id = $1",
          [userId]
        )
        const updatedAssets = updatedAssetsResult.rows || []
        const stage = getProgressStage(updatedAssets)

        // ✅ Embed النجاح
        const embed = new EmbedBuilder()
          .setColor(0x22c55e)
          .setTitle("✅ تم الشراء بنجاح!")
          .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true, size: 128 }))
          .addFields(
            { name: "🏷️ العنصر", value: `${item.emoji} ${item.name}`, inline: true },
            { name: "📦 الكمية", value: `${quantity}`, inline: true },
            { name: "💰 السعر", value: `**${formatPriceExact(totalCost)}** كوين`, inline: true },
            { name: "💳 رصيدك المتبقي", value: `**${formatPriceExact(newBalance)}** كوين`, inline: true },
            { name: "📊 مرحلتك", value: `${stage.emoji} ${stage.stage}`, inline: true }
          )
          .setFooter({ text: `ID: ${interaction.user.id}` })
          .setTimestamp()

        // ✅ تحقق: سيطرة على العالم
        const worldCheck = checkWorldDomination(updatedAssets)
        if (worldCheck.dominated) {
          embed.addFields({
            name: "🌍👑 مستولٍ على العالم!",
            value: `**${interaction.user.username}** سيطر على **${WORLD_CONTINENTS_REQUIRED} قارات** وأصبح مستولٍ على العالم!`,
            inline: false
          })

          try {
            await interaction.channel.send({
              embeds: [
                new EmbedBuilder()
                  .setColor(0xfbbf24)
                  .setTitle("🌍👑 إعلان عالمي!")
                  .setDescription(`🎉 **${interaction.user}** سيطر على **${WORLD_CONTINENTS_REQUIRED} قارات** وأصبح **مستولٍ على العالم!**\n\nتقدر تنافسه باستخدام \`/متجر\`!`)
                  .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true, size: 256 }))
                  .setTimestamp()
              ]
            })
          } catch {}
        }

        return interaction.editReply({ embeds: [embed] })

      } catch (err) {
        await client.query("ROLLBACK")
        throw err
      } finally {
        client.release()
      }

    } catch (err) {
      console.error("[BUY ERROR]", err)

      if (interaction.deferred) {
        return interaction.editReply({ content: "❌ حدث خطأ أثناء الشراء." })
      }
      if (!interaction.replied) {
        return interaction.reply({ content: "❌ حدث خطأ أثناء الشراء.", ephemeral: true })
      }
    }
  },
}
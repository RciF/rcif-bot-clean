const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js")
const database = require("../../systems/databaseSystem")
const { ALL_ITEMS, formatPriceExact, formatPrice, getProgressStage } = require("../../config/economyConfig")

// سعر البيع = 60% من سعر الشراء
const SELL_PERCENTAGE = 0.6

module.exports = {
  data: new SlashCommandBuilder()
    .setName("بيع")
    .setDescription("بيع عنصر من ممتلكاتك")
    .setDMPermission(false)
    .addStringOption(option => {
      option
        .setName("العنصر")
        .setDescription("العنصر المراد بيعه")
        .setRequired(true)

      const items = Object.values(ALL_ITEMS)
        .sort((a, b) => a.price - b.price)
        .slice(0, 25)

      for (const item of items) {
        const sellPrice = Math.floor(item.price * SELL_PERCENTAGE)
        option.addChoices({
          name: `${item.emoji} ${item.name} — يُباع بـ ${formatPrice(sellPrice)} كوين`,
          value: item.id
        })
      }

      return option
    })
    .addIntegerOption(option =>
      option
        .setName("الكمية")
        .setDescription("عدد العناصر المراد بيعها (الافتراضي 1)")
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(10)
    ),

  async execute(interaction) {
    try {
      if (!interaction.guild) {
        return interaction.reply({ content: "❌ هذا الأمر داخل السيرفر فقط", ephemeral: true })
      }

      const userId = interaction.user.id
      const "global" = interaction.guild.id
      const itemId = interaction.options.getString("العنصر")
      const quantity = interaction.options.getInteger("الكمية") || 1

      // ✅ تحقق: العنصر موجود
      const item = ALL_ITEMS[itemId]
      if (!item) {
        return interaction.reply({ content: "❌ عنصر غير موجود.", ephemeral: true })
      }

      // ✅ تحقق: يملك العنصر
      const assetResult = await database.query(
        "SELECT quantity FROM inventory WHERE user_id = $1 AND guild_id = $2 AND item_id = $3",
        [userId, "global", itemId]
      )
      const owned = assetResult.rows[0]?.quantity || 0

      if (owned === 0) {
        return interaction.reply({
          content: `❌ أنت ما تملك **${item.emoji} ${item.name}** أصلاً.`,
          ephemeral: true
        })
      }

      if (owned < quantity) {
        return interaction.reply({
          content: `❌ ما عندك كمية كافية. تملك **${owned}** بس وتبي تبيع **${quantity}**.`,
          ephemeral: true
        })
      }

      // ✅ حساب سعر البيع
      const sellPrice = Math.floor(item.price * SELL_PERCENTAGE)
      const totalSellPrice = sellPrice * quantity

      // ✅ زر تأكيد
      const confirmBtn = new ButtonBuilder()
        .setCustomId("sell_confirm")
        .setLabel(`✅ تأكيد البيع — ${formatPriceExact(totalSellPrice)} كوين`)
        .setStyle(ButtonStyle.Success)

      const cancelBtn = new ButtonBuilder()
        .setCustomId("sell_cancel")
        .setLabel("❌ إلغاء")
        .setStyle(ButtonStyle.Danger)

      const row = new ActionRowBuilder().addComponents(confirmBtn, cancelBtn)

      // ✅ Embed التأكيد
      const confirmEmbed = new EmbedBuilder()
        .setColor(0xf59e0b)
        .setTitle("🏷️ تأكيد البيع")
        .setDescription("هل أنت متأكد تبي تبيع هذا العنصر؟")
        .addFields(
          { name: "📦 العنصر", value: `${item.emoji} ${item.name}`, inline: true },
          { name: "📦 الكمية", value: `${quantity}`, inline: true },
          { name: "💰 سعر الشراء", value: `${formatPriceExact(item.price)} كوين`, inline: true },
          { name: "💸 سعر البيع (60%)", value: `${formatPriceExact(sellPrice)} كوين / وحدة`, inline: true },
          { name: "💰 الإجمالي", value: `**${formatPriceExact(totalSellPrice)}** كوين`, inline: true },
          { name: "📦 تملك منه", value: `${owned}`, inline: true }
        )
        .setFooter({ text: "التأكيد ينتهي خلال 30 ثانية" })
        .setTimestamp()

      const response = await interaction.reply({
        embeds: [confirmEmbed],
        components: [row]
      })

      // ✅ انتظار التأكيد
      try {
        const btnInteraction = await response.awaitMessageComponent({
          filter: (i) => i.user.id === interaction.user.id,
          time: 30000
        })

        if (btnInteraction.customId === "sell_cancel") {
          const cancelEmbed = new EmbedBuilder()
            .setColor(0x64748b)
            .setTitle("❌ تم إلغاء البيع")
            .setDescription("ما تم بيع شيء.")
            .setTimestamp()

          return btnInteraction.update({ embeds: [cancelEmbed], components: [] })
        }

        // ✅ تنفيذ البيع
        const client = await database.getClient()

        try {
          await client.query("BEGIN")

          // تحقق مرة ثانية من الكمية (ممكن تتغير)
          const recheckResult = await client.query(
            "SELECT quantity FROM inventory WHERE user_id = $1 AND guild_id = $2 AND item_id = $3 FOR UPDATE",
            [userId, "global", itemId]
          )
          const currentQty = recheckResult.rows[0]?.quantity || 0

          if (currentQty < quantity) {
            await client.query("ROLLBACK")
            return btnInteraction.update({
              embeds: [
                new EmbedBuilder()
                  .setColor(0xef4444)
                  .setTitle("❌ فشل البيع")
                  .setDescription(`الكمية تغيرت! تملك الآن **${currentQty}** بس.`)
              ],
              components: []
            })
          }

          // خصم من المخزون
          if (currentQty === quantity) {
            await client.query(
              "DELETE FROM inventory WHERE user_id = $1 AND guild_id = $2 AND item_id = $3",
              [userId, "global", itemId]
            )
          } else {
            await client.query(
              "UPDATE inventory SET quantity = quantity - $1 WHERE user_id = $2 AND guild_id = $3 AND item_id = $4",
              [quantity, userId, "global", itemId]
            )
          }

          // إضافة الكوينز
          await client.query(
            "UPDATE economy_users SET coins = coins + $1 WHERE user_id = $2",
            [totalSellPrice, userId]
          )

          await client.query("COMMIT")

          // جلب الرصيد الجديد
          const newBalanceResult = await database.query(
            "SELECT coins FROM economy_users WHERE user_id = $1",
            [userId]
          )
          const newBalance = newBalanceResult.rows[0]?.coins || 0

          // جلب المرحلة
          const assetsResult = await database.query(
            "SELECT item_id, quantity FROM inventory WHERE user_id = $1 AND guild_id = $2 AND quantity > 0",
            [userId, "global"]
          )
          const stage = getProgressStage(assetsResult.rows || [])

          // Embed النجاح
          const successEmbed = new EmbedBuilder()
            .setColor(0x22c55e)
            .setTitle("✅ تم البيع بنجاح")
            .addFields(
              { name: "📦 العنصر", value: `${item.emoji} ${item.name}`, inline: true },
              { name: "📦 الكمية", value: `${quantity}`, inline: true },
              { name: "💰 حصلت على", value: `**+${formatPriceExact(totalSellPrice)}** كوين`, inline: true },
              { name: "💳 رصيدك الجديد", value: `**${formatPriceExact(newBalance)}** كوين`, inline: true },
              { name: "📊 مرحلتك", value: `${stage.emoji} ${stage.stage}`, inline: true }
            )
            .setTimestamp()

          return btnInteraction.update({ embeds: [successEmbed], components: [] })

        } catch (err) {
          await client.query("ROLLBACK")
          throw err
        } finally {
          client.release()
        }

      } catch (err) {
        // انتهت المهلة
        if (err.code === "InteractionCollectorError" || err.message?.includes("time")) {
          const timeoutEmbed = new EmbedBuilder()
            .setColor(0x64748b)
            .setTitle("⏰ انتهت المهلة")
            .setDescription("ما تم تأكيد البيع خلال 30 ثانية.")
            .setTimestamp()

          return interaction.editReply({ embeds: [timeoutEmbed], components: [] })
        }
        throw err
      }

    } catch (err) {
      console.error("[SELL ERROR]", err)

      if (interaction.replied || interaction.deferred) {
        return interaction.followUp({ content: "❌ حدث خطأ أثناء البيع.", ephemeral: true })
      }
      return interaction.reply({ content: "❌ حدث خطأ أثناء البيع.", ephemeral: true })
    }
  },
}
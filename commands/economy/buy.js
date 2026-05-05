const { SlashCommandBuilder, EmbedBuilder } = require("discord.js")
const database = require("../../systems/databaseSystem")
const databaseManager = require("../../utils/databaseManager")
const fridaySaleSystem = require("../../systems/fridaySaleSystem")
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

  helpMeta: {
    category: "economy",
    aliases: ["buy", "شراء"],
    description: "شراء عنصر من المتجر (سيارة، عقار، بنية تحتية، أداة)",
    options: [
      { name: "العنصر", description: "اسم العنصر المراد شراؤه (يدعم Autocomplete)", required: true },
      { name: "الكمية", description: "عدد القطع (افتراضي 1، حد أقصى 10)", required: false }
    ],
    requirements: {
      botRoleHierarchy: false,
      userPermissions: [],
      subscriptionTier: "gold"
    },
    cooldown: 0,
    relatedCommands: ["متجر", "بيع", "ممتلكاتي"],
    examples: [
      "/شراء العنصر:🚗 سيارة",
      "/شراء العنصر:💻 لابتوب الكمية:3"
    ],
    notes: [
      "Autocomplete يعرض كل المنتجات المتاحة",
      "البوت يفحص رصيدك قبل التنفيذ",
      "العملية transaction آمن — لو فشلت، الفلوس ترجع لك",
      "كل جمعة فيه خصم تلقائي على عناصر عشوائية"
    ]
  },

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
    } catch {}
  },

  async execute(interaction) {
    try {
      if (!interaction.guild) {
        return interaction.reply({ content: "❌ هذا الأمر داخل السيرفر فقط", ephemeral: true })
      }

      const userId = interaction.user.id
      const itemId = interaction.options.getString("العنصر")
      const quantity = interaction.options.getInteger("الكمية") || 1

      const item = ALL_ITEMS[itemId]
      if (!item) {
        return interaction.reply({ content: "❌ عنصر غير موجود. استخدم القائمة المقترحة.", ephemeral: true })
      }

      // ✅ تحقق من خصم الجمعة
      const discount = await fridaySaleSystem.getItemDiscount(itemId)
      const discountedPrice = fridaySaleSystem.applyDiscount(item.price, discount)
      const totalCost = discountedPrice * quantity

      await interaction.deferReply()

      const client = await databaseManager.getClient()

      try {
        await client.query("BEGIN")

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

        // ✅ FIX: تحقق من وجود الـ user (نظرياً مستحيل بعد الـ INSERT لكن نحتاط)
        if (!user) {
          await client.query("ROLLBACK")
          return interaction.editReply({
            content: "❌ ما قدرت أجلب بيانات حسابك. حاول مرة ثانية."
          })
        }

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

        const assetsResult = await client.query(
          "SELECT item_id, quantity FROM inventory WHERE user_id = $1",
          [userId]
        )
        const playerAssets = assetsResult.rows || []

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

        if (CAR_CATEGORIES.includes(item.category)) {
          const simulatedAssets = playerAssets.map(a => ({ ...a }))
          const existingCar = simulatedAssets.find(a => a.item_id === itemId)
          if (existingCar) {
            existingCar.quantity += quantity
          } else {
            simulatedAssets.push({ item_id: itemId, quantity })
          }

          const capCheck = checkCarCapacity(simulatedAssets)
          if (!capCheck.allowed) {
            await client.query("ROLLBACK")
            return interaction.editReply({
              embeds: [
                new EmbedBuilder()
                  .setColor(0xef4444)
                  .setTitle("🚗 ما فيه مكان للسيارة")
                  .setDescription(capCheck.message)
                  .addFields(
                    { name: "📦 طلبت", value: `${quantity} سيارة`, inline: true },
                    { name: "🏠 السعة المتاحة", value: `${capCheck.capacity} سيارة`, inline: true }
                  )
              ]
            })
          }
        }

        await client.query(
          "UPDATE economy_users SET coins = coins - $1 WHERE user_id = $2",
          [totalCost, userId]
        )

        await client.query(
          `INSERT INTO inventory (user_id, item_id, quantity)
           VALUES ($1, $2, $3)
           ON CONFLICT (user_id, item_id)
           DO UPDATE SET quantity = inventory.quantity + $3`,
          [userId, itemId, quantity]
        )

        await client.query("COMMIT")

        const newBalance = user.coins - totalCost

        const updatedAssetsResult = await database.query(
          "SELECT item_id, quantity FROM inventory WHERE user_id = $1",
          [userId]
        )
        const updatedAssets = updatedAssetsResult.rows || []
        const stage = getProgressStage(updatedAssets)

        const embed = new EmbedBuilder()
          .setColor(0x22c55e)
          .setTitle("✅ تم الشراء بنجاح!")
          .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true, size: 128 }))
          .addFields(
            { name: "🏷️ العنصر", value: `${item.emoji} ${item.name}`, inline: true },
            { name: "📦 الكمية", value: `${quantity}`, inline: true },
            {
              name: "💰 السعر",
              value: discount > 0
                ? `~~${formatPriceExact(item.price * quantity)}~~ **${formatPriceExact(totalCost)}** كوين (-${discount}%) 🔥`
                : `**${formatPriceExact(totalCost)}** كوين`,
              inline: true
            },
            { name: "💳 رصيدك المتبقي", value: `**${formatPriceExact(newBalance)}** كوين`, inline: true },
            { name: "📊 مرحلتك", value: `${stage.emoji} ${stage.stage}`, inline: true }
          )
          .setFooter({ text: `ID: ${interaction.user.id}` })
          .setTimestamp()

        const worldCheck = checkWorldDomination(updatedAssets)
        if (worldCheck.dominated) {
          embed.addFields({
            name: "🌍👑 مستولٍ على العالم!",
            value: `**${interaction.user.username}** سيطر على **${WORLD_CONTINENTS_REQUIRED} قارات**!`,
            inline: false
          })

          try {
            await interaction.channel.send({
              embeds: [
                new EmbedBuilder()
                  .setColor(0xfbbf24)
                  .setTitle("🌍👑 إعلان عالمي!")
                  .setDescription(`🎉 **${interaction.user}** سيطر على **${WORLD_CONTINENTS_REQUIRED} قارات** وأصبح **مستولٍ على العالم!**`)
                  .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true, size: 256 }))
                  .setTimestamp()
              ]
            })
          } catch {}
        }

        return interaction.editReply({ embeds: [embed] })

      } catch (err) {
        // ✅ FIX: ROLLBACK آمن — ما يفشل لو الـ transaction انتهى أصلاً
        await client.query("ROLLBACK").catch(() => {})
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
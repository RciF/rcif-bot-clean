const { SlashCommandBuilder, EmbedBuilder } = require("discord.js")
const database = require("../../systems/databaseSystem")
const databaseManager = require("../../utils/databaseManager")
const fridaySaleSystem = require("../../systems/fridaySaleSystem")
const { ALL_ITEMS, CAR_CATEGORIES, checkRequirement, checkCarCapacity, checkWorldDomination, formatPriceExact, formatPrice, getProgressStage, WORLD_CONTINENTS_REQUIRED } = require("../../config/economyConfig")
const economySettings = require("../../utils/economySettingsHelper")
const economyShop = require("../../utils/economyShopHelper")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("شراء")
    .setDescription("شراء عنصر من المتجر (سيارة، عقار، بنية تحتية، أو عنصر مخصص)")
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
    description: "شراء عنصر من المتجر (سيارة، عقار، بنية تحتية، أداة، أو عنصر مخصص)",
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
      "/شراء العنصر:🛒 رتبة-VIP الكمية:1"
    ],
    notes: [
      "Autocomplete يعرض كل المنتجات + عناصر متجر السيرفر",
      "العملية transaction آمن — لو فشلت، الفلوس ترجع لك",
      "كل جمعة فيه خصم تلقائي على عناصر عشوائية"
    ]
  },

  async autocomplete(interaction) {
    try {
      const focused = interaction.options.getFocused().toLowerCase()
      const guildId = interaction.guild?.id

      // العناصر العالمية
      const globalItems = Object.values(ALL_ITEMS).map(item => ({
        name: `${item.emoji} ${item.name} — ${formatPrice(item.price)}`,
        value: item.id,
        searchText: `${item.name} ${item.id} ${item.description}`.toLowerCase(),
        price: item.price
      }))

      // عناصر متجر السيرفر
      let customItems = []
      if (guildId) {
        const shopItems = await economyShop.getGuildShopItems(guildId)
        customItems = shopItems.map(item => ({
          name: `${item.emoji} ${item.name} — ${formatPrice(item.price)} 🛒`,
          value: item.id, // shop_<id>
          searchText: `${item.name} ${item.description}`.toLowerCase(),
          price: item.price
        }))
      }

      const all = [...customItems, ...globalItems]

      const filtered = all
        .filter(item => focused === "" || item.searchText.includes(focused))
        .sort((a, b) => a.price - b.price)
        .slice(0, 25)

      await interaction.respond(
        filtered.map(({ name, value }) => ({ name, value }))
      )
    } catch {}
  },

  async execute(interaction) {
    try {
      if (!interaction.guild) {
        return interaction.reply({ content: "❌ هذا الأمر داخل السيرفر فقط", ephemeral: true })
      }

      const userId = interaction.user.id
      const guildId = interaction.guild.id
      const itemId = interaction.options.getString("العنصر")
      const quantity = interaction.options.getInteger("الكمية") || 1

      // ✅ إعدادات
      const settings = await economySettings.getSettings(guildId)
      if (!settings.enabled) {
        return interaction.reply({
          content: "❌ نظام الاقتصاد معطّل في هذا السيرفر.",
          ephemeral: true
        })
      }
      const currencyName = settings.currency_name
      const symbol = settings.currency_symbol

      // ═════════════════════════════════════════
      //  هل العنصر من متجر السيرفر؟
      // ═════════════════════════════════════════
      if (economyShop.isShopItem(itemId)) {
        return await handleCustomShopBuy(interaction, {
          itemId, quantity, userId, guildId, currencyName, symbol, settings
        })
      }

      // ═════════════════════════════════════════
      //  العناصر العالمية (الكود الأصلي)
      // ═════════════════════════════════════════
      const item = ALL_ITEMS[itemId]
      if (!item) {
        return interaction.reply({ content: "❌ عنصر غير موجود. استخدم القائمة المقترحة.", ephemeral: true })
      }

      const discount = await fridaySaleSystem.getItemDiscount(itemId)
      const discountedPrice = fridaySaleSystem.applyDiscount(item.price, discount)
      const totalCost = discountedPrice * quantity

      await interaction.deferReply()

      const client = await databaseManager.getClient()

      try {
        await client.query("BEGIN")

        await client.query(
          `INSERT INTO economy_users (user_id, coins, last_daily, last_work, inventory)
           VALUES ($1, $2, 0, 0, '[]') ON CONFLICT (user_id) DO NOTHING`,
          [userId, settings.starting_balance || 0]
        )

        const userResult = await client.query(
          "SELECT * FROM economy_users WHERE user_id = $1 FOR UPDATE",
          [userId]
        )
        const user = userResult.rows[0]

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
                  { name: `${symbol} رصيدك`, value: `**${formatPriceExact(user.coins)}** ${currencyName}`, inline: true },
                  { name: "🏷️ السعر", value: `**${formatPriceExact(totalCost)}** ${currencyName}`, inline: true },
                  { name: "📉 ينقصك", value: `**${formatPriceExact(shortage)}** ${currencyName}`, inline: true }
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
              name: `${symbol} السعر`,
              value: discount > 0
                ? `~~${formatPriceExact(item.price * quantity)}~~ **${formatPriceExact(totalCost)}** ${currencyName} (-${discount}%) 🔥`
                : `**${formatPriceExact(totalCost)}** ${currencyName}`,
              inline: true
            },
            { name: "💳 رصيدك المتبقي", value: `**${formatPriceExact(newBalance)}** ${currencyName}`, inline: true },
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
              ]
            })
          } catch {}
        }

        return interaction.editReply({ embeds: [embed] })

      } catch (err) {
        await client.query("ROLLBACK").catch(() => {})
        throw err
      } finally {
        client.release()
      }

    } catch (err) {
      console.error("[BUY ERROR]", err)
      const msg = "❌ حدث خطأ في عملية الشراء."
      if (interaction.replied || interaction.deferred) {
        return interaction.followUp({ content: msg, ephemeral: true }).catch(() => {})
      }
      return interaction.reply({ content: msg, ephemeral: true }).catch(() => {})
    }
  },
}

// ══════════════════════════════════════════════════════════
//  Custom shop buy handler
//  - يدعم type='item' (يضاف للـ inventory بـ key shop_<id>)
//  - يدعم type='role' (يعطي الـ role_id للعضو)
//  - يدعم type='tool' (يعامله مثل item)
//  - ينقص stock بعد الشراء
// ══════════════════════════════════════════════════════════

async function handleCustomShopBuy(interaction, ctx) {
  const { itemId, quantity, userId, guildId, currencyName, symbol, settings } = ctx

  await interaction.deferReply()

  const item = await economyShop.getShopItemById(guildId, itemId)
  if (!item) {
    return interaction.editReply({ content: "❌ العنصر غير موجود في متجر السيرفر." })
  }

  // ✅ تحقق من stock قبل البدء
  if (item.stock !== -1 && item.stock < quantity) {
    return interaction.editReply({
      content: `❌ الكمية المتاحة قليلة. متبقي **${item.stock}** فقط.`
    })
  }

  const totalCost = item.price * quantity

  // ─── type=role: شراء واحد فقط، تعطي الرتبة ───
  if (item.type === "role") {
    if (quantity !== 1) {
      return interaction.editReply({
        content: "❌ الرتب تُشترى بكمية 1 فقط."
      })
    }

    const role = item.role_id ? interaction.guild.roles.cache.get(item.role_id) : null
    if (!role) {
      return interaction.editReply({
        content: "❌ الرتبة المرتبطة بهذا العنصر غير موجودة."
      })
    }

    const member = interaction.member
    if (member.roles.cache.has(role.id)) {
      return interaction.editReply({
        content: `❌ أنت تملك رتبة ${role} بالفعل.`
      })
    }

    const botMember = interaction.guild.members.me
    if (role.position >= botMember.roles.highest.position) {
      return interaction.editReply({
        content: "❌ البوت ما يقدر يعطي هذه الرتبة — ارفع رتبة البوت."
      })
    }
    if (role.managed) {
      return interaction.editReply({
        content: "❌ هذه الرتبة مُدارة من تكامل خارجي."
      })
    }
  }

  const client = await databaseManager.getClient()

  try {
    await client.query("BEGIN")

    await client.query(
      `INSERT INTO economy_users (user_id, coins, last_daily, last_work, inventory)
       VALUES ($1, $2, 0, 0, '[]') ON CONFLICT (user_id) DO NOTHING`,
      [userId, settings.starting_balance || 0]
    )

    const userResult = await client.query(
      "SELECT coins FROM economy_users WHERE user_id = $1 FOR UPDATE",
      [userId]
    )
    const userCoins = userResult.rows[0]?.coins || 0

    if (userCoins < totalCost) {
      await client.query("ROLLBACK")
      const shortage = totalCost - userCoins
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xef4444)
            .setTitle("❌ رصيد غير كافي")
            .addFields(
              { name: `${symbol} رصيدك`, value: `**${formatPriceExact(userCoins)}** ${currencyName}`, inline: true },
              { name: "🏷️ السعر", value: `**${formatPriceExact(totalCost)}** ${currencyName}`, inline: true },
              { name: "📉 ينقصك", value: `**${formatPriceExact(shortage)}** ${currencyName}`, inline: true }
            )
        ]
      })
    }

    // ✅ recheck stock بعد الـ FOR UPDATE
    if (item.stock !== -1) {
      const stockResult = await client.query(
        "SELECT stock FROM economy_shop WHERE id = $1 FOR UPDATE",
        [item.shop_id]
      )
      const currentStock = stockResult.rows[0]?.stock
      if (currentStock != null && currentStock !== -1 && currentStock < quantity) {
        await client.query("ROLLBACK")
        return interaction.editReply({
          content: `❌ الكمية تغيرت. متبقي **${currentStock}** فقط.`
        })
      }
    }

    // ✅ خصم الفلوس
    await client.query(
      "UPDATE economy_users SET coins = coins - $1 WHERE user_id = $2",
      [totalCost, userId]
    )

    // ✅ نقص الـ stock
    if (item.stock !== -1) {
      await client.query(
        "UPDATE economy_shop SET stock = stock - $1 WHERE id = $2",
        [quantity, item.shop_id]
      )
    }

    // ✅ معالجة حسب النوع
    if (item.type === "role") {
      try {
        await interaction.member.roles.add(item.role_id, "شراء رتبة من متجر السيرفر")
      } catch (err) {
        await client.query("ROLLBACK")
        return interaction.editReply({
          content: `❌ فشل إعطاء الرتبة: ${err.message}`
        })
      }
    } else {
      // item أو tool → inventory
      await client.query(
        `INSERT INTO inventory (user_id, item_id, quantity)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, item_id)
         DO UPDATE SET quantity = inventory.quantity + $3`,
        [userId, item.id, quantity]
      )
    }

    await client.query("COMMIT")

    economyShop.invalidateCache(guildId)

    const newBalance = userCoins - totalCost

    let typeText = "📦 عنصر"
    let resultText = `أضيف لممتلكاتك`
    if (item.type === "role") {
      typeText = "🎭 رتبة"
      resultText = `أضيفت لك`
    } else if (item.type === "tool") {
      typeText = "🔧 أداة"
    }

    const embed = new EmbedBuilder()
      .setColor(0x22c55e)
      .setTitle("✅ تم الشراء من متجر السيرفر!")
      .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true, size: 128 }))
      .addFields(
        { name: "🏷️ العنصر", value: `${item.emoji} ${item.name}`, inline: true },
        { name: "📦 النوع", value: typeText, inline: true },
        { name: "📦 الكمية", value: `${quantity}`, inline: true },
        { name: `${symbol} السعر`, value: `**${formatPriceExact(totalCost)}** ${currencyName}`, inline: true },
        { name: "💳 رصيدك المتبقي", value: `**${formatPriceExact(newBalance)}** ${currencyName}`, inline: true },
        { name: "✨ النتيجة", value: resultText, inline: true }
      )
      .setFooter({ text: "متجر السيرفر — يديره صاحب السيرفر" })
      .setTimestamp()

    return interaction.editReply({ embeds: [embed] })

  } catch (err) {
    await client.query("ROLLBACK").catch(() => {})
    console.error("[CUSTOM SHOP BUY ERROR]", err)
    return interaction.editReply({
      content: "❌ حدث خطأ في الشراء من متجر السيرفر."
    })
  } finally {
    client.release()
  }
}
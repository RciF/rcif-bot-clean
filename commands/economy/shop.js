const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require("discord.js")
const { CATEGORIES, CARS, PROPERTIES, INFRASTRUCTURE, ALL_ITEMS, formatPrice, formatPriceExact } = require("../../config/economyConfig")
const fridaySaleSystem = require("../../systems/fridaySaleSystem")
const economySettings = require("../../utils/economySettingsHelper")
const economyShop = require("../../utils/economyShopHelper")

function getItemsByCategory(categoryId) {
  return Object.values(ALL_ITEMS).filter(item => item.category === categoryId)
}

function buildCategoryEmbed(categoryId, interaction, currencyName = "كوين") {
  const category = CATEGORIES[categoryId]
  const items = getItemsByCategory(categoryId)

  if (!category || items.length === 0) return null

  items.sort((a, b) => a.price - b.price)

  const embed = new EmbedBuilder()
    .setColor(getCategoryColor(categoryId))
    .setTitle(`${category.name}`)
    .setDescription(`عدد العناصر: **${items.length}**\nاستخدم \`/شراء\` لشراء أي عنصر`)
    .setFooter({ text: `طلب من: ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
    .setTimestamp()

  for (const item of items) {
    const priceText = formatPriceExact(item.price)
    const reqText = item.requiresText || "بدون شروط"

    embed.addFields({
      name: `${item.emoji} ${item.name} — ${formatPrice(item.price)} ${currencyName}`,
      value: `💰 \`${priceText}\` ${currencyName}\n📋 ${item.description}\n🔒 ${reqText}`,
      inline: false
    })
  }

  return embed
}

async function buildCustomShopEmbed(guildId, interaction, currencyName = "كوين") {
  const items = await economyShop.getGuildShopItems(guildId)
  if (items.length === 0) return null

  const embed = new EmbedBuilder()
    .setColor(0xec4899)
    .setTitle("🛒 متجر السيرفر")
    .setDescription(`عناصر مخصصة من إدارة السيرفر — **${items.length}** عنصر`)
    .setFooter({ text: `طلب من: ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
    .setTimestamp()

  for (const item of items.slice(0, 20)) {
    const stockText = item.stock === -1
      ? "♾️ غير محدود"
      : item.stock > 0
        ? `📦 متبقي: ${item.stock}`
        : "❌ نفد"

    let typeText = ""
    if (item.type === "role") typeText = "🎭 رتبة"
    else if (item.type === "tool") typeText = "🔧 أداة"
    else typeText = "📦 عنصر"

    const desc = item.description || "—"

    embed.addFields({
      name: `${item.emoji} ${item.name} — ${formatPrice(item.price)} ${currencyName}`,
      value: `💰 \`${formatPriceExact(item.price)}\` ${currencyName}\n${typeText} • ${stockText}\n📋 ${desc}`,
      inline: false
    })
  }

  if (items.length > 20) {
    embed.addFields({
      name: "ℹ️ ملاحظة",
      value: `يوجد ${items.length - 20} عنصر إضافي. استخدم \`/شراء\` للبحث عنهم.`,
      inline: false
    })
  }

  return embed
}

function getCategoryColor(categoryId) {
  const colors = {
    car_economy: 0x22c55e,
    car_mid: 0x3b82f6,
    car_luxury: 0xa855f7,
    car_super: 0xef4444,
    house: 0xf59e0b,
    infrastructure: 0x06b6d4,
    custom_shop: 0xec4899,
  }
  return colors[categoryId] || 0x64748b
}

async function buildMainEmbed(interaction, currencyName) {
  const embed = new EmbedBuilder()
    .setColor(0xf59e0b)
    .setTitle("🏪 المتجر")
    .setDescription("اختر فئة من القائمة عشان تشوف العناصر المتاحة")
    .setFooter({ text: `طلب من: ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
    .setTimestamp()

  if (fridaySaleSystem.isFriday()) {
    const sales = await fridaySaleSystem.getSales()

    if (sales.length > 0) {
      const salesText = sales.map(s => {
        const item = ALL_ITEMS[s.item_id]
        if (!item) return null
        const discountedPrice = fridaySaleSystem.applyDiscount(item.price, s.discount)
        return `${item.emoji} **${item.name}** — ~~${formatPrice(item.price)}~~ **${formatPrice(discountedPrice)}** ${currencyName} (-${s.discount}%)`
      }).filter(Boolean).join("\n")

      embed.addFields({
        name: "🔥 عروض الجمعة — اليوم فقط!",
        value: salesText,
        inline: false
      })
    }
  }

  const sortedCategories = Object.entries(CATEGORIES).sort((a, b) => a[1].order - b[1].order)

  for (const [catId, cat] of sortedCategories) {
    const items = getItemsByCategory(catId)
    const minPrice = Math.min(...items.map(i => i.price))
    const maxPrice = Math.max(...items.map(i => i.price))

    embed.addFields({
      name: `${cat.name}`,
      value: `📦 ${items.length} عنصر\n💰 من ${formatPrice(minPrice)} إلى ${formatPrice(maxPrice)} ${currencyName}`,
      inline: true
    })
  }

  // ✅ قسم متجر السيرفر المخصص
  if (interaction.guild) {
    const customItems = await economyShop.getGuildShopItems(interaction.guild.id)
    if (customItems.length > 0) {
      const minPrice = Math.min(...customItems.map(i => i.price))
      const maxPrice = Math.max(...customItems.map(i => i.price))
      embed.addFields({
        name: "🛒 متجر السيرفر",
        value: `📦 ${customItems.length} عنصر مخصص\n💰 من ${formatPrice(minPrice)} إلى ${formatPrice(maxPrice)} ${currencyName}`,
        inline: true
      })
    }
  }

  return embed
}

async function buildCategoryMenu(guildId) {
  const sortedCategories = Object.entries(CATEGORIES).sort((a, b) => a[1].order - b[1].order)

  const options = sortedCategories.map(([catId, cat]) => {
    const items = getItemsByCategory(catId)
    return {
      label: cat.name.replace(/[^\p{L}\p{N}\s]/gu, "").trim(),
      description: `${items.length} عنصر`,
      value: catId,
      emoji: cat.emoji
    }
  })

  // ✅ إضافة خيار متجر السيرفر لو فيه عناصر
  if (guildId) {
    const customItems = await economyShop.getGuildShopItems(guildId)
    if (customItems.length > 0) {
      options.push({
        label: "متجر السيرفر",
        description: `${customItems.length} عنصر مخصص`,
        value: "custom_shop",
        emoji: "🛒"
      })
    }
  }

  const menu = new StringSelectMenuBuilder()
    .setCustomId("shop_category")
    .setPlaceholder("🏪 اختر فئة...")
    .addOptions(options)

  return new ActionRowBuilder().addComponents(menu)
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("متجر")
    .setDescription("تصفح المتجر واشترِ سيارات وعقارات وعناصر مخصصة")
    .setDMPermission(false)
    .addStringOption(option =>
      option
        .setName("الفئة")
        .setDescription("عرض فئة محددة مباشرة (اختياري)")
        .setRequired(false)
        .addChoices(
          { name: "🚗 سيارات اقتصادية", value: "car_economy" },
          { name: "🚗 سيارات متوسطة", value: "car_mid" },
          { name: "🚘 سيارات فاخرة", value: "car_luxury" },
          { name: "🏎️ سيارات فائقة الفخامة", value: "car_super" },
          { name: "🏠 عقارات", value: "house" },
          { name: "🛣️ بنية تحتية", value: "infrastructure" },
          { name: "🛒 متجر السيرفر", value: "custom_shop" }
        )
    ),

  helpMeta: {
    category: "economy",
    aliases: ["shop", "store", "متجر"],
    description: "تصفح المتجر — سيارات، عقارات، بنية تحتية، وأدوات مخصصة",
    options: [
      { name: "الفئة", description: "نوع المنتجات", required: false }
    ],
    requirements: {
      botRoleHierarchy: false,
      userPermissions: [],
      subscriptionTier: "gold"
    },
    cooldown: 0,
    relatedCommands: ["شراء", "بيع", "ممتلكاتي", "رصيد"],
    examples: [
      "/متجر",
      "/متجر الفئة:🚗 سيارات",
      "/متجر الفئة:🛒 متجر السيرفر"
    ],
    notes: [
      "متجر السيرفر يحتوي عناصر يضيفها صاحب السيرفر من الداش",
      "كل جمعة فيه عروض عشوائية بخصم 10-40% على العناصر العالمية"
    ]
  },

  async execute(interaction) {
    try {
      const settings = await economySettings.getSettings(interaction.guild?.id)
      const currencyName = settings.currency_name

      const categoryChoice = interaction.options.getString("الفئة")

      if (categoryChoice) {
        let embed
        if (categoryChoice === "custom_shop") {
          embed = await buildCustomShopEmbed(interaction.guild?.id, interaction, currencyName)
          if (!embed) {
            return interaction.reply({
              content: "❌ متجر السيرفر فاضي. صاحب السيرفر يقدر يضيف عناصر من الداش.",
              ephemeral: true
            })
          }
        } else {
          embed = buildCategoryEmbed(categoryChoice, interaction, currencyName)
          if (!embed) {
            return interaction.reply({ content: "❌ فئة غير موجودة.", ephemeral: true })
          }
        }
        return interaction.reply({ embeds: [embed] })
      }

      const mainEmbed = await buildMainEmbed(interaction, currencyName)
      const menu = await buildCategoryMenu(interaction.guild?.id)

      const response = await interaction.reply({
        embeds: [mainEmbed],
        components: [menu]
      })

      const collector = response.createMessageComponentCollector({
        filter: (i) => i.user.id === interaction.user.id,
        time: 60000
      })

      collector.on("collect", async (i) => {
        try {
          const selectedCategory = i.values[0]
          let embed
          if (selectedCategory === "custom_shop") {
            embed = await buildCustomShopEmbed(interaction.guild?.id, interaction, currencyName)
          } else {
            embed = buildCategoryEmbed(selectedCategory, interaction, currencyName)
          }

          if (!embed) {
            return i.update({ content: "❌ فئة غير موجودة.", embeds: [], components: [] })
          }

          await i.update({ embeds: [embed], components: [menu] })
        } catch (err) {
          console.error("[SHOP INTERACTION ERROR]", err)
        }
      })

      collector.on("end", async () => {
        try {
          await interaction.editReply({ components: [] })
        } catch {}
      })

    } catch (err) {
      console.error("[SHOP ERROR]", err)

      if (interaction.replied || interaction.deferred) {
        return interaction.followUp({ content: "❌ حدث خطأ في عرض المتجر.", ephemeral: true })
      }
      return interaction.reply({ content: "❌ حدث خطأ في عرض المتجر.", ephemeral: true })
    }
  },
}
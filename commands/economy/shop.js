const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require("discord.js")
const { CATEGORIES, CARS, PROPERTIES, INFRASTRUCTURE, ALL_ITEMS, formatPrice, formatPriceExact } = require("../../config/economyConfig")
const fridaySaleSystem = require("../../systems/fridaySaleSystem")

// تجميع العناصر حسب الفئة
function getItemsByCategory(categoryId) {
  return Object.values(ALL_ITEMS).filter(item => item.category === categoryId)
}

// بناء Embed لفئة معينة
function buildCategoryEmbed(categoryId, interaction) {
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
      name: `${item.emoji} ${item.name} — ${formatPrice(item.price)} كوين`,
      value: `💰 \`${priceText}\` كوين\n📋 ${item.description}\n🔒 ${reqText}`,
      inline: false
    })
  }

  return embed
}

// ألوان الفئات
function getCategoryColor(categoryId) {
  const colors = {
    car_economy: 0x22c55e,
    car_mid: 0x3b82f6,
    car_luxury: 0xa855f7,
    car_super: 0xef4444,
    house: 0xf59e0b,
    infrastructure: 0x06b6d4,
  }
  return colors[categoryId] || 0x64748b
}

// Embed الصفحة الرئيسية
async function buildMainEmbed(interaction) {
  const embed = new EmbedBuilder()
    .setColor(0xf59e0b)
    .setTitle("🏪 المتجر")
    .setDescription("اختر فئة من القائمة عشان تشوف العناصر المتاحة")
    .setFooter({ text: `طلب من: ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
    .setTimestamp()

  // ✅ عروض الجمعة
  if (fridaySaleSystem.isFriday()) {
    const sales = await fridaySaleSystem.getSales()

    if (sales.length > 0) {
      const salesText = sales.map(s => {
        const item = ALL_ITEMS[s.item_id]
        if (!item) return null
        const discountedPrice = fridaySaleSystem.applyDiscount(item.price, s.discount)
        return `${item.emoji} **${item.name}** — ~~${formatPrice(item.price)}~~ **${formatPrice(discountedPrice)}** كوين (-${s.discount}%)`
      }).filter(Boolean).join("\n")

      embed.addFields({
        name: "🔥 عروض الجمعة — اليوم فقط!",
        value: salesText,
        inline: false
      })
    }
  }

  // عرض ملخص كل فئة
  const sortedCategories = Object.entries(CATEGORIES).sort((a, b) => a[1].order - b[1].order)

  for (const [catId, cat] of sortedCategories) {
    const items = getItemsByCategory(catId)
    const minPrice = Math.min(...items.map(i => i.price))
    const maxPrice = Math.max(...items.map(i => i.price))

    embed.addFields({
      name: `${cat.name}`,
      value: `📦 ${items.length} عنصر\n💰 من ${formatPrice(minPrice)} إلى ${formatPrice(maxPrice)} كوين`,
      inline: true
    })
  }

  return embed
}

// قائمة اختيار الفئات
function buildCategoryMenu() {
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

  const menu = new StringSelectMenuBuilder()
    .setCustomId("shop_category")
    .setPlaceholder("🏪 اختر فئة...")
    .addOptions(options)

  return new ActionRowBuilder().addComponents(menu)
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("متجر")
    .setDescription("تصفح المتجر واشترِ سيارات وعقارات وبنية تحتية")
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
          { name: "🛣️ بنية تحتية", value: "infrastructure" }
        )
    ),

  helpMeta: {
    category: "economy",
    aliases: ["shop", "store", "متجر"],
    description: "تصفح المتجر — سيارات، عقارات، بنية تحتية، وأدوات",
    options: [
      { name: "النوع", description: "نوع المنتجات (سيارات/عقارات/أدوات/الكل)", required: false }
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
      "/متجر النوع:🚗 سيارات",
      "/متجر النوع:🏠 عقارات"
    ],
    notes: [
      "الأسعار ثابتة عالمياً",
      "كل جمعة فيه عروض عشوائية بخصم 10-40%",
      "يعرض رصيدك الحالي عشان تعرف وش تقدر تشتري"
    ]
  },

  async execute(interaction) {
    try {
      const categoryChoice = interaction.options.getString("الفئة")

      if (categoryChoice) {
        const embed = buildCategoryEmbed(categoryChoice, interaction)
        if (!embed) {
          return interaction.reply({ content: "❌ فئة غير موجودة.", ephemeral: true })
        }
        return interaction.reply({ embeds: [embed] })
      }

      const mainEmbed = await buildMainEmbed(interaction)
      const menu = buildCategoryMenu()

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
          const embed = buildCategoryEmbed(selectedCategory, interaction)

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
        } catch {
          // الرسالة ممكن تكون انحذفت
        }
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
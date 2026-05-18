// ══════════════════════════════════════════════════════════════════
//  Card Button Handler
//  المسار: events/handlers/cardButtonHandler.js
//
//  يُستدعى من events/interactionCreate.js عند customId يبدأ بـ "mycard:"
//
//  Patterns:
//   - mycard:bg:<userId>       → اختيار خلفية (Select Menu)
//   - mycard:theme:<userId>    → اختيار لون (Select Menu)
//   - mycard:badges:<userId>   → اختيار شارات (Select Menu)
//   - mycard:effects:<userId>  → اختيار تأثيرات (Select Menu)
//   - mycard:reset:<userId>    → إعادة تعيين
//   - mycard:info:<userId>     → معلومات الفئات
//
//   Select Menu submissions:
//   - mycard:bg-select:<userId>
//   - mycard:theme-select:<userId>
//   - mycard:badges-select:<userId>
//   - mycard:effects-select:<userId>
// ══════════════════════════════════════════════════════════════════

const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js")

const cardCustomizationSystem = require("../../systems/cardCustomizationSystem")
const logger = require("../../systems/loggerSystem")

// ══════════════════════════════════════════════════════════════════
//  CONFIG
// ══════════════════════════════════════════════════════════════════

const DASHBOARD_URL = process.env.DASHBOARD_URL || "https://rcif-dashboard.onrender.com"

// ─── COOLDOWN ───
const cooldowns = new Map()
const COOLDOWN_MS = 1500

function isOnCooldown(userId) {
  const last = cooldowns.get(userId)
  if (last && Date.now() - last < COOLDOWN_MS) return true
  cooldowns.set(userId, Date.now())
  return false
}

// ─── تنظيف cooldowns كل دقيقة ───
setInterval(() => {
  const now = Date.now()
  for (const [key, time] of cooldowns.entries()) {
    if (now - time > COOLDOWN_MS * 10) cooldowns.delete(key)
  }
}, 60_000)

// ══════════════════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════════════════

function parseCustomId(customId) {
  const parts = customId.split(":")
  return {
    prefix: parts[0],
    action: parts[1],
    userId: parts[2]
  }
}

function verifyOwnership(interaction, ownerUserId) {
  if (interaction.user.id !== ownerUserId) {
    interaction.reply({
      content: "❌ هذه اللوحة مو لك. اكتب `/بطاقتي` عشان تفتح لوحتك.",
      ephemeral: true
    }).catch(() => {})
    return false
  }
  return true
}

async function getActiveTier(userId) {
  const sub = await cardCustomizationSystem.getSubscription(userId)
  if (!sub || sub.status !== "active" || sub.is_expired) return "free"
  return sub.tier
}

function premiumRequiredEmbed(currentTier, requiredFeature) {
  return new EmbedBuilder()
    .setColor(0xf59e0b)
    .setTitle("✨ تحتاج اشتراك")
    .setDescription(
      `هذي الميزة (**${requiredFeature}**) غير متاحة في فئتك الحالية.\n\n` +
      `🥉 **أساسية** — \`$1.99/شهر\` — مميزات بسيطة\n` +
      `🥈 **متقدمة** — \`$3.99/شهر\` — رفع خلفية + ألوان + 5 شارات\n` +
      `👑 **أسطورية** — \`$5.99/شهر\` — كل شي\n\n` +
      `اشترك من الداشبورد للحصول على كل المميزات`
    )
    .setFooter({ text: "افتح الداشبورد من الزر بالأسفل" })
}

function dashboardLinkRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel("✨ اشترك من الداشبورد")
      .setStyle(ButtonStyle.Link)
      .setURL(`${DASHBOARD_URL}/dashboard/card/subscription`)
  )
}

// ══════════════════════════════════════════════════════════════════
//  ACTION HANDLERS
// ══════════════════════════════════════════════════════════════════

// ─── معلومات الفئات (متاح للكل) ───
async function handleInfo(interaction) {
  const embed = new EmbedBuilder()
    .setColor(0x8b5cf6)
    .setTitle("📋 فئات اشتراك Lyn Premium Card")
    .setDescription("اختر الفئة المناسبة لك")
    .addFields(
      {
        name: "🥉 أساسية — $1.99/شهر • $15/سنة",
        value: "• 10 خلفيات جاهزة\n• 5 ثيمات ألوان\n• شارة مشترك\n• معاينة لحظية"
      },
      {
        name: "🥈 متقدمة — $3.99/شهر • $29/سنة",
        value: "• كل ميزات الأساسية\n• 15 خلفية جاهزة\n• 12 ثيم ألوان\n• رفع خلفية شخصية HD\n• Color Picker مخصص\n• 5 شارات\n• تأثير Glow\n• إطار مخصص"
      },
      {
        name: "👑 أسطورية — $5.99/شهر • $45/سنة",
        value: "• كل ميزات المتقدمة\n• خلفيات متحركة (GIF)\n• كل الشارات (10)\n• كل التأثيرات (Glow, Gradient, Animations...)\n• Gradient على XP Bar\n• شارة LEGEND حصرية\n• أولوية الدعم"
      }
    )
    .setFooter({ text: "اشترك من الداشبورد" })

  await interaction.reply({
    embeds: [embed],
    components: [dashboardLinkRow()],
    ephemeral: true
  })
}

// ─── اختيار خلفية ───
async function handleBackgroundPicker(interaction) {
  const tier = await getActiveTier(interaction.user.id)
  if (tier === "free") {
    return interaction.reply({
      embeds: [premiumRequiredEmbed("free", "تغيير الخلفية")],
      components: [dashboardLinkRow()],
      ephemeral: true
    })
  }

  const backgrounds = cardCustomizationSystem.getAvailableBackgrounds(tier)

  if (!backgrounds.length) {
    return interaction.reply({
      content: "❌ لا توجد خلفيات متاحة لفئتك حالياً.",
      ephemeral: true
    })
  }

  // ─── بناء Select Menu ───
  const options = backgrounds.slice(0, 25).map(bg => ({
    label: bg.name,
    value: bg.id,
    description: bg.description?.slice(0, 100) || "",
    emoji: bg.emoji || "🖼️"
  }))

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`mycard:bg-select:${interaction.user.id}`)
    .setPlaceholder("اختر خلفية لبطاقتك")
    .addOptions(options)

  const row = new ActionRowBuilder().addComponents(menu)

  await interaction.reply({
    content: `🖼️ **اختر خلفية بطاقتك** (متاح ${backgrounds.length} خلفية لفئة **${tier}**)`,
    components: [row],
    ephemeral: true
  })
}

// ─── اختيار لون ───
async function handleThemePicker(interaction) {
  const tier = await getActiveTier(interaction.user.id)
  if (tier === "free") {
    return interaction.reply({
      embeds: [premiumRequiredEmbed("free", "تغيير الألوان")],
      components: [dashboardLinkRow()],
      ephemeral: true
    })
  }

  const themes = cardCustomizationSystem.getAvailableThemes(tier)

  const options = themes.slice(0, 25).map(t => ({
    label: t.name,
    value: t.id,
    description: t.description?.slice(0, 100) || "",
    emoji: t.emoji || "🎨"
  }))

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`mycard:theme-select:${interaction.user.id}`)
    .setPlaceholder("اختر لون بطاقتك")
    .addOptions(options)

  const row = new ActionRowBuilder().addComponents(menu)

  await interaction.reply({
    content: `🎨 **اختر لون بطاقتك** (متاح ${themes.length} ثيم لفئة **${tier}**)`,
    components: [row],
    ephemeral: true
  })
}

// ─── اختيار شارات ───
async function handleBadgesPicker(interaction) {
  const tier = await getActiveTier(interaction.user.id)
  const features = cardCustomizationSystem.getTierFeatures(tier)

  if (features.badges === 0) {
    return interaction.reply({
      embeds: [premiumRequiredEmbed(tier, "الشارات")],
      components: [dashboardLinkRow()],
      ephemeral: true
    })
  }

  const badges = cardCustomizationSystem.getAvailableBadges(tier)
  const currentSettings = await cardCustomizationSystem.getSettings(interaction.user.id)
  const currentBadges = currentSettings?.badges || []

  const options = badges.slice(0, 25).map(b => ({
    label: b.name,
    value: b.id,
    description: b.description?.slice(0, 100) || "",
    emoji: b.emoji || "🏆",
    default: currentBadges.includes(b.id)
  }))

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`mycard:badges-select:${interaction.user.id}`)
    .setPlaceholder(`اختر حتى ${features.badges} شارات`)
    .setMinValues(0)
    .setMaxValues(Math.min(features.badges, options.length))
    .addOptions(options)

  const row = new ActionRowBuilder().addComponents(menu)

  await interaction.reply({
    content: `🏆 **اختر شاراتك** (يمكنك اختيار حتى ${features.badges} شارات)`,
    components: [row],
    ephemeral: true
  })
}

// ─── اختيار تأثيرات ───
async function handleEffectsPicker(interaction) {
  const tier = await getActiveTier(interaction.user.id)
  const features = cardCustomizationSystem.getTierFeatures(tier)

  if (features.effects === 0) {
    return interaction.reply({
      embeds: [premiumRequiredEmbed(tier, "التأثيرات")],
      components: [dashboardLinkRow()],
      ephemeral: true
    })
  }

  const effects = cardCustomizationSystem.getAvailableEffects(tier)
  const currentSettings = await cardCustomizationSystem.getSettings(interaction.user.id)
  const currentEffects = currentSettings?.effects || {}

  const options = effects.slice(0, 25).map(e => ({
    label: e.name,
    value: e.id,
    description: e.description?.slice(0, 100) || "",
    emoji: e.emoji || "✨",
    default: !!currentEffects[e.id]
  }))

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`mycard:effects-select:${interaction.user.id}`)
    .setPlaceholder(`اختر حتى ${features.effects} تأثيرات`)
    .setMinValues(0)
    .setMaxValues(Math.min(features.effects, options.length))
    .addOptions(options)

  const row = new ActionRowBuilder().addComponents(menu)

  await interaction.reply({
    content: `✨ **اختر التأثيرات** (يمكنك اختيار حتى ${features.effects} تأثيرات)`,
    components: [row],
    ephemeral: true
  })
}

// ─── إعادة تعيين ───
async function handleReset(interaction) {
  const tier = await getActiveTier(interaction.user.id)
  if (tier === "free") {
    return interaction.reply({
      content: "ℹ️ بطاقتك بالفعل بالشكل الافتراضي.",
      ephemeral: true
    })
  }

  await cardCustomizationSystem.resetSettings(interaction.user.id)

  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(0x22c55e)
        .setTitle("🔄 تم إعادة التعيين")
        .setDescription("رجعت بطاقتك للشكل الافتراضي.\nاكتب `/بطاقتي` لتشوف النتيجة.")
    ],
    ephemeral: true
  })
}

// ══════════════════════════════════════════════════════════════════
//  SELECT MENU HANDLERS
// ══════════════════════════════════════════════════════════════════

async function handleBackgroundSelect(interaction) {
  const bgId = interaction.values[0]
  const tier = await getActiveTier(interaction.user.id)

  // التحقق من توفّر الخلفية لهذه الفئة
  const available = cardCustomizationSystem.getAvailableBackgrounds(tier)
  if (!available.find(b => b.id === bgId)) {
    return interaction.update({
      content: "❌ هذي الخلفية غير متاحة لفئتك.",
      embeds: [],
      components: []
    })
  }

  await cardCustomizationSystem.saveSettings(interaction.user.id, {
    background_id: bgId,
    custom_background_url: null
  })

  const bgData = available.find(b => b.id === bgId)
  await interaction.update({
    content: `✅ تم تغيير الخلفية إلى **${bgData?.name || bgId}**\nاكتب \`/بطاقتي\` لمشاهدة النتيجة.`,
    embeds: [],
    components: []
  })
}

async function handleThemeSelect(interaction) {
  const themeId = interaction.values[0]
  const tier = await getActiveTier(interaction.user.id)

  const available = cardCustomizationSystem.getAvailableThemes(tier)
  if (!available.find(t => t.id === themeId)) {
    return interaction.update({
      content: "❌ هذا الثيم غير متاح لفئتك.",
      embeds: [],
      components: []
    })
  }

  await cardCustomizationSystem.saveSettings(interaction.user.id, {
    theme_id: themeId
  })

  const themeData = available.find(t => t.id === themeId)
  await interaction.update({
    content: `✅ تم تغيير اللون إلى **${themeData?.name || themeId}**\nاكتب \`/بطاقتي\` لمشاهدة النتيجة.`,
    embeds: [],
    components: []
  })
}

async function handleBadgesSelect(interaction) {
  const selectedBadges = interaction.values
  const tier = await getActiveTier(interaction.user.id)
  const features = cardCustomizationSystem.getTierFeatures(tier)

  if (selectedBadges.length > features.badges) {
    return interaction.update({
      content: `❌ فئتك تسمح بـ ${features.badges} شارات فقط.`,
      embeds: [],
      components: []
    })
  }

  // التحقق من توفّر كل الشارات
  const available = cardCustomizationSystem.getAvailableBadges(tier)
  const availableIds = new Set(available.map(b => b.id))
  const invalid = selectedBadges.filter(id => !availableIds.has(id))

  if (invalid.length > 0) {
    return interaction.update({
      content: "❌ بعض الشارات غير متاحة لفئتك.",
      embeds: [],
      components: []
    })
  }

  await cardCustomizationSystem.saveSettings(interaction.user.id, {
    badges: selectedBadges
  })

  await interaction.update({
    content: `✅ تم تحديث الشارات (${selectedBadges.length}/${features.badges})\nاكتب \`/بطاقتي\` لمشاهدة النتيجة.`,
    embeds: [],
    components: []
  })
}

async function handleEffectsSelect(interaction) {
  const selectedEffects = interaction.values
  const tier = await getActiveTier(interaction.user.id)
  const features = cardCustomizationSystem.getTierFeatures(tier)

  if (selectedEffects.length > features.effects) {
    return interaction.update({
      content: `❌ فئتك تسمح بـ ${features.effects} تأثيرات فقط.`,
      embeds: [],
      components: []
    })
  }

  // التحقق من توفّر كل التأثيرات
  const available = cardCustomizationSystem.getAvailableEffects(tier)
  const availableIds = new Set(available.map(e => e.id))
  const invalid = selectedEffects.filter(id => !availableIds.has(id))

  if (invalid.length > 0) {
    return interaction.update({
      content: "❌ بعض التأثيرات غير متاحة لفئتك.",
      embeds: [],
      components: []
    })
  }

  // تحويل من array إلى object: { glow: true, gradient: true }
  const effectsObj = {}
  for (const id of selectedEffects) effectsObj[id] = true

  await cardCustomizationSystem.saveSettings(interaction.user.id, {
    effects: effectsObj
  })

  await interaction.update({
    content: `✅ تم تحديث التأثيرات (${selectedEffects.length}/${features.effects})\nاكتب \`/بطاقتي\` لمشاهدة النتيجة.`,
    embeds: [],
    components: []
  })
}

// ══════════════════════════════════════════════════════════════════
//  MAIN ENTRY — BUTTON HANDLER
// ══════════════════════════════════════════════════════════════════

async function handleCardButton(interaction) {
  try {
    const customId = interaction.customId
    if (!customId?.startsWith("mycard:")) return false

    const { action, userId } = parseCustomId(customId)

    // ─── معلومات الفئات: متاح للكل (مو محتاج verifyOwnership) ───
    if (action === "info") {
      return await handleInfo(interaction)
    }

    // ─── باقي الأزرار: للمالك فقط ───
    if (!verifyOwnership(interaction, userId)) return true

    // ─── Cooldown ───
    if (isOnCooldown(interaction.user.id)) {
      await interaction.reply({
        content: "⏳ انتظر ثانية قبل الضغط مرة ثانية.",
        ephemeral: true
      }).catch(() => {})
      return true
    }

    switch (action) {
      case "bg":      return await handleBackgroundPicker(interaction)
      case "theme":   return await handleThemePicker(interaction)
      case "badges":  return await handleBadgesPicker(interaction)
      case "effects": return await handleEffectsPicker(interaction)
      case "reset":   return await handleReset(interaction)
      default:
        logger.warn("CARD_BUTTON_UNKNOWN_ACTION", { action, customId })
        return false
    }

  } catch (err) {
    logger.error("CARD_BUTTON_HANDLER_FAILED", {
      customId: interaction.customId,
      userId: interaction.user?.id,
      error: err.message,
      stack: err.stack
    })

    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: "❌ حدث خطأ، حاول مرة ثانية.",
          ephemeral: true
        })
      }
    } catch {}

    return true
  }
}

// ══════════════════════════════════════════════════════════════════
//  MAIN ENTRY — SELECT MENU HANDLER
// ══════════════════════════════════════════════════════════════════

async function handleCardSelectMenu(interaction) {
  try {
    const customId = interaction.customId
    if (!customId?.startsWith("mycard:")) return false

    const { action, userId } = parseCustomId(customId)

    if (!verifyOwnership(interaction, userId)) return true

    if (isOnCooldown(interaction.user.id)) {
      await interaction.reply({
        content: "⏳ انتظر ثانية قبل الاختيار مرة ثانية.",
        ephemeral: true
      }).catch(() => {})
      return true
    }

    switch (action) {
      case "bg-select":      return await handleBackgroundSelect(interaction)
      case "theme-select":   return await handleThemeSelect(interaction)
      case "badges-select":  return await handleBadgesSelect(interaction)
      case "effects-select": return await handleEffectsSelect(interaction)
      default:
        logger.warn("CARD_SELECT_UNKNOWN_ACTION", { action, customId })
        return false
    }

  } catch (err) {
    logger.error("CARD_SELECT_HANDLER_FAILED", {
      customId: interaction.customId,
      userId: interaction.user?.id,
      error: err.message,
      stack: err.stack
    })

    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: "❌ حدث خطأ، حاول مرة ثانية.",
          ephemeral: true
        })
      }
    } catch {}

    return true
  }
}

// ══════════════════════════════════════════════════════════════════
//  EXPORTS
// ══════════════════════════════════════════════════════════════════

module.exports = {
  handleCardButton,
  handleCardSelectMenu
}
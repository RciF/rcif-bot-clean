// ══════════════════════════════════════════════════════════════════
//  HELP INTERACTION HANDLER — معالج تفاعلات /help
//  المسار: systems/helpInteractionHandler.js
//
//  المسؤوليات:
//   1) معالجة كل ضغطات Select Menus والأزرار في /help
//   2) التنقل بين الصفحات (رئيسية ← فئة ← أمر)
//   3) فحص ديناميكي لرتبة البوت في السيرفر
//   4) جلب مستوى اشتراك السيرفر الحالي
//
//  Custom IDs المستخدمة:
//   - help:category              → اختيار فئة من Select Menu
//   - help:command:<categoryId>  → اختيار أمر من Select Menu
//   - help:back-to-category:<id> → زر رجوع للفئة
//   - help:home                  → زر العودة للقائمة الرئيسية
// ══════════════════════════════════════════════════════════════════

const { MessageFlags } = require("discord.js")

const helpSystem    = require("./helpSystem")
const helpFormatter = require("./helpFormatter")
const planGateSystem = require("./planGateSystem")
const logger = require("./loggerSystem")

// ══════════════════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════════════════

/**
 * جلب مستوى اشتراك السيرفر
 */
async function getGuildTier(guildId) {
  if (!guildId) return "free"

  try {
    const sub = await planGateSystem.getGuildSubscription(guildId)
    return sub?.plan_id || "free"
  } catch (err) {
    logger.error("HELP_GET_GUILD_TIER_FAILED", { error: err.message })
    return "free"
  }
}

/**
 * جلب معلومات البوت في السيرفر (للفحص الديناميكي لرتبة البوت)
 */
function getBotContext(guild) {
  if (!guild) return null

  try {
    const botMember = guild.members.me
    if (!botMember) return null

    const highestRole = botMember.roles.highest
    if (!highestRole) return null

    return {
      botRolePosition: highestRole.position,
      botRoleName: highestRole.name,
      totalRoles: guild.roles.cache.size
    }
  } catch (err) {
    return null
  }
}

/**
 * رد آمن — يتعامل مع interaction expired
 */
async function safeUpdate(interaction, payload) {
  try {
    if (interaction.replied || interaction.deferred) {
      return await interaction.editReply(payload)
    }
    return await interaction.update(payload)
  } catch (err) {
    if (err.code === 10062 || err.code === 40060) {
      // Interaction expired أو already acknowledged
      return null
    }
    logger.error("HELP_INTERACTION_UPDATE_FAILED", {
      code: err.code,
      message: err.message
    })
    return null
  }
}

// ══════════════════════════════════════════════════════════════════
//  HOME PAGE — القائمة الرئيسية
// ══════════════════════════════════════════════════════════════════

/**
 * بناء الـ payload للصفحة الرئيسية
 * يُستخدم من /help نفسه أو من زر "القائمة الرئيسية"
 */
async function buildHomePagePayload(client, guildId) {
  const visibleCategories = await helpSystem.getVisibleCategories(guildId)
  const stats = helpSystem.getStats()

  if (visibleCategories.length === 0) {
    return {
      content: "❌ ما فيه فئات متاحة حالياً.",
      embeds: [],
      components: [],
      flags: MessageFlags.Ephemeral
    }
  }

  const embed = helpFormatter.buildMainEmbed(client, visibleCategories, stats)
  const menu = helpFormatter.buildCategorySelectMenu(visibleCategories)

  return {
    embeds: [embed],
    components: [menu],
    flags: MessageFlags.Ephemeral
  }
}

/**
 * بناء الـ payload لصفحة فئة معينة
 */
async function buildCategoryPagePayload(client, guildId, categoryId) {
  const visibleCategories = await helpSystem.getVisibleCategories(guildId)

  // ✅ تأكد إن الفئة موجودة ومرئية
  const categoryExists = visibleCategories.some(c => c.id === categoryId)
  if (!categoryExists) {
    return {
      embeds: [helpFormatter.buildEmptyCategoryEmbed(categoryId)],
      components: [helpFormatter.buildCategorySelectMenu(visibleCategories)],
      flags: MessageFlags.Ephemeral
    }
  }

  const commands = helpSystem.getCategoryCommands(categoryId)
  const userTier = await getGuildTier(guildId)

  if (commands.length === 0) {
    return {
      embeds: [helpFormatter.buildEmptyCategoryEmbed(categoryId)],
      components: [helpFormatter.buildCategorySelectMenu(visibleCategories, categoryId)],
      flags: MessageFlags.Ephemeral
    }
  }

  const embed = helpFormatter.buildCategoryEmbed(client, categoryId, commands, userTier)
  const categoryMenu = helpFormatter.buildCategorySelectMenu(visibleCategories, categoryId)
  const commandMenu = helpFormatter.buildCommandSelectMenu(categoryId, commands)

  return {
    embeds: [embed],
    components: [categoryMenu, commandMenu],
    flags: MessageFlags.Ephemeral
  }
}

/**
 * بناء الـ payload لصفحة تفاصيل أمر معين
 */
async function buildCommandDetailPayload(client, guild, guildId, commandQuery) {
  const entry = helpSystem.getCommand(commandQuery)

  if (!entry) {
    return {
      embeds: [helpFormatter.buildNotFoundEmbed(commandQuery)],
      components: [],
      flags: MessageFlags.Ephemeral
    }
  }

  const userTier = await getGuildTier(guildId)
  const botContext = getBotContext(guild)
  const isAccessible = helpFormatter.canAccessTier(userTier, entry.subscriptionTier || "free")

  const embed = helpFormatter.buildCommandDetailEmbed(client, entry, userTier, botContext)
  const buttons = helpFormatter.buildCommandDetailButtons(entry, isAccessible)

  return {
    embeds: [embed],
    components: [buttons],
    flags: MessageFlags.Ephemeral
  }
}

// ══════════════════════════════════════════════════════════════════
//  INTERACTION HANDLERS
// ══════════════════════════════════════════════════════════════════

/**
 * معالج الـ Select Menus
 */
async function handleSelectMenu(interaction) {
  const customId = interaction.customId

  // ── اختيار فئة ──
  if (customId === "help:category") {
    const categoryId = interaction.values[0]
    const payload = await buildCategoryPagePayload(
      interaction.client,
      interaction.guildId,
      categoryId
    )
    // إزالة flags لأن update ما يقبلها
    delete payload.flags
    await safeUpdate(interaction, payload)
    return true
  }

  // ── اختيار أمر داخل فئة ──
  if (customId.startsWith("help:command:")) {
    const commandName = interaction.values[0]
    const payload = await buildCommandDetailPayload(
      interaction.client,
      interaction.guild,
      interaction.guildId,
      commandName
    )
    delete payload.flags
    await safeUpdate(interaction, payload)
    return true
  }

  return false
}

/**
 * معالج الأزرار
 */
async function handleButton(interaction) {
  const customId = interaction.customId

  // ── زر "رجوع للفئة" ──
  if (customId.startsWith("help:back-to-category:")) {
    const categoryId = customId.replace("help:back-to-category:", "")
    const payload = await buildCategoryPagePayload(
      interaction.client,
      interaction.guildId,
      categoryId
    )
    delete payload.flags
    await safeUpdate(interaction, payload)
    return true
  }

  // ── زر "القائمة الرئيسية" ──
  if (customId === "help:home") {
    const payload = await buildHomePagePayload(
      interaction.client,
      interaction.guildId
    )
    delete payload.flags
    await safeUpdate(interaction, payload)
    return true
  }

  return false
}

/**
 * المعالج الرئيسي — يُستدعى من interactionCreate event
 *
 * يرجع:
 *  - true: تعامل مع الـ interaction
 *  - false: ما تعامل معها (ليست تابعة للـ /help)
 */
async function handle(interaction) {
  try {
    // الـ Select Menus
    if (interaction.isStringSelectMenu()) {
      if (interaction.customId.startsWith("help:")) {
        return await handleSelectMenu(interaction)
      }
    }

    // الأزرار
    if (interaction.isButton()) {
      if (interaction.customId.startsWith("help:")) {
        return await handleButton(interaction)
      }
    }

    return false

  } catch (error) {
    logger.error("HELP_INTERACTION_HANDLE_FAILED", {
      customId: interaction.customId,
      error: error.message
    })

    // محاولة رد للمستخدم
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: "❌ حدث خطأ أثناء معالجة طلبك. حاول مرة ثانية.",
          flags: MessageFlags.Ephemeral
        })
      }
    } catch {}

    return true // اعتبرناها تم التعامل معها (حتى لو فشلت)
  }
}

// ══════════════════════════════════════════════════════════════════
//  EXPORTS
// ══════════════════════════════════════════════════════════════════

module.exports = {
  // Main entry point (يُستدعى من interactionCreate)
  handle,

  // Builders (يُستدعون من /help command نفسه)
  buildHomePagePayload,
  buildCategoryPagePayload,
  buildCommandDetailPayload,

  // Helpers
  getGuildTier,
  getBotContext
}
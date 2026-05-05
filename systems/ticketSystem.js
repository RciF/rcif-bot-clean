const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ChannelType,
  PermissionFlagsBits
} = require("discord.js")

const databaseSystem = require("./databaseSystem")
const logger = require("./loggerSystem")
const scheduler = require("./schedulerSystem")

// ══════════════════════════════════════
//  CONSTANTS
// ══════════════════════════════════════

const TICKET_CATEGORIES = {
  support:    { label: "دعم فني",   emoji: "🔧", color: 0x3b82f6, description: "مشاكل تقنية أو استفسارات" },
  complaint:  { label: "شكوى",      emoji: "📢", color: 0xef4444, description: "تقديم شكوى على عضو أو مشكلة" },
  suggestion: { label: "اقتراح",    emoji: "💡", color: 0x22c55e, description: "اقتراح فكرة أو تحسين" },
  apply:      { label: "تقديم طلب", emoji: "📋", color: 0xa855f7, description: "التقديم على منصب أو فريق" },
  other:      { label: "أخرى",      emoji: "📩", color: 0x6b7280, description: "أي شيء آخر" }
}

const TICKET_STATUS = {
  open:   "مفتوحة",
  closed: "مغلقة",
  locked: "مقفلة"
}

// ══════════════════════════════════════
//  نظام الأولوية الحقيقي
// ══════════════════════════════════════

const PRIORITY_CONFIG = {
  low: {
    label: "🟢 عادية",
    shortLabel: "عادية",
    color: 0x22c55e,
    emoji: "🟢",
    value: "low"
  },
  normal: {
    label: "🟡 متوسطة",
    shortLabel: "متوسطة",
    color: 0xf59e0b,
    emoji: "🟡",
    value: "normal"
  },
  high: {
    label: "🔴 عالية",
    shortLabel: "عالية",
    color: 0xef4444,
    emoji: "🔴",
    value: "high"
  }
}

// الدالة القديمة للتوافق (deprecated)
const PRIORITY_LABELS = {
  low:    "🟢 عادية",
  normal: "🟡 متوسطة",
  high:   "🔴 عالية",
  urgent: "🔴 عالية"
}

// Discord limit: max 50 channels per category
const MAX_CHANNELS_PER_CATEGORY = 50

// ══════════════════════════════════════
//  SETTINGS HELPERS
// ══════════════════════════════════════

async function getSettings(guildId) {
  try {
    const result = await databaseSystem.queryOne(
      "SELECT * FROM ticket_settings WHERE guild_id = $1",
      [guildId]
    )
    return result || null
  } catch (error) {
    logger.error("TICKET_GET_SETTINGS_FAILED", { error: error.message })
    return null
  }
}

async function saveSettings(guildId, data) {
  try {
    await databaseSystem.query(`
      INSERT INTO ticket_settings (guild_id, category_id, log_channel_id, support_role_id, welcome_message, max_open_tickets, auto_close_hours, transcript_enabled, enabled)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (guild_id) DO UPDATE SET
        category_id = EXCLUDED.category_id,
        log_channel_id = EXCLUDED.log_channel_id,
        support_role_id = EXCLUDED.support_role_id,
        welcome_message = EXCLUDED.welcome_message,
        max_open_tickets = EXCLUDED.max_open_tickets,
        auto_close_hours = EXCLUDED.auto_close_hours,
        transcript_enabled = EXCLUDED.transcript_enabled,
        enabled = EXCLUDED.enabled,
        updated_at = NOW()
    `, [
      guildId,
      data.category_id || null,
      data.log_channel_id || null,
      data.support_role_id || null,
      data.welcome_message || "مرحباً! فريق الدعم سيكون معك قريباً.",
      data.max_open_tickets || 1,
      data.auto_close_hours || 48,
      data.transcript_enabled !== false,
      data.enabled !== false
    ])
    return true
  } catch (error) {
    logger.error("TICKET_SAVE_SETTINGS_FAILED", { error: error.message })
    return false
  }
}

// ══════════════════════════════════════
//  TICKET DATABASE HELPERS
// ══════════════════════════════════════

async function createTicket(data) {
  try {
    const result = await databaseSystem.queryOne(`
      INSERT INTO tickets (guild_id, channel_id, user_id, category, status, priority)
      VALUES ($1, $2, $3, $4, 'open', 'low')
      RETURNING *
    `, [data.guild_id, data.channel_id, data.user_id, data.category || "other"])
    return result
  } catch (error) {
    logger.error("TICKET_CREATE_FAILED", { error: error.message })
    return null
  }
}

async function getTicketByChannel(channelId) {
  try {
    return await databaseSystem.queryOne(
      "SELECT * FROM tickets WHERE channel_id = $1",
      [channelId]
    )
  } catch (error) {
    logger.error("TICKET_GET_BY_CHANNEL_FAILED", { error: error.message })
    return null
  }
}

async function getOpenTickets(guildId, userId) {
  try {
    const result = await databaseSystem.query(
      "SELECT * FROM tickets WHERE guild_id = $1 AND user_id = $2 AND status = 'open'",
      [guildId, userId]
    )
    return result.rows || []
  } catch (error) {
    logger.error("TICKET_GET_OPEN_FAILED", { error: error.message })
    return []
  }
}

async function updateTicket(channelId, data) {
  try {
    const sets = []
    const values = []
    let index = 1

    for (const [key, value] of Object.entries(data)) {
      sets.push(`${key} = $${index}`)
      values.push(value)
      index++
    }

    values.push(channelId)

    await databaseSystem.query(
      `UPDATE tickets SET ${sets.join(", ")} WHERE channel_id = $${index}`,
      values
    )
    return true
  } catch (error) {
    logger.error("TICKET_UPDATE_FAILED", { error: error.message })
    return false
  }
}

async function getTicketCount(guildId) {
  try {
    const result = await databaseSystem.queryOne(
      "SELECT COUNT(*) as total FROM tickets WHERE guild_id = $1",
      [guildId]
    )
    return parseInt(result?.total || 0)
  } catch (error) {
    return 0
  }
}

// ✅ FIX: query واحد بدل 3 (تحسين أداء)
async function getTicketStats(guildId) {
  try {
    const result = await databaseSystem.queryOne(`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'open')   AS open,
        COUNT(*) FILTER (WHERE status = 'closed') AS closed
      FROM tickets
      WHERE guild_id = $1
    `, [guildId])

    return {
      total:  parseInt(result?.total  || 0),
      open:   parseInt(result?.open   || 0),
      closed: parseInt(result?.closed || 0)
    }
  } catch (error) {
    return { total: 0, open: 0, closed: 0 }
  }
}

// ══════════════════════════════════════
//  EMBED BUILDERS
// ══════════════════════════════════════

function buildSetupEmbed(guild) {
  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("🎫 نظام التذاكر")
    .setDescription(
      "**هل تحتاج مساعدة؟** اضغط الزر أدناه لفتح تذكرة جديدة.\n\n" +
      "📌 **التعليمات:**\n" +
      "• اختر تصنيف التذكرة المناسب\n" +
      "• اشرح مشكلتك بوضوح\n" +
      "• انتظر رد فريق الدعم\n" +
      "• لا تفتح أكثر من تذكرة لنفس المشكلة"
    )
    .setThumbnail(guild.iconURL({ dynamic: true, size: 256 }))
    .setFooter({ text: `${guild.name} • نظام التذاكر`, iconURL: guild.iconURL({ dynamic: true }) })
    .setTimestamp()
}

function buildOpenButton() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket_open")
      .setLabel("فتح تذكرة")
      .setEmoji("🎫")
      .setStyle(ButtonStyle.Primary)
  )
}

function buildCategoryMenu() {
  const options = Object.entries(TICKET_CATEGORIES).map(([key, cat]) => ({
    label: cat.label,
    description: cat.description,
    value: key,
    emoji: cat.emoji
  }))

  const menu = new StringSelectMenuBuilder()
    .setCustomId("ticket_category_select")
    .setPlaceholder("📂 اختر تصنيف التذكرة...")
    .addOptions(options)

  return new ActionRowBuilder().addComponents(menu)
}

// قائمة تغيير الأولوية (للستاف فقط)
function buildPriorityMenu() {
  const options = Object.entries(PRIORITY_CONFIG).map(([key, p]) => ({
    label: p.label,
    description: getPriorityDescription(key),
    value: key,
    emoji: p.emoji
  }))

  const menu = new StringSelectMenuBuilder()
    .setCustomId("ticket_priority_select")
    .setPlaceholder("🎯 تغيير الأولوية...")
    .addOptions(options)

  return new ActionRowBuilder().addComponents(menu)
}

function getPriorityDescription(priority) {
  const descriptions = {
    low:    "مشكلة بسيطة، لا تستعجل",
    normal: "مشكلة متوسطة تحتاج اهتمام",
    high:   "مشكلة عاجلة تحتاج تدخل فوري"
  }
  return descriptions[priority] || ""
}

function buildTicketWelcomeEmbed(user, category, ticketNumber, welcomeMessage, priority = "low") {
  const cat = TICKET_CATEGORIES[category] || TICKET_CATEGORIES.other
  const prio = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.low

  return new EmbedBuilder()
    .setColor(prio.color)
    .setTitle(`${cat.emoji} تذكرة #${ticketNumber} — ${cat.label}`)
    .setDescription(
      `مرحباً ${user}!\n\n` +
      `${welcomeMessage}\n\n` +
      "**📝 من فضلك اشرح مشكلتك أو طلبك بالتفصيل.**"
    )
    .addFields(
      { name: "👤 صاحب التذكرة", value: `${user}`, inline: true },
      { name: "📂 التصنيف", value: `${cat.emoji} ${cat.label}`, inline: true },
      { name: "🎯 الأولوية", value: `${prio.emoji} ${prio.shortLabel}`, inline: true },
      { name: "📊 الحالة", value: "🟢 مفتوحة", inline: true }
    )
    .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 128 }))
    .setFooter({ text: "استخدم الأزرار أدناه لإدارة التذكرة" })
    .setTimestamp()
}

function buildTicketControlButtons(isLocked = false) {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket_close")
      .setLabel("إغلاق التذكرة")
      .setEmoji("🔒")
      .setStyle(ButtonStyle.Danger),

    new ButtonBuilder()
      .setCustomId(isLocked ? "ticket_unlock" : "ticket_lock")
      .setLabel(isLocked ? "فتح القفل" : "قفل التذكرة")
      .setEmoji(isLocked ? "🔓" : "🔐")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("ticket_claim")
      .setLabel("استلام التذكرة")
      .setEmoji("🙋")
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId("ticket_transcript")
      .setLabel("حفظ المحادثة")
      .setEmoji("📜")
      .setStyle(ButtonStyle.Secondary)
  )

  return row1
}

// زر تغيير الأولوية منفصل (للستاف)
function buildPriorityButton() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket_change_priority")
      .setLabel("تغيير الأولوية")
      .setEmoji("🎯")
      .setStyle(ButtonStyle.Primary)
  )
}

function buildCloseConfirmButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket_close_confirm")
      .setLabel("تأكيد الإغلاق")
      .setEmoji("✅")
      .setStyle(ButtonStyle.Danger),

    new ButtonBuilder()
      .setCustomId("ticket_close_cancel")
      .setLabel("إلغاء")
      .setEmoji("❌")
      .setStyle(ButtonStyle.Secondary)
  )
}

function buildAfterCloseButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket_transcript")
      .setLabel("حفظ المحادثة")
      .setEmoji("📜")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("ticket_reopen")
      .setLabel("إعادة فتح")
      .setEmoji("🔓")
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId("ticket_delete")
      .setLabel("حذف التذكرة")
      .setEmoji("🗑️")
      .setStyle(ButtonStyle.Danger)
  )
}

// ══════════════════════════════════════
//  TRANSCRIPT GENERATOR
// ══════════════════════════════════════

async function generateTranscript(channel, ticket) {
  try {
    const messages = []
    let lastId = null

    for (let i = 0; i < 5; i++) {
      const options = { limit: 100 }
      if (lastId) options.before = lastId

      const fetched = await channel.messages.fetch(options)
      if (fetched.size === 0) break

      messages.push(...fetched.values())
      lastId = fetched.last().id

      if (fetched.size < 100) break
    }

    messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp)

    const cat = TICKET_CATEGORIES[ticket.category] || TICKET_CATEGORIES.other
    const prio = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.low

    let transcript = ""
    transcript += "╔══════════════════════════════════════════╗\n"
    transcript += `║  📋 سجل تذكرة #${ticket.id}\n`
    transcript += "╠══════════════════════════════════════════╣\n"
    transcript += `║  📂 التصنيف: ${cat.emoji} ${cat.label}\n`
    transcript += `║  🎯 الأولوية: ${prio.emoji} ${prio.shortLabel}\n`
    transcript += `║  👤 صاحب التذكرة: ${ticket.user_id}\n`
    transcript += `║  📅 تاريخ الفتح: ${new Date(ticket.created_at).toLocaleString("ar-SA")}\n`

    if (ticket.closed_at) {
      transcript += `║  📅 تاريخ الإغلاق: ${new Date(ticket.closed_at).toLocaleString("ar-SA")}\n`
    }

    if (ticket.claimed_by) {
      transcript += `║  🙋 المستلم: ${ticket.claimed_by}\n`
    }

    transcript += `║  💬 عدد الرسائل: ${messages.length}\n`
    transcript += "╚══════════════════════════════════════════╝\n\n"

    for (const msg of messages) {
      const time = new Date(msg.createdTimestamp).toLocaleString("ar-SA")
      const author = msg.author?.tag || "غير معروف"
      const isBot = msg.author?.bot ? " [بوت]" : ""

      transcript += `┌─ ${author}${isBot} • ${time}\n`

      if (msg.content) {
        transcript += `│  ${msg.content}\n`
      }

      if (msg.attachments.size > 0) {
        msg.attachments.forEach(att => {
          transcript += `│  📎 مرفق: ${att.url}\n`
        })
      }

      if (msg.embeds.length > 0) {
        transcript += `│  📌 [Embed: ${msg.embeds[0]?.title || "بدون عنوان"}]\n`
      }

      transcript += "└───────────────────────────\n\n"
    }

    transcript += "═══════════════════════════════════════════\n"
    transcript += `تم إنشاء هذا السجل تلقائياً بواسطة Lyn Bot\n`
    transcript += "═══════════════════════════════════════════\n"

    return { transcript, messageCount: messages.length }

  } catch (error) {
    logger.error("TICKET_TRANSCRIPT_FAILED", { error: error.message })
    return { transcript: "فشل في إنشاء السجل", messageCount: 0 }
  }
}

// ══════════════════════════════════════
//  LOG SYSTEM
// ══════════════════════════════════════

async function sendLog(guild, ticket, action, executor, extra = {}) {
  try {
    const settings = await getSettings(guild.id)
    if (!settings?.log_channel_id) return

    const logChannel = guild.channels.cache.get(settings.log_channel_id)
    if (!logChannel) return

    const cat = TICKET_CATEGORIES[ticket.category] || TICKET_CATEGORIES.other
    const prio = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.low

    const colors = {
      open:            0x22c55e,
      close:           0xef4444,
      lock:            0xf59e0b,
      unlock:          0x3b82f6,
      claim:           0xa855f7,
      reopen:          0x06b6d4,
      delete:          0x6b7280,
      transcript:      0xeab308,
      priority_change: 0x8b5cf6,
      auto_close:      0x6b7280
    }

    const titles = {
      open:            "🎫 تذكرة جديدة",
      close:           "🔒 تذكرة مغلقة",
      lock:            "🔐 تذكرة مقفلة",
      unlock:          "🔓 تم فتح القفل",
      claim:           "🙋 تم استلام تذكرة",
      reopen:          "🔓 إعادة فتح تذكرة",
      delete:          "🗑️ حذف تذكرة",
      transcript:      "📜 حفظ محادثة",
      priority_change: "🎯 تغيير الأولوية",
      auto_close:      "⏰ إغلاق تلقائي (عدم نشاط)"
    }

    const embed = new EmbedBuilder()
      .setColor(colors[action] || 0x5865f2)
      .setTitle(titles[action] || `📋 تذكرة #${ticket.id}`)
      .addFields(
        { name: "🔢 رقم التذكرة", value: `#${ticket.id}`, inline: true },
        { name: "📂 التصنيف", value: `${cat.emoji} ${cat.label}`, inline: true },
        { name: "🎯 الأولوية", value: `${prio.emoji} ${prio.shortLabel}`, inline: true },
        { name: "👤 صاحب التذكرة", value: `<@${ticket.user_id}>`, inline: true },
        { name: "🛠️ المنفذ", value: `${executor}`, inline: true }
      )
      .setTimestamp()

    if (extra.reason) {
      embed.addFields({ name: "📝 السبب", value: extra.reason, inline: false })
    }

    if (extra.messageCount !== undefined) {
      embed.addFields({ name: "💬 عدد الرسائل", value: `${extra.messageCount}`, inline: true })
    }

    if (extra.duration) {
      embed.addFields({ name: "⏱️ مدة التذكرة", value: extra.duration, inline: true })
    }

    if (extra.oldPriority && extra.newPriority) {
      const oldP = PRIORITY_CONFIG[extra.oldPriority] || PRIORITY_CONFIG.low
      const newP = PRIORITY_CONFIG[extra.newPriority] || PRIORITY_CONFIG.low
      embed.addFields({
        name: "🔄 تغيير الأولوية",
        value: `${oldP.emoji} ${oldP.shortLabel} → ${newP.emoji} ${newP.shortLabel}`,
        inline: false
      })
    }

    await logChannel.send({ embeds: [embed] })

  } catch (error) {
    logger.error("TICKET_LOG_FAILED", { error: error.message })
  }
}

function formatDuration(start, end) {
  const diff = (end || Date.now()) - new Date(start).getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days} يوم ${hours % 24} ساعة`
  if (hours > 0) return `${hours} ساعة ${minutes % 60} دقيقة`
  return `${minutes} دقيقة`
}

// ══════════════════════════════════════
//  PERMISSION CHECKS
// ══════════════════════════════════════

async function isStaff(interaction) {
  const settings = await getSettings(interaction.guild.id)

  if (interaction.user.id === interaction.guild.ownerId) return true

  if (interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) return true

  if (settings?.support_role_id) {
    return interaction.member.roles.cache.has(settings.support_role_id)
  }

  return false
}

// ══════════════════════════════════════
//  BUTTON HANDLERS
// ══════════════════════════════════════

async function handleOpenButton(interaction) {
  try {
    if (!interaction.guild) {
      return interaction.reply({ content: "❌ هذا الأمر داخل السيرفر فقط", ephemeral: true })
    }

    const settings = await getSettings(interaction.guild.id)

    if (settings && !settings.enabled) {
      return interaction.reply({ content: "❌ نظام التذاكر معطل حالياً.", ephemeral: true })
    }

    const maxOpen = settings?.max_open_tickets || 1
    const openTickets = await getOpenTickets(interaction.guild.id, interaction.user.id)

    if (openTickets.length >= maxOpen) {
      const channelMention = openTickets[0]?.channel_id ? `<#${openTickets[0].channel_id}>` : ""
      return interaction.reply({
        content: `❌ عندك تذكرة مفتوحة بالفعل! ${channelMention}\nأغلقها أولاً قبل فتح تذكرة جديدة.`,
        ephemeral: true
      })
    }

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("📂 اختر تصنيف التذكرة")
      .setDescription("اختر التصنيف المناسب لمشكلتك من القائمة أدناه:")
      .setFooter({ text: "سيتم إنشاء قناة خاصة لتذكرتك" })

    const menu = buildCategoryMenu()

    await interaction.reply({
      embeds: [embed],
      components: [menu],
      ephemeral: true
    })

  } catch (error) {
    logger.error("TICKET_OPEN_BUTTON_FAILED", { error: error.message })
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: "❌ حدث خطأ أثناء فتح التذكرة", ephemeral: true }).catch(() => {})
    }
  }
}

async function handleCategorySelect(interaction) {
  try {
    const category = interaction.values[0]
    const guild = interaction.guild
    const user = interaction.user
    const settings = await getSettings(guild.id)

    const maxOpen = settings?.max_open_tickets || 1
    const openTickets = await getOpenTickets(guild.id, user.id)

    if (openTickets.length >= maxOpen) {
      return interaction.update({
        content: "❌ عندك تذكرة مفتوحة بالفعل!",
        embeds: [],
        components: []
      })
    }

    // ✅ FIX: فحص حد القنوات في الكاتيقوري قبل الإنشاء
    if (settings?.category_id) {
      const category_channel = guild.channels.cache.get(settings.category_id)
      if (category_channel && category_channel.type === ChannelType.GuildCategory) {
        const channelsInCategory = guild.channels.cache.filter(c => c.parentId === settings.category_id).size
        if (channelsInCategory >= MAX_CHANNELS_PER_CATEGORY) {
          return interaction.update({
            content: `❌ كاتيقوري التذاكر ممتلئ (${MAX_CHANNELS_PER_CATEGORY}/${MAX_CHANNELS_PER_CATEGORY} قناة).\nأبلغ الإدارة لتنظيف التذاكر القديمة.`,
            embeds: [],
            components: []
          })
        }
      }
    }

    await interaction.update({
      content: "⏳ جاري إنشاء التذكرة...",
      embeds: [],
      components: []
    })

    const ticketNumber = (await getTicketCount(guild.id)) + 1
    const ticketName = `تذكرة-${ticketNumber}`

    const channelOptions = {
      name: ticketName,
      type: ChannelType.GuildText,
      topic: `🎫 تذكرة #${ticketNumber} | ${user.tag} | ${TICKET_CATEGORIES[category]?.label || "أخرى"}`,
      permissionOverwrites: [
        {
          id: guild.roles.everyone.id,
          deny: [PermissionFlagsBits.ViewChannel]
        },
        {
          id: user.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.AttachFiles,
            PermissionFlagsBits.EmbedLinks
          ]
        },
        {
          id: guild.members.me.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ManageChannels,
            PermissionFlagsBits.ManageMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.AttachFiles,
            PermissionFlagsBits.EmbedLinks
          ]
        }
      ]
    }

    if (settings?.category_id) {
      channelOptions.parent = settings.category_id
    }

    if (settings?.support_role_id) {
      channelOptions.permissionOverwrites.push({
        id: settings.support_role_id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.ManageMessages
        ]
      })
    }

    const ticketChannel = await guild.channels.create(channelOptions)

    const ticket = await createTicket({
      guild_id: guild.id,
      channel_id: ticketChannel.id,
      user_id: user.id,
      category: category
    })

    if (!ticket) {
      await ticketChannel.delete().catch(() => {})
      return interaction.editReply({ content: "❌ فشل في حفظ بيانات التذكرة." })
    }

    const welcomeMessage = settings?.welcome_message || "مرحباً! فريق الدعم سيكون معك قريباً."

    // الـ embed مع الأولوية الافتراضية (low = عادية)
    const welcomeEmbed = buildTicketWelcomeEmbed(user, category, ticket.id, welcomeMessage, "low")
    const controlButtons = buildTicketControlButtons(false)
    const priorityButton = buildPriorityButton()

    await ticketChannel.send({
      content: `${user} مرحباً بك في تذكرتك!${settings?.support_role_id ? ` | <@&${settings.support_role_id}>` : ""}`,
      embeds: [welcomeEmbed],
      components: [controlButtons, priorityButton]
    })

    await interaction.editReply({
      content: `✅ تم إنشاء تذكرتك بنجاح! ${ticketChannel}`
    })

    await sendLog(guild, ticket, "open", user, {})

    logger.success("TICKET_CREATED", {
      ticketId: ticket.id,
      userId: user.id,
      guildId: guild.id,
      category
    })

  } catch (error) {
    logger.error("TICKET_CATEGORY_SELECT_FAILED", { error: error.message })

    // ✅ FIX: رسالة خطأ أوضح حسب نوع الفشل
    let errorMessage = "❌ حدث خطأ أثناء إنشاء التذكرة."
    if (error.code === 50035 || error.message?.includes("Maximum number")) {
      errorMessage = "❌ تم الوصول للحد الأقصى من القنوات في السيرفر أو الكاتيقوري."
    } else if (error.code === 50013 || error.message?.includes("Missing Permissions")) {
      errorMessage = "❌ البوت ما عنده صلاحيات كافية لإنشاء قناة."
    }

    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: errorMessage }).catch(() => {})
    }
  }
}

// ══════════════════════════════════════
//  معالج زر تغيير الأولوية (يظهر القائمة)
// ══════════════════════════════════════

async function handleChangePriorityButton(interaction) {
  try {
    const ticket = await getTicketByChannel(interaction.channel.id)

    if (!ticket) {
      return interaction.reply({ content: "❌ هذه ليست قناة تذكرة.", ephemeral: true })
    }

    // فقط الستاف يقدر يغير الأولوية
    const staff = await isStaff(interaction)
    if (!staff) {
      return interaction.reply({ content: "❌ فقط فريق الدعم يقدر يغير الأولوية.", ephemeral: true })
    }

    if (ticket.status === "closed") {
      return interaction.reply({ content: "❌ التذكرة مغلقة، لا يمكن تغيير أولويتها.", ephemeral: true })
    }

    const currentPrio = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.low

    const embed = new EmbedBuilder()
      .setColor(currentPrio.color)
      .setTitle("🎯 تغيير أولوية التذكرة")
      .setDescription(
        `الأولوية الحالية: **${currentPrio.emoji} ${currentPrio.shortLabel}**\n\nاختر الأولوية الجديدة:`
      )
      .addFields(
        { name: "🟢 عادية", value: "مشكلة بسيطة، لا تستعجل", inline: true },
        { name: "🟡 متوسطة", value: "مشكلة تحتاج اهتمام قريب", inline: true },
        { name: "🔴 عالية", value: "مشكلة عاجلة، تدخل فوري", inline: true }
      )

    const priorityMenu = buildPriorityMenu()

    await interaction.reply({
      embeds: [embed],
      components: [priorityMenu],
      ephemeral: true
    })

  } catch (error) {
    logger.error("TICKET_CHANGE_PRIORITY_FAILED", { error: error.message })
    if (!interaction.replied) {
      await interaction.reply({ content: "❌ حدث خطأ", ephemeral: true }).catch(() => {})
    }
  }
}

// ══════════════════════════════════════
//  معالج اختيار الأولوية من القائمة
// ══════════════════════════════════════

async function handlePrioritySelect(interaction) {
  try {
    const newPriority = interaction.values[0]
    const ticket = await getTicketByChannel(interaction.channel.id)

    if (!ticket) {
      return interaction.update({ content: "❌ هذه ليست قناة تذكرة.", embeds: [], components: [] })
    }

    const staff = await isStaff(interaction)
    if (!staff) {
      return interaction.update({ content: "❌ غير مصرح.", embeds: [], components: [] })
    }

    if (!PRIORITY_CONFIG[newPriority]) {
      return interaction.update({ content: "❌ أولوية غير صالحة.", embeds: [], components: [] })
    }

    const oldPriority = ticket.priority || "low"
    const oldPrioConfig = PRIORITY_CONFIG[oldPriority] || PRIORITY_CONFIG.low
    const newPrioConfig = PRIORITY_CONFIG[newPriority]

    if (oldPriority === newPriority) {
      return interaction.update({
        content: `⚠️ الأولوية هي نفسها بالفعل: **${newPrioConfig.emoji} ${newPrioConfig.shortLabel}**`,
        embeds: [],
        components: []
      })
    }

    // تحديث قاعدة البيانات
    await updateTicket(interaction.channel.id, { priority: newPriority })

    // تحديث الـ embed الرئيسي في القناة
    await updateWelcomeEmbedPriority(interaction.channel, ticket, newPriority)

    // رسالة تأكيد في القناة
    const announceEmbed = new EmbedBuilder()
      .setColor(newPrioConfig.color)
      .setTitle("🎯 تم تغيير الأولوية")
      .addFields(
        { name: "من", value: `${oldPrioConfig.emoji} ${oldPrioConfig.shortLabel}`, inline: true },
        { name: "إلى", value: `${newPrioConfig.emoji} ${newPrioConfig.shortLabel}`, inline: true },
        { name: "بواسطة", value: `${interaction.user}`, inline: true }
      )
      .setTimestamp()

    await interaction.channel.send({ embeds: [announceEmbed] })

    // تأكيد للستاف
    await interaction.update({
      content: `✅ تم تغيير الأولوية إلى **${newPrioConfig.emoji} ${newPrioConfig.shortLabel}**`,
      embeds: [],
      components: []
    })

    // لوق
    ticket.priority = oldPriority // للمقارنة في اللوق
    await sendLog(interaction.guild, ticket, "priority_change", interaction.user, {
      oldPriority,
      newPriority
    })

    logger.success("TICKET_PRIORITY_CHANGED", {
      ticketId: ticket.id,
      oldPriority,
      newPriority,
      changedBy: interaction.user.id
    })

  } catch (error) {
    logger.error("TICKET_PRIORITY_SELECT_FAILED", { error: error.message })
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: "❌ حدث خطأ." }).catch(() => {})
    } else {
      await interaction.reply({ content: "❌ حدث خطأ.", ephemeral: true }).catch(() => {})
    }
  }
}

// ══════════════════════════════════════
//  تحديث الـ Embed الرئيسي بالأولوية الجديدة
// ══════════════════════════════════════

async function updateWelcomeEmbedPriority(channel, ticket, newPriority) {
  try {
    const newPrioConfig = PRIORITY_CONFIG[newPriority] || PRIORITY_CONFIG.low

    // جلب أول رسالة للبوت في القناة (اللي فيها الـ embed الترحيبي)
    const messages = await channel.messages.fetch({ limit: 20 })
    const botMessage = messages.find(m =>
      m.author.id === channel.guild.members.me?.id &&
      m.embeds.length > 0 &&
      m.embeds[0]?.fields?.some(f => f.name === "🎯 الأولوية")
    )

    if (!botMessage) return

    const oldEmbed = botMessage.embeds[0]
    if (!oldEmbed) return

    // بناء embed جديد مع تحديث الأولوية واللون
    const newEmbed = EmbedBuilder.from(oldEmbed)
      .setColor(newPrioConfig.color)

    // تحديث حقل الأولوية
    const newFields = oldEmbed.fields.map(field => {
      if (field.name === "🎯 الأولوية") {
        return { name: "🎯 الأولوية", value: `${newPrioConfig.emoji} ${newPrioConfig.shortLabel}`, inline: true }
      }
      return field
    })

    newEmbed.setFields(newFields)

    await botMessage.edit({ embeds: [newEmbed] })

  } catch (error) {
    logger.error("TICKET_UPDATE_EMBED_PRIORITY_FAILED", { error: error.message })
  }
}

async function handleCloseButton(interaction) {
  try {
    const ticket = await getTicketByChannel(interaction.channel.id)

    if (!ticket) {
      return interaction.reply({ content: "❌ هذه ليست قناة تذكرة.", ephemeral: true })
    }

    if (ticket.status === "closed") {
      return interaction.reply({ content: "❌ هذه التذكرة مغلقة بالفعل.", ephemeral: true })
    }

    const staff = await isStaff(interaction)
    if (ticket.user_id !== interaction.user.id && !staff) {
      return interaction.reply({ content: "❌ فقط صاحب التذكرة أو فريق الدعم يقدر يغلقها.", ephemeral: true })
    }

    const confirmEmbed = new EmbedBuilder()
      .setColor(0xef4444)
      .setTitle("⚠️ تأكيد إغلاق التذكرة")
      .setDescription("هل أنت متأكد من إغلاق هذه التذكرة؟\nسيتم حفظ المحادثة وإرسالها لقناة اللوق.")

    const confirmButtons = buildCloseConfirmButtons()

    await interaction.reply({
      embeds: [confirmEmbed],
      components: [confirmButtons]
    })

  } catch (error) {
    logger.error("TICKET_CLOSE_BUTTON_FAILED", { error: error.message })
    if (!interaction.replied) {
      await interaction.reply({ content: "❌ حدث خطأ", ephemeral: true }).catch(() => {})
    }
  }
}

async function handleCloseConfirm(interaction) {
  try {
    const ticket = await getTicketByChannel(interaction.channel.id)

    if (!ticket || ticket.status === "closed") {
      return interaction.update({ content: "❌ التذكرة مغلقة بالفعل.", embeds: [], components: [] })
    }

    await interaction.update({
      content: "⏳ جاري إغلاق التذكرة وحفظ المحادثة...",
      embeds: [],
      components: []
    })

    const settings = await getSettings(interaction.guild.id)

    let transcriptData = { transcript: "", messageCount: 0 }
    if (settings?.transcript_enabled !== false) {
      transcriptData = await generateTranscript(interaction.channel, ticket)
    }

    await updateTicket(interaction.channel.id, {
      status: "closed",
      closed_by: interaction.user.id,
      closed_at: new Date().toISOString(),
      message_count: transcriptData.messageCount
    })

    try {
      await interaction.channel.permissionOverwrites.edit(ticket.user_id, {
        SendMessages: false,
        ViewChannel: true
      })
    } catch {
      // ممكن العضو طلع من السيرفر
    }

    const duration = formatDuration(ticket.created_at, Date.now())

    if (settings?.log_channel_id && transcriptData.transcript) {
      const logChannel = interaction.guild.channels.cache.get(settings.log_channel_id)

      if (logChannel) {
        const buffer = Buffer.from(transcriptData.transcript, "utf-8")

        await logChannel.send({
          files: [{
            attachment: buffer,
            name: `transcript-${ticket.id}.txt`
          }]
        }).catch(() => {})
      }
    }

    await sendLog(interaction.guild, ticket, "close", interaction.user, {
      messageCount: transcriptData.messageCount,
      duration
    })

    const closedEmbed = new EmbedBuilder()
      .setColor(0xef4444)
      .setTitle("🔒 تم إغلاق التذكرة")
      .addFields(
        { name: "🔒 أُغلقت بواسطة", value: `${interaction.user}`, inline: true },
        { name: "💬 عدد الرسائل", value: `${transcriptData.messageCount}`, inline: true },
        { name: "⏱️ مدة التذكرة", value: duration, inline: true }
      )
      .setTimestamp()

    const afterCloseButtons = buildAfterCloseButtons()

    await interaction.channel.send({
      embeds: [closedEmbed],
      components: [afterCloseButtons]
    })

    await interaction.channel.setName(`مغلقة-${ticket.id}`).catch(() => {})

    logger.success("TICKET_CLOSED", { ticketId: ticket.id, closedBy: interaction.user.id })

  } catch (error) {
    logger.error("TICKET_CLOSE_CONFIRM_FAILED", { error: error.message })
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: "❌ حدث خطأ أثناء الإغلاق." }).catch(() => {})
    }
  }
}

async function handleCloseCancel(interaction) {
  try {
    await interaction.update({
      content: "✅ تم إلغاء الإغلاق. التذكرة لا تزال مفتوحة.",
      embeds: [],
      components: []
    })
  } catch (error) {
    logger.error("TICKET_CLOSE_CANCEL_FAILED", { error: error.message })
  }
}

async function handleLockButton(interaction) {
  try {
    const ticket = await getTicketByChannel(interaction.channel.id)

    if (!ticket) {
      return interaction.reply({ content: "❌ هذه ليست قناة تذكرة.", ephemeral: true })
    }

    const staff = await isStaff(interaction)
    if (!staff) {
      return interaction.reply({ content: "❌ فقط فريق الدعم يقدر يقفل التذكرة.", ephemeral: true })
    }

    await interaction.channel.permissionOverwrites.edit(ticket.user_id, {
      SendMessages: false
    })

    await updateTicket(interaction.channel.id, { status: "locked" })

    const embed = new EmbedBuilder()
      .setColor(0xf59e0b)
      .setTitle("🔐 تم قفل التذكرة")
      .setDescription(`تم قفل التذكرة بواسطة ${interaction.user}\nصاحب التذكرة لا يمكنه الكتابة حالياً.`)
      .setTimestamp()

    const controlButtons = buildTicketControlButtons(true)
    const priorityButton = buildPriorityButton()

    await interaction.update({ components: [controlButtons, priorityButton] })
    await interaction.channel.send({ embeds: [embed] })

    await sendLog(interaction.guild, ticket, "lock", interaction.user)

  } catch (error) {
    logger.error("TICKET_LOCK_FAILED", { error: error.message })
    if (!interaction.replied) {
      await interaction.reply({ content: "❌ حدث خطأ", ephemeral: true }).catch(() => {})
    }
  }
}

async function handleUnlockButton(interaction) {
  try {
    const ticket = await getTicketByChannel(interaction.channel.id)

    if (!ticket) {
      return interaction.reply({ content: "❌ هذه ليست قناة تذكرة.", ephemeral: true })
    }

    const staff = await isStaff(interaction)
    if (!staff) {
      return interaction.reply({ content: "❌ فقط فريق الدعم يقدر يفتح القفل.", ephemeral: true })
    }

    await interaction.channel.permissionOverwrites.edit(ticket.user_id, {
      SendMessages: true
    })

    await updateTicket(interaction.channel.id, { status: "open" })

    const embed = new EmbedBuilder()
      .setColor(0x3b82f6)
      .setTitle("🔓 تم فتح القفل")
      .setDescription(`تم فتح قفل التذكرة بواسطة ${interaction.user}`)
      .setTimestamp()

    const controlButtons = buildTicketControlButtons(false)
    const priorityButton = buildPriorityButton()

    await interaction.update({ components: [controlButtons, priorityButton] })
    await interaction.channel.send({ embeds: [embed] })

    await sendLog(interaction.guild, ticket, "unlock", interaction.user)

  } catch (error) {
    logger.error("TICKET_UNLOCK_FAILED", { error: error.message })
    if (!interaction.replied) {
      await interaction.reply({ content: "❌ حدث خطأ", ephemeral: true }).catch(() => {})
    }
  }
}

async function handleClaimButton(interaction) {
  try {
    const ticket = await getTicketByChannel(interaction.channel.id)

    if (!ticket) {
      return interaction.reply({ content: "❌ هذه ليست قناة تذكرة.", ephemeral: true })
    }

    const staff = await isStaff(interaction)
    if (!staff) {
      return interaction.reply({ content: "❌ فقط فريق الدعم يقدر يستلم التذكرة.", ephemeral: true })
    }

    if (ticket.claimed_by) {
      return interaction.reply({
        content: `⚠️ هذه التذكرة مستلمة بالفعل بواسطة <@${ticket.claimed_by}>`,
        ephemeral: true
      })
    }

    await updateTicket(interaction.channel.id, { claimed_by: interaction.user.id })

    const embed = new EmbedBuilder()
      .setColor(0xa855f7)
      .setTitle("🙋 تم استلام التذكرة")
      .setDescription(`${interaction.user} استلم هذه التذكرة وسيتابعها.`)
      .setTimestamp()

    await interaction.reply({ embeds: [embed] })

    await sendLog(interaction.guild, ticket, "claim", interaction.user)

  } catch (error) {
    logger.error("TICKET_CLAIM_FAILED", { error: error.message })
    if (!interaction.replied) {
      await interaction.reply({ content: "❌ حدث خطأ", ephemeral: true }).catch(() => {})
    }
  }
}

async function handleTranscriptButton(interaction) {
  try {
    const ticket = await getTicketByChannel(interaction.channel.id)

    if (!ticket) {
      return interaction.reply({ content: "❌ هذه ليست قناة تذكرة.", ephemeral: true })
    }

    await interaction.deferReply({ ephemeral: true })

    const { transcript, messageCount } = await generateTranscript(interaction.channel, ticket)
    const buffer = Buffer.from(transcript, "utf-8")

    await interaction.editReply({
      content: `📜 سجل المحادثة — ${messageCount} رسالة`,
      files: [{
        attachment: buffer,
        name: `transcript-${ticket.id}.txt`
      }]
    })

    await sendLog(interaction.guild, ticket, "transcript", interaction.user, { messageCount })

  } catch (error) {
    logger.error("TICKET_TRANSCRIPT_BUTTON_FAILED", { error: error.message })
    if (interaction.deferred) {
      await interaction.editReply({ content: "❌ فشل في إنشاء السجل." }).catch(() => {})
    }
  }
}

async function handleDeleteButton(interaction) {
  try {
    const ticket = await getTicketByChannel(interaction.channel.id)

    if (!ticket) {
      return interaction.reply({ content: "❌ هذه ليست قناة تذكرة.", ephemeral: true })
    }

    const staff = await isStaff(interaction)
    if (!staff) {
      return interaction.reply({ content: "❌ فقط فريق الدعم يقدر يحذف التذكرة.", ephemeral: true })
    }

    await interaction.reply({
      content: "🗑️ سيتم حذف هذه القناة خلال 5 ثواني..."
    })

    await sendLog(interaction.guild, ticket, "delete", interaction.user)

    // ✅ FIX: .unref() عشان graceful shutdown
    const deleteTimer = setTimeout(async () => {
      try {
        await interaction.channel.delete(`حذف تذكرة #${ticket.id} بواسطة ${interaction.user.tag}`)
      } catch (err) {
        logger.error("TICKET_CHANNEL_DELETE_FAILED", { error: err.message })
      }
    }, 5000)
    deleteTimer.unref?.()

  } catch (error) {
    logger.error("TICKET_DELETE_FAILED", { error: error.message })
    if (!interaction.replied) {
      await interaction.reply({ content: "❌ حدث خطأ", ephemeral: true }).catch(() => {})
    }
  }
}

async function handleReopenButton(interaction) {
  try {
    const ticket = await getTicketByChannel(interaction.channel.id)

    if (!ticket) {
      return interaction.reply({ content: "❌ هذه ليست قناة تذكرة.", ephemeral: true })
    }

    if (ticket.status === "open") {
      return interaction.reply({ content: "⚠️ التذكرة مفتوحة بالفعل.", ephemeral: true })
    }

    try {
      await interaction.channel.permissionOverwrites.edit(ticket.user_id, {
        SendMessages: true,
        ViewChannel: true
      })
    } catch {
      // ممكن العضو طلع
    }

    await updateTicket(interaction.channel.id, {
      status: "open",
      closed_at: null,
      closed_by: null,
      close_reason: null
    })

    await interaction.channel.setName(`تذكرة-${ticket.id}`).catch(() => {})

    const embed = new EmbedBuilder()
      .setColor(0x06b6d4)
      .setTitle("🔓 تم إعادة فتح التذكرة")
      .setDescription(`تم إعادة فتح التذكرة بواسطة ${interaction.user}`)
      .setTimestamp()

    const controlButtons = buildTicketControlButtons(false)
    const priorityButton = buildPriorityButton()

    await interaction.update({ components: [] })
    await interaction.channel.send({
      embeds: [embed],
      components: [controlButtons, priorityButton]
    })

    await sendLog(interaction.guild, ticket, "reopen", interaction.user)

  } catch (error) {
    logger.error("TICKET_REOPEN_FAILED", { error: error.message })
    if (!interaction.replied) {
      await interaction.reply({ content: "❌ حدث خطأ", ephemeral: true }).catch(() => {})
    }
  }
}

// ══════════════════════════════════════
//  ✅ FIX: AUTO-CLOSE SCHEDULER
//  ════════════════════════════════════
//  يفحص كل ساعة التذاكر اللي ما فيها نشاط
//  منذ auto_close_hours ساعة ويغلقها تلقائياً.
//
//  الـ "نشاط" = آخر رسالة في القناة (last_message_id)
//  الـ "إغلاق" = نفس عملية handleCloseConfirm لكن
//  بدون تفاعل مستخدم.
// ══════════════════════════════════════

async function autoCloseInactiveTickets(client) {
  try {
    // جلب كل التذاكر المفتوحة
    const result = await databaseSystem.query(
      "SELECT * FROM tickets WHERE status = 'open'"
    )
    const openTickets = result?.rows || []

    if (openTickets.length === 0) return

    let closedCount = 0

    for (const ticket of openTickets) {
      try {
        const guild = client.guilds.cache.get(ticket.guild_id)
        if (!guild) continue

        const channel = guild.channels.cache.get(ticket.channel_id)
        if (!channel) {
          // القناة محذوفة — ضع التذكرة على closed
          await updateTicket(ticket.channel_id, {
            status: "closed",
            closed_at: new Date().toISOString(),
            close_reason: "channel_deleted"
          })
          continue
        }

        const settings = await getSettings(ticket.guild_id)
        const autoCloseHours = settings?.auto_close_hours || 48
        const inactivityThreshold = autoCloseHours * 60 * 60 * 1000

        // فحص آخر نشاط في القناة
        let lastActivity = new Date(ticket.created_at).getTime()

        if (channel.lastMessageId) {
          try {
            const lastMsg = await channel.messages.fetch(channel.lastMessageId)
            if (lastMsg) {
              lastActivity = Math.max(lastActivity, lastMsg.createdTimestamp)
            }
          } catch {
            // الرسالة محذوفة — استخدم created_at
          }
        }

        const timeSinceLastActivity = Date.now() - lastActivity
        if (timeSinceLastActivity < inactivityThreshold) continue

        // ✅ التذكرة خاملة — أغلقها
        let transcriptData = { transcript: "", messageCount: 0 }
        if (settings?.transcript_enabled !== false) {
          transcriptData = await generateTranscript(channel, ticket)
        }

        await updateTicket(ticket.channel_id, {
          status: "closed",
          closed_at: new Date().toISOString(),
          close_reason: "auto_close_inactivity",
          message_count: transcriptData.messageCount
        })

        // حذف صلاحية الكتابة
        try {
          await channel.permissionOverwrites.edit(ticket.user_id, {
            SendMessages: false,
            ViewChannel: true
          })
        } catch {
          // العضو طلع
        }

        // إرسال transcript للـ log channel
        if (settings?.log_channel_id && transcriptData.transcript) {
          const logChannel = guild.channels.cache.get(settings.log_channel_id)
          if (logChannel) {
            const buffer = Buffer.from(transcriptData.transcript, "utf-8")
            await logChannel.send({
              files: [{
                attachment: buffer,
                name: `transcript-${ticket.id}.txt`
              }]
            }).catch(() => {})
          }
        }

        // إعلان في القناة
        const closedEmbed = new EmbedBuilder()
          .setColor(0x6b7280)
          .setTitle("⏰ تم إغلاق التذكرة تلقائياً")
          .setDescription(`تم إغلاق التذكرة بسبب عدم النشاط لمدة **${autoCloseHours}** ساعة.`)
          .setTimestamp()

        await channel.send({
          embeds: [closedEmbed],
          components: [buildAfterCloseButtons()]
        }).catch(() => {})

        await channel.setName(`مغلقة-${ticket.id}`).catch(() => {})

        // لوق
        await sendLog(guild, ticket, "auto_close", client.user, {
          duration: formatDuration(ticket.created_at, Date.now()),
          messageCount: transcriptData.messageCount,
          reason: `عدم نشاط لمدة ${autoCloseHours} ساعة`
        })

        closedCount++

        // تأخير صغير عشان rate limit
        await new Promise(r => setTimeout(r, 500))

      } catch (err) {
        logger.error("TICKET_AUTO_CLOSE_ITEM_FAILED", {
          ticketId: ticket.id,
          error: err.message
        })
      }
    }

    if (closedCount > 0) {
      logger.info("TICKET_AUTO_CLOSE_BATCH", { closedCount, total: openTickets.length })
    }

  } catch (error) {
    logger.error("TICKET_AUTO_CLOSE_FAILED", { error: error.message })
  }
}

/**
 * بدء scheduler للإغلاق التلقائي.
 * يجب استدعاؤه مرة واحدة عند startup مع client.
 */
function startAutoCloseScheduler(client) {
  scheduler.register(
    "ticket-auto-close",
    60 * 60 * 1000, // كل ساعة
    () => autoCloseInactiveTickets(client),
    false
  )
  logger.info("TICKET_AUTO_CLOSE_SCHEDULER_STARTED")
}

// ══════════════════════════════════════
//  EXPORTS
// ══════════════════════════════════════

module.exports = {
  // Settings
  getSettings,
  saveSettings,

  // Database
  createTicket,
  getTicketByChannel,
  getOpenTickets,
  updateTicket,
  getTicketCount,
  getTicketStats,

  // Builders
  buildSetupEmbed,
  buildOpenButton,
  buildCategoryMenu,
  buildTicketWelcomeEmbed,
  buildTicketControlButtons,
  buildPriorityButton,
  buildPriorityMenu,

  // Button Handlers
  handleOpenButton,
  handleCategorySelect,
  handleCloseButton,
  handleCloseConfirm,
  handleCloseCancel,
  handleLockButton,
  handleUnlockButton,
  handleClaimButton,
  handleTranscriptButton,
  handleDeleteButton,
  handleReopenButton,

  // Priority Handlers (NEW)
  handleChangePriorityButton,
  handlePrioritySelect,
  updateWelcomeEmbedPriority,

  // Auto-Close (NEW)
  startAutoCloseScheduler,
  autoCloseInactiveTickets,

  // Utils
  generateTranscript,
  sendLog,
  isStaff,

  // Constants
  TICKET_CATEGORIES,
  TICKET_STATUS,
  PRIORITY_LABELS,
  PRIORITY_CONFIG
}
// ══════════════════════════════════════════════════════════════════
//  TICKET SYSTEM
//  المسار: systems/ticketSystem.js
//
//  يدعم schemas مزدوجة:
//   1) Flat (أوامر البوت):
//      category_id, log_channel_id, support_role_id, welcome_message,
//      max_open_tickets, auto_close_hours, transcript_enabled, enabled
//   2) JSONB (الداش):
//      panel: {title, description, color, buttons:[{label,emoji,categoryId,style}]}
//      panel_channel: TEXT
//      transcripts: {enabled, channel}
//
//  normalizeSettings() يدمج الـ JSONB في الحقول flat بشفافية.
// ══════════════════════════════════════════════════════════════════

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

const PRIORITY_LABELS = {
  low:    "🟢 عادية",
  normal: "🟡 متوسطة",
  high:   "🔴 عالية",
  urgent: "🔴 عالية"
}

const MAX_CHANNELS_PER_CATEGORY = 50

// ══════════════════════════════════════
//  JSON HELPERS
// ══════════════════════════════════════

function parseJsonObject(raw) {
  if (!raw) return null
  if (typeof raw === "object" && !Array.isArray(raw)) return raw
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw)
      return (parsed && typeof parsed === "object" && !Array.isArray(parsed)) ? parsed : null
    } catch { return null }
  }
  return null
}

// ══════════════════════════════════════
//  NORMALIZE — bridge بين schemas
// ══════════════════════════════════════

function normalizeSettings(raw) {
  if (!raw) return null
  const data = { ...raw }

  const panel = parseJsonObject(raw.panel)
  const transcripts = parseJsonObject(raw.transcripts)

  // ── transcripts JSONB يحدد transcript_enabled + log_channel_id ──
  if (transcripts) {
    if (data.transcript_enabled === undefined || data.transcript_enabled === null) {
      data.transcript_enabled = transcripts.enabled !== false
    }
    // قناة الـ transcript = قناة اللوق (لو ما حُدّدت بعد)
    if (!data.log_channel_id && transcripts.channel) {
      data.log_channel_id = transcripts.channel
    }
  }

  // ── panel JSONB → keep as object للـ deployPanel ──
  if (panel) {
    data._panel = panel
  }

  // ── panel_channel → flat field ──
  if (raw.panel_channel) {
    data._panel_channel = raw.panel_channel
  }

  return data
}

// ══════════════════════════════════════
//  SETTINGS HELPERS
// ══════════════════════════════════════

async function getSettings(guildId) {
  try {
    const result = await databaseSystem.queryOne(
      "SELECT * FROM ticket_settings WHERE guild_id = $1",
      [guildId]
    )
    return normalizeSettings(result)
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
//  Deploy panel من إعدادات الداش
//  يُستدعى من API: POST /api/guild/:id/tickets/panel/deploy
//  ويرسل اللوحة في panel_channel (لو موجود)
// ══════════════════════════════════════

async function deployPanel(guild) {
  try {
    const settings = await getSettings(guild.id)
    if (!settings) return { ok: false, error: "no_settings" }

    const channelId = settings._panel_channel
    if (!channelId) return { ok: false, error: "no_panel_channel" }

    const channel = guild.channels.cache.get(channelId)
    if (!channel || !channel.isTextBased?.()) return { ok: false, error: "channel_not_found" }

    const perms = channel.permissionsFor(guild.members.me)
    if (!perms?.has(["ViewChannel", "SendMessages", "EmbedLinks"])) {
      return { ok: false, error: "missing_permissions" }
    }

    const panelData = settings._panel || {}
    const embed = new EmbedBuilder()
      .setTitle((panelData.title || "🎫 لوحة التذاكر").slice(0, 256))
      .setDescription(
        (panelData.description ||
          "اضغط الزر أدناه لفتح تذكرة جديدة. سيتم إنشاء قناة خاصة بك مع فريق الدعم.").slice(0, 4096)
      )
      .setColor(typeof panelData.color === "number" ? panelData.color : 0x9b59b6)
      .setTimestamp()

    // الزر الافتراضي (ticket_open) — يفتح قائمة الفئات
    const components = [buildOpenButton()]

    await channel.send({ embeds: [embed], components })
    return { ok: true }
  } catch (err) {
    logger.error("TICKET_DEPLOY_PANEL_FAILED", { error: err.message })
    return { ok: false, error: err.message }
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
      "SELECT COUNT(*)::INT AS count FROM tickets WHERE guild_id = $1",
      [guildId]
    )
    return result?.count || 0
  } catch {
    return 0
  }
}

async function getTicketStats(guildId) {
  try {
    const result = await databaseSystem.queryOne(`
      SELECT
        COUNT(*)::INT AS total,
        COUNT(*) FILTER (WHERE status = 'open')::INT AS open,
        COUNT(*) FILTER (WHERE status = 'closed')::INT AS closed,
        COUNT(*) FILTER (WHERE status = 'locked')::INT AS locked
      FROM tickets WHERE guild_id = $1
    `, [guildId])
    return result || { total: 0, open: 0, closed: 0, locked: 0 }
  } catch {
    return { total: 0, open: 0, closed: 0, locked: 0 }
  }
}

// ══════════════════════════════════════
//  BUILDERS
// ══════════════════════════════════════

function buildSetupEmbed(guild, panelData = null) {
  const title = panelData?.title || "🎫 نظام التذاكر"
  const description = panelData?.description ||
    "**مرحباً بكم في نظام تذاكر الدعم!**\n\n" +
    "اضغط الزر أدناه لفتح تذكرة جديدة.\n" +
    "سيتم إنشاء قناة خاصة بك مع فريق الدعم."

  return new EmbedBuilder()
    .setTitle(title.slice(0, 256))
    .setDescription(description.slice(0, 4096))
    .setColor(typeof panelData?.color === "number" ? panelData.color : 0x9b59b6)
    .setThumbnail(guild.iconURL({ dynamic: true, size: 128 }))
    .setFooter({ text: "Lyn — نظام تذاكر متطور" })
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

  const personalizedMsg = (welcomeMessage || "مرحباً! فريق الدعم سيكون معك قريباً.")
    .replace(/\{user\}/g, `<@${user.id}>`)
    .replace(/\{username\}/g, user.username)

  return new EmbedBuilder()
    .setColor(prio.color)
    .setTitle(`${cat.emoji} تذكرة #${ticketNumber} — ${cat.label}`)
    .setDescription(
      `مرحباً ${user}!\n\n` +
      `${personalizedMsg}\n\n` +
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
      .setLabel("استلام")
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

function buildPriorityButton() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket_change_priority")
      .setLabel("تغيير الأولوية")
      .setEmoji("🎯")
      .setStyle(ButtonStyle.Secondary)
  )
}

function buildAfterCloseButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket_reopen")
      .setLabel("إعادة فتح")
      .setEmoji("🔓")
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId("ticket_delete")
      .setLabel("حذف نهائي")
      .setEmoji("🗑️")
      .setStyle(ButtonStyle.Danger)
  )
}

// ══════════════════════════════════════
//  IS STAFF
// ══════════════════════════════════════

async function isStaff(interaction) {
  if (interaction.member?.permissions?.has(PermissionFlagsBits.Administrator)) return true
  if (interaction.member?.permissions?.has(PermissionFlagsBits.ManageChannels)) return true

  const settings = await getSettings(interaction.guild.id)
  if (settings?.support_role_id && interaction.member?.roles?.cache?.has(settings.support_role_id)) {
    return true
  }
  return false
}

// ══════════════════════════════════════
//  BUTTON HANDLERS
// ══════════════════════════════════════

async function handleOpenButton(interaction) {
  try {
    const settings = await getSettings(interaction.guild.id)
    if (!settings || !settings.enabled) {
      return interaction.reply({
        content: "❌ نظام التذاكر معطّل في هذا السيرفر.",
        ephemeral: true
      })
    }

    const openTickets = await getOpenTickets(interaction.guild.id, interaction.user.id)
    const maxOpen = settings.max_open_tickets || 1

    if (openTickets.length >= maxOpen) {
      return interaction.reply({
        content: `❌ لديك ${openTickets.length} تذكرة مفتوحة بالفعل. أغلق إحداها قبل فتح جديدة.`,
        ephemeral: true
      })
    }

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle("📂 اختر تصنيف التذكرة")
          .setDescription("حدد التصنيف المناسب لطلبك من القائمة أدناه:")
      ],
      components: [buildCategoryMenu()],
      ephemeral: true
    })
  } catch (error) {
    logger.error("TICKET_OPEN_BUTTON_FAILED", { error: error.message })
    if (!interaction.replied) {
      await interaction.reply({ content: "❌ حدث خطأ.", ephemeral: true }).catch(() => {})
    }
  }
}

async function handleCategorySelect(interaction) {
  try {
    const category = interaction.values[0]
    const guild = interaction.guild
    const user = interaction.user

    await interaction.deferReply({ ephemeral: true })

    const settings = await getSettings(guild.id)
    if (!settings) {
      return interaction.editReply({ content: "❌ نظام التذاكر غير معدّ." })
    }

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
      category
    })

    if (!ticket) {
      await ticketChannel.delete().catch(() => {})
      return interaction.editReply({ content: "❌ فشل في حفظ بيانات التذكرة." })
    }

    const welcomeMessage = settings?.welcome_message || "مرحباً! فريق الدعم سيكون معك قريباً."

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

async function handleCloseButton(interaction) {
  try {
    const ticket = await getTicketByChannel(interaction.channel.id)
    if (!ticket) {
      return interaction.reply({ content: "❌ هذه ليست قناة تذكرة.", ephemeral: true })
    }

    const isOwner = ticket.user_id === interaction.user.id
    const isStaffMember = await isStaff(interaction)

    if (!isOwner && !isStaffMember) {
      return interaction.reply({ content: "❌ غير مصرح.", ephemeral: true })
    }

    const confirmRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("ticket_close_confirm")
        .setLabel("نعم، أغلق")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("ticket_close_cancel")
        .setLabel("إلغاء")
        .setStyle(ButtonStyle.Secondary)
    )

    await interaction.reply({
      content: "هل أنت متأكد من إغلاق التذكرة؟",
      components: [confirmRow],
      ephemeral: true
    })
  } catch (error) {
    logger.error("TICKET_CLOSE_BUTTON_FAILED", { error: error.message })
  }
}

async function handleCloseConfirm(interaction) {
  try {
    const ticket = await getTicketByChannel(interaction.channel.id)
    if (!ticket) return

    await interaction.update({ content: "🔒 جاري الإغلاق...", components: [] })

    await updateTicket(interaction.channel.id, {
      status: "closed",
      closed_at: new Date(),
      closed_by: interaction.user.id
    })

    const transcriptData = ticket.transcript_enabled !== false
      ? await generateTranscript(interaction.channel, ticket)
      : { transcript: null, messageCount: 0 }

    const closedEmbed = new EmbedBuilder()
      .setColor(0xef4444)
      .setTitle("🔒 تم إغلاق التذكرة")
      .addFields(
        { name: "👤 أُغلقت بواسطة", value: `${interaction.user}`, inline: true },
        { name: "💬 عدد الرسائل", value: `${transcriptData.messageCount}`, inline: true }
      )
      .setTimestamp()

    await interaction.channel.send({
      embeds: [closedEmbed],
      components: [buildAfterCloseButtons()]
    })

    await interaction.channel.setName(`مغلقة-${ticket.id}`).catch(() => {})

    await sendLog(interaction.guild, ticket, "close", interaction.user, {
      messageCount: transcriptData.messageCount,
      duration: formatDuration(ticket.created_at, Date.now())
    })

  } catch (error) {
    logger.error("TICKET_CLOSE_CONFIRM_FAILED", { error: error.message })
  }
}

async function handleCloseCancel(interaction) {
  await interaction.update({ content: "✅ تم الإلغاء.", components: [] })
}

async function handleLockButton(interaction) {
  try {
    if (!await isStaff(interaction)) {
      return interaction.reply({ content: "❌ غير مصرح.", ephemeral: true })
    }
    const ticket = await getTicketByChannel(interaction.channel.id)
    if (!ticket) return

    await updateTicket(interaction.channel.id, { status: "locked" })

    await interaction.channel.permissionOverwrites.edit(ticket.user_id, {
      SendMessages: false
    }).catch(() => {})

    await interaction.reply({
      embeds: [new EmbedBuilder().setColor(0xf59e0b).setDescription("🔐 تم قفل التذكرة")]
    })

    await sendLog(interaction.guild, ticket, "lock", interaction.user, {})
  } catch (error) {
    logger.error("TICKET_LOCK_FAILED", { error: error.message })
  }
}

async function handleUnlockButton(interaction) {
  try {
    if (!await isStaff(interaction)) {
      return interaction.reply({ content: "❌ غير مصرح.", ephemeral: true })
    }
    const ticket = await getTicketByChannel(interaction.channel.id)
    if (!ticket) return

    await updateTicket(interaction.channel.id, { status: "open" })

    await interaction.channel.permissionOverwrites.edit(ticket.user_id, {
      SendMessages: true
    }).catch(() => {})

    await interaction.reply({
      embeds: [new EmbedBuilder().setColor(0x3b82f6).setDescription("🔓 تم فتح القفل")]
    })

    await sendLog(interaction.guild, ticket, "unlock", interaction.user, {})
  } catch (error) {
    logger.error("TICKET_UNLOCK_FAILED", { error: error.message })
  }
}

async function handleClaimButton(interaction) {
  try {
    if (!await isStaff(interaction)) {
      return interaction.reply({ content: "❌ غير مصرح.", ephemeral: true })
    }
    const ticket = await getTicketByChannel(interaction.channel.id)
    if (!ticket) return

    if (ticket.claimed_by) {
      return interaction.reply({
        content: `⚠️ التذكرة مستلمة بالفعل من <@${ticket.claimed_by}>.`,
        ephemeral: true
      })
    }

    await updateTicket(interaction.channel.id, { claimed_by: interaction.user.id })

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xa855f7)
          .setDescription(`🙋 تم استلام التذكرة بواسطة ${interaction.user}`)
      ]
    })

    await sendLog(interaction.guild, ticket, "claim", interaction.user, {})
  } catch (error) {
    logger.error("TICKET_CLAIM_FAILED", { error: error.message })
  }
}

async function handleTranscriptButton(interaction) {
  try {
    if (!await isStaff(interaction) && interaction.user.id !== (await getTicketByChannel(interaction.channel.id))?.user_id) {
      return interaction.reply({ content: "❌ غير مصرح.", ephemeral: true })
    }

    await interaction.deferReply({ ephemeral: true })

    const ticket = await getTicketByChannel(interaction.channel.id)
    if (!ticket) {
      return interaction.editReply({ content: "❌ ليست قناة تذكرة." })
    }

    const { transcript, messageCount } = await generateTranscript(interaction.channel, ticket)

    await interaction.editReply({
      content: `📜 تم إنشاء سجل المحادثة (${messageCount} رسالة)`,
      files: [{
        attachment: Buffer.from(transcript, "utf-8"),
        name: `ticket-${ticket.id}.txt`
      }]
    })

    await sendLog(interaction.guild, ticket, "transcript", interaction.user, { messageCount })
  } catch (error) {
    logger.error("TICKET_TRANSCRIPT_FAILED", { error: error.message })
  }
}

async function handleDeleteButton(interaction) {
  try {
    if (!await isStaff(interaction)) {
      return interaction.reply({ content: "❌ غير مصرح.", ephemeral: true })
    }
    const ticket = await getTicketByChannel(interaction.channel.id)
    if (!ticket) return

    await sendLog(interaction.guild, ticket, "delete", interaction.user, {})

    await interaction.reply({ content: "🗑️ سيتم حذف القناة خلال 5 ثوان..." })
    setTimeout(() => {
      interaction.channel.delete("Ticket deleted").catch(() => {})
    }, 5000)
  } catch (error) {
    logger.error("TICKET_DELETE_FAILED", { error: error.message })
  }
}

async function handleReopenButton(interaction) {
  try {
    if (!await isStaff(interaction)) {
      return interaction.reply({ content: "❌ غير مصرح.", ephemeral: true })
    }
    const ticket = await getTicketByChannel(interaction.channel.id)
    if (!ticket) return

    await updateTicket(interaction.channel.id, { status: "open", closed_at: null })

    await interaction.channel.setName(`تذكرة-${ticket.id}`).catch(() => {})

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x06b6d4)
          .setTitle("🔓 تم إعادة فتح التذكرة")
      ],
      components: [buildTicketControlButtons(false), buildPriorityButton()]
    })

    await sendLog(interaction.guild, ticket, "reopen", interaction.user, {})
  } catch (error) {
    logger.error("TICKET_REOPEN_FAILED", { error: error.message })
  }
}

// ══════════════════════════════════════
//  PRIORITY HANDLERS
// ══════════════════════════════════════

async function handleChangePriorityButton(interaction) {
  try {
    const ticket = await getTicketByChannel(interaction.channel.id)
    if (!ticket) {
      return interaction.reply({ content: "❌ هذه ليست قناة تذكرة.", ephemeral: true })
    }

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

    await interaction.reply({
      embeds: [embed],
      components: [buildPriorityMenu()],
      ephemeral: true
    })
  } catch (error) {
    logger.error("TICKET_CHANGE_PRIORITY_FAILED", { error: error.message })
  }
}

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

    await updateTicket(interaction.channel.id, { priority: newPriority })
    await updateWelcomeEmbedPriority(interaction.channel, ticket, newPriority)

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

    await interaction.update({
      content: `✅ تم تغيير الأولوية إلى **${newPrioConfig.emoji} ${newPrioConfig.shortLabel}**`,
      embeds: [],
      components: []
    })

    ticket.priority = oldPriority
    await sendLog(interaction.guild, ticket, "priority_change", interaction.user, {
      oldPriority,
      newPriority
    })
  } catch (error) {
    logger.error("TICKET_PRIORITY_SELECT_FAILED", { error: error.message })
  }
}

async function updateWelcomeEmbedPriority(channel, ticket, newPriority) {
  try {
    const messages = await channel.messages.fetch({ limit: 50 })
    const welcomeMsg = messages.find(m =>
      m.author.id === channel.client.user.id &&
      m.embeds.length > 0 &&
      m.embeds[0]?.title?.includes(`تذكرة #${ticket.id}`)
    )

    if (!welcomeMsg) return

    const settings = await getSettings(channel.guild.id)
    const welcomeMessage = settings?.welcome_message || "مرحباً! فريق الدعم سيكون معك قريباً."
    const user = await channel.client.users.fetch(ticket.user_id)

    const newEmbed = buildTicketWelcomeEmbed(
      user,
      ticket.category,
      ticket.id,
      welcomeMessage,
      newPriority
    )

    await welcomeMsg.edit({ embeds: [newEmbed] })
  } catch (error) {
    logger.error("TICKET_UPDATE_WELCOME_PRIORITY_FAILED", { error: error.message })
  }
}

// ══════════════════════════════════════
//  TRANSCRIPT
// ══════════════════════════════════════

async function generateTranscript(channel, ticket) {
  try {
    const allMessages = []
    let lastId = null

    while (true) {
      const options = { limit: 100 }
      if (lastId) options.before = lastId

      const batch = await channel.messages.fetch(options)
      if (batch.size === 0) break

      allMessages.push(...batch.values())
      lastId = batch.last().id

      if (batch.size < 100) break
    }

    const messages = allMessages.reverse()
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
    logger.error("TICKET_TRANSCRIPT_BUILD_FAILED", { error: error.message })
    return { transcript: "فشل في إنشاء السجل", messageCount: 0 }
  }
}

function formatDuration(start, end) {
  const ms = new Date(end).getTime() - new Date(start).getTime()
  const hours = Math.floor(ms / (1000 * 60 * 60))
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
  if (hours > 0) return `${hours} ساعة و ${minutes} دقيقة`
  return `${minutes} دقيقة`
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
        name: "🎯 التغيير",
        value: `${oldP.emoji} ${oldP.shortLabel} → ${newP.emoji} ${newP.shortLabel}`,
        inline: false
      })
    }

    await logChannel.send({ embeds: [embed] })
  } catch (error) {
    logger.error("TICKET_LOG_FAILED", { error: error.message })
  }
}

// ══════════════════════════════════════
//  AUTO CLOSE
// ══════════════════════════════════════

async function autoCloseInactiveTickets(client) {
  try {
    const result = await databaseSystem.query(`
      SELECT t.*, ts.auto_close_hours, ts.transcript_enabled
      FROM tickets t
      LEFT JOIN ticket_settings ts ON ts.guild_id = t.guild_id
      WHERE t.status = 'open'
      AND t.created_at < NOW() - (COALESCE(ts.auto_close_hours, 48) || ' hours')::INTERVAL
    `)

    const openTickets = result.rows || []
    let closedCount = 0

    for (const ticket of openTickets) {
      try {
        const guild = client.guilds.cache.get(ticket.guild_id)
        if (!guild) continue

        const channel = guild.channels.cache.get(ticket.channel_id)
        if (!channel) {
          await updateTicket(ticket.channel_id, {
            status: "closed",
            closed_at: new Date(),
            closed_by: client.user.id
          })
          continue
        }

        const messages = await channel.messages.fetch({ limit: 1 }).catch(() => null)
        if (messages?.size > 0) {
          const lastMsg = messages.first()
          const hoursAgo = (Date.now() - lastMsg.createdTimestamp) / (1000 * 60 * 60)
          const autoCloseHours = ticket.auto_close_hours || 48
          if (hoursAgo < autoCloseHours) continue
        }

        await updateTicket(ticket.channel_id, {
          status: "closed",
          closed_at: new Date(),
          closed_by: client.user.id
        })

        const transcriptData = ticket.transcript_enabled !== false
          ? await generateTranscript(channel, ticket)
          : { transcript: null, messageCount: 0 }

        const settings = await getSettings(ticket.guild_id)
        const autoCloseHours = settings?.auto_close_hours || 48

        if (settings?.log_channel_id && transcriptData.transcript) {
          const logChannel = guild.channels.cache.get(settings.log_channel_id)
          if (logChannel) {
            await logChannel.send({
              content: `📜 سجل التذكرة #${ticket.id} (إغلاق تلقائي)`,
              files: [{
                attachment: Buffer.from(transcriptData.transcript, "utf-8"),
                name: `ticket-${ticket.id}.txt`
              }]
            }).catch(() => {})
          }
        }

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

        await sendLog(guild, ticket, "auto_close", client.user, {
          duration: formatDuration(ticket.created_at, Date.now()),
          messageCount: transcriptData.messageCount,
          reason: `عدم نشاط لمدة ${autoCloseHours} ساعة`
        })

        closedCount++

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

function startAutoCloseScheduler(client) {
  scheduler.register(
    "ticket-auto-close",
    60 * 60 * 1000,
    () => autoCloseInactiveTickets(client),
    false
  )
  logger.info("TICKET_AUTO_CLOSE_SCHEDULER_STARTED")
}

// ══════════════════════════════════════
//  EXPORTS
// ══════════════════════════════════════

module.exports = {
  getSettings,
  saveSettings,
  deployPanel,

  createTicket,
  getTicketByChannel,
  getOpenTickets,
  updateTicket,
  getTicketCount,
  getTicketStats,

  buildSetupEmbed,
  buildOpenButton,
  buildCategoryMenu,
  buildTicketWelcomeEmbed,
  buildTicketControlButtons,
  buildPriorityButton,
  buildPriorityMenu,
  buildAfterCloseButtons,

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

  handleChangePriorityButton,
  handlePrioritySelect,
  updateWelcomeEmbedPriority,

  startAutoCloseScheduler,
  autoCloseInactiveTickets,

  generateTranscript,
  sendLog,
  isStaff,

  TICKET_CATEGORIES,
  TICKET_STATUS,
  PRIORITY_LABELS,
  PRIORITY_CONFIG
}
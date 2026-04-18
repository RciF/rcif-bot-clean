const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js")

const ticketSystem = require("../../systems/ticketSystem")

// ✅ تحويل \n النصي إلى سطر جديد حقيقي
function parseMessage(str) {
  if (!str) return null
  return str.replace(/\\n/g, "\n")
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("تذاكر")
    .setDescription("إعداد وإدارة نظام التذاكر")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)

    // ── الأمر الفرعي: إعداد ──
    .addSubcommand(sub =>
      sub
        .setName("إعداد")
        .setDescription("إعداد نظام التذاكر وإرسال رسالة فتح التذاكر")
        .addChannelOption(option =>
          option
            .setName("القناة")
            .setDescription("القناة التي سيتم إرسال رسالة فتح التذاكر فيها")
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText)
        )
        .addChannelOption(option =>
          option
            .setName("الكاتيقوري")
            .setDescription("الكاتيقوري التي ستنشأ فيها قنوات التذاكر")
            .setRequired(false)
            .addChannelTypes(ChannelType.GuildCategory)
        )
        .addChannelOption(option =>
          option
            .setName("قناة_اللوق")
            .setDescription("قناة سجل التذاكر (اللوق)")
            .setRequired(false)
            .addChannelTypes(ChannelType.GuildText)
        )
        .addRoleOption(option =>
          option
            .setName("رتبة_الدعم")
            .setDescription("رتبة فريق الدعم الذين يرون التذاكر")
            .setRequired(false)
        )
    )

    // ── الأمر الفرعي: إعدادات ──
    .addSubcommand(sub =>
      sub
        .setName("إعدادات")
        .setDescription("تعديل إعدادات نظام التذاكر")
        .addIntegerOption(option =>
          option
            .setName("حد_التذاكر")
            .setDescription("الحد الأقصى للتذاكر المفتوحة لكل عضو")
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(5)
        )
        .addIntegerOption(option =>
          option
            .setName("إغلاق_تلقائي")
            .setDescription("إغلاق التذكرة تلقائياً بعد عدم النشاط (بالساعات)")
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(168)
        )
        .addStringOption(option =>
          option
            .setName("رسالة_الترحيب")
            .setDescription("رسالة الترحيب داخل التذكرة")
            .setRequired(false)
            .setMaxLength(500)
        )
        .addStringOption(option =>
          option
            .setName("حفظ_المحادثة")
            .setDescription("حفظ المحادثة عند الإغلاق")
            .setRequired(false)
            .addChoices(
              { name: "✅ مفعّل | Enabled", value: "true" },
              { name: "❌ معطّل | Disabled", value: "false" }
            )
        )
        .addStringOption(option =>
          option
            .setName("الحالة")
            .setDescription("تشغيل أو إيقاف نظام التذاكر")
            .setRequired(false)
            .addChoices(
              { name: "✅ تشغيل | Enable", value: "on" },
              { name: "❌ إيقاف | Disable", value: "off" }
            )
        )
    )

    // ── الأمر الفرعي: معلومات ──
    .addSubcommand(sub =>
      sub
        .setName("معلومات")
        .setDescription("عرض إعدادات وإحصائيات نظام التذاكر")
    ),

  async execute(interaction) {
    try {
      if (!interaction.guild) {
        return interaction.reply({ content: "❌ هذا الأمر داخل السيرفر فقط.", ephemeral: true })
      }

      const subcommand = interaction.options.getSubcommand()

      if (subcommand === "إعداد") {
        return await handleSetup(interaction)
      }

      if (subcommand === "إعدادات") {
        return await handleSettings(interaction)
      }

      if (subcommand === "معلومات") {
        return await handleInfo(interaction)
      }

    } catch (error) {
      console.error("[TICKET SETUP ERROR]", error)

      if (interaction.replied || interaction.deferred) {
        return interaction.followUp({ content: "❌ حدث خطأ في نظام التذاكر.", ephemeral: true }).catch(() => {})
      }
      return interaction.reply({ content: "❌ حدث خطأ في نظام التذاكر.", ephemeral: true }).catch(() => {})
    }
  }
}

// ══════════════════════════════════════
//  SETUP HANDLER
// ══════════════════════════════════════

async function handleSetup(interaction) {
  await interaction.deferReply({ ephemeral: true })

  const targetChannel = interaction.options.getChannel("القناة")
  const categoryChannel = interaction.options.getChannel("الكاتيقوري")
  const logChannel = interaction.options.getChannel("قناة_اللوق")
  const supportRole = interaction.options.getRole("رتبة_الدعم")

  const botPerms = targetChannel.permissionsFor(interaction.guild.members.me)
  if (!botPerms || !botPerms.has(PermissionFlagsBits.SendMessages) || !botPerms.has(PermissionFlagsBits.EmbedLinks)) {
    return interaction.editReply({
      content: `❌ البوت ما يقدر يرسل رسائل في ${targetChannel}. تأكد من الصلاحيات.`
    })
  }

  if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels)) {
    return interaction.editReply({
      content: "❌ البوت يحتاج صلاحية **إدارة القنوات** عشان ينشئ قنوات التذاكر."
    })
  }

  const currentSettings = await ticketSystem.getSettings(interaction.guild.id)

  const settingsData = {
    category_id: categoryChannel?.id || currentSettings?.category_id || null,
    log_channel_id: logChannel?.id || currentSettings?.log_channel_id || null,
    support_role_id: supportRole?.id || currentSettings?.support_role_id || null,
    welcome_message: currentSettings?.welcome_message || "مرحباً! فريق الدعم سيكون معك قريباً.",
    max_open_tickets: currentSettings?.max_open_tickets || 1,
    auto_close_hours: currentSettings?.auto_close_hours || 48,
    transcript_enabled: currentSettings?.transcript_enabled !== false,
    enabled: true
  }

  const saved = await ticketSystem.saveSettings(interaction.guild.id, settingsData)

  if (!saved) {
    return interaction.editReply({ content: "❌ فشل في حفظ إعدادات التذاكر." })
  }

  const setupEmbed = ticketSystem.buildSetupEmbed(interaction.guild)
  const openButton = ticketSystem.buildOpenButton()

  await targetChannel.send({
    embeds: [setupEmbed],
    components: [openButton]
  })

  const confirmEmbed = new EmbedBuilder()
    .setColor(0x22c55e)
    .setTitle("✅ تم إعداد نظام التذاكر")
    .addFields(
      { name: "📨 قناة فتح التذاكر", value: `${targetChannel}`, inline: true },
      { name: "📁 كاتيقوري التذاكر", value: categoryChannel ? `${categoryChannel}` : "غير محدد", inline: true },
      { name: "📋 قناة اللوق", value: logChannel ? `${logChannel}` : "غير محدد", inline: true },
      { name: "👥 رتبة الدعم", value: supportRole ? `${supportRole}` : "غير محدد", inline: true }
    )
    .setFooter({ text: "يمكنك تعديل الإعدادات باستخدام /تذاكر إعدادات" })
    .setTimestamp()

  await interaction.editReply({ embeds: [confirmEmbed] })
}

// ══════════════════════════════════════
//  SETTINGS HANDLER
// ══════════════════════════════════════

async function handleSettings(interaction) {
  const maxTickets = interaction.options.getInteger("حد_التذاكر")
  const autoClose = interaction.options.getInteger("إغلاق_تلقائي")
  const welcomeMsg = interaction.options.getString("رسالة_الترحيب")
  const transcriptOpt = interaction.options.getString("حفظ_المحادثة")
  const statusOpt = interaction.options.getString("الحالة")

  if (!maxTickets && !autoClose && !welcomeMsg && !transcriptOpt && !statusOpt) {
    return interaction.reply({
      content: "⚠️ حدد خيار واحد على الأقل لتعديله.\nاستخدم `/تذاكر معلومات` لعرض الإعدادات الحالية.",
      ephemeral: true
    })
  }

  await interaction.deferReply({ ephemeral: true })

  const currentSettings = await ticketSystem.getSettings(interaction.guild.id)

  if (!currentSettings) {
    return interaction.editReply({
      content: "❌ نظام التذاكر غير معدّ بعد. استخدم `/تذاكر إعداد` أولاً."
    })
  }

  const updatedSettings = {
    category_id: currentSettings.category_id,
    log_channel_id: currentSettings.log_channel_id,
    support_role_id: currentSettings.support_role_id,
    welcome_message: parseMessage(welcomeMsg) || currentSettings.welcome_message,
    max_open_tickets: maxTickets || currentSettings.max_open_tickets,
    auto_close_hours: autoClose || currentSettings.auto_close_hours,
    transcript_enabled: transcriptOpt !== null ? transcriptOpt === "true" : currentSettings.transcript_enabled,
    enabled: statusOpt !== null ? statusOpt === "on" : currentSettings.enabled
  }

  const saved = await ticketSystem.saveSettings(interaction.guild.id, updatedSettings)

  if (!saved) {
    return interaction.editReply({ content: "❌ فشل في حفظ الإعدادات." })
  }

  const changes = []

  if (maxTickets) changes.push(`🎫 حد التذاكر → **${maxTickets}**`)
  if (autoClose) changes.push(`⏱️ إغلاق تلقائي → **${autoClose} ساعة**`)
  if (welcomeMsg) changes.push(`💬 رسالة الترحيب → تم التحديث`)
  if (transcriptOpt) changes.push(`📜 حفظ المحادثة → **${transcriptOpt === "true" ? "مفعّل" : "معطّل"}**`)
  if (statusOpt) changes.push(`⚡ الحالة → **${statusOpt === "on" ? "مفعّل" : "معطّل"}**`)

  const embed = new EmbedBuilder()
    .setColor(0x3b82f6)
    .setTitle("⚙️ تم تحديث إعدادات التذاكر")
    .setDescription(changes.join("\n"))
    .setTimestamp()

  await interaction.editReply({ embeds: [embed] })
}

// ══════════════════════════════════════
//  INFO HANDLER
// ══════════════════════════════════════

async function handleInfo(interaction) {
  await interaction.deferReply({ ephemeral: true })

  const settings = await ticketSystem.getSettings(interaction.guild.id)
  const stats = await ticketSystem.getTicketStats(interaction.guild.id)

  if (!settings) {
    const noSetupEmbed = new EmbedBuilder()
      .setColor(0xf59e0b)
      .setTitle("⚠️ نظام التذاكر غير معدّ")
      .setDescription("استخدم `/تذاكر إعداد` لتفعيل النظام.")

    return interaction.editReply({ embeds: [noSetupEmbed] })
  }

  const categoryName = settings.category_id
    ? interaction.guild.channels.cache.get(settings.category_id)?.name || "غير موجود"
    : "غير محدد"

  const logChannelName = settings.log_channel_id
    ? `<#${settings.log_channel_id}>`
    : "غير محدد"

  const supportRoleName = settings.support_role_id
    ? `<@&${settings.support_role_id}>`
    : "غير محدد"

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("🎫 معلومات نظام التذاكر")
    .setThumbnail(interaction.guild.iconURL({ dynamic: true, size: 256 }))
    .addFields(
      { name: "⚡ الحالة", value: settings.enabled ? "🟢 مفعّل" : "🔴 معطّل", inline: true },
      { name: "📁 الكاتيقوري", value: categoryName, inline: true },
      { name: "📋 قناة اللوق", value: logChannelName, inline: true },
      { name: "👥 رتبة الدعم", value: supportRoleName, inline: true },
      { name: "🎫 حد التذاكر", value: `${settings.max_open_tickets} لكل عضو`, inline: true },
      { name: "⏱️ إغلاق تلقائي", value: `${settings.auto_close_hours} ساعة`, inline: true },
      { name: "📜 حفظ المحادثة", value: settings.transcript_enabled ? "✅ مفعّل" : "❌ معطّل", inline: true },
      { name: "\u200b", value: "\u200b", inline: true },
      { name: "\u200b", value: "\u200b", inline: true },
      {
        name: "📊 الإحصائيات",
        value:
          `📬 إجمالي التذاكر: **${stats.total}**\n` +
          `🟢 مفتوحة: **${stats.open}**\n` +
          `🔴 مغلقة: **${stats.closed}**`,
        inline: false
      }
    )
    .addFields({
      name: "💬 رسالة الترحيب",
      value: `\`\`\`${settings.welcome_message}\`\`\``,
      inline: false
    })
    .setFooter({ text: "استخدم /تذاكر إعدادات لتعديل الإعدادات" })
    .setTimestamp()

  await interaction.editReply({ embeds: [embed] })
}
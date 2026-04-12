const { SlashCommandBuilder, EmbedBuilder, ChannelType, PermissionFlagsBits } = require("discord.js")
const commandGuardSystem = require("../../systems/commandGuardSystem")
const databaseSystem = require("../../systems/databaseSystem")
const { clearCache, EVENT_TYPES } = require("../../utils/logSender")
const logger = require("../../systems/loggerSystem")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("لوق")
    .setDescription("إعدادات نظام السجلات")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addSubcommand(sub =>
      sub.setName("ضبط").setDescription("تحديد قناة لحدث معين")
        .addStringOption(option => {
          option.setName("الحدث").setDescription("الحدث المراد ضبطه").setRequired(true)
          for (const event of EVENT_TYPES) {
            option.addChoices({ name: event.emoji + " " + event.label, value: event.key })
          }
          return option
        })
        .addChannelOption(option =>
          option.setName("القناة").setDescription("القناة المراد إرسال اللوق فيها").setRequired(true).addChannelTypes(ChannelType.GuildText)
        )
    )
    .addSubcommand(sub =>
      sub.setName("إزالة").setDescription("إيقاف تسجيل حدث معين")
        .addStringOption(option => {
          option.setName("الحدث").setDescription("الحدث المراد إيقافه").setRequired(true)
          for (const event of EVENT_TYPES) {
            option.addChoices({ name: event.emoji + " " + event.label, value: event.key })
          }
          return option
        })
    )
    .addSubcommand(sub =>
      sub.setName("الكل").setDescription("إرسال جميع الأحداث في قناة واحدة")
        .addChannelOption(option =>
          option.setName("القناة").setDescription("القناة المراد إرسال كل اللوقات فيها").setRequired(true).addChannelTypes(ChannelType.GuildText)
        )
    )
    .addSubcommand(sub => sub.setName("تفعيل").setDescription("تفعيل نظام السجلات"))
    .addSubcommand(sub => sub.setName("إيقاف").setDescription("إيقاف نظام السجلات بالكامل"))
    .addSubcommand(sub => sub.setName("حالة").setDescription("عرض حالة نظام السجلات"))
    .addSubcommand(sub => sub.setName("مسح").setDescription("مسح جميع إعدادات السجلات")),

  async execute(interaction) {
    try {
      if (!interaction.guild) {
        return interaction.reply({ content: "❌ هذا الأمر داخل السيرفر فقط", ephemeral: true })
      }

      const isAdmin = commandGuardSystem.requireAdmin(interaction)
      if (!isAdmin) {
        return interaction.reply({ content: "❌ هذا الأمر للأدمن فقط", ephemeral: true })
      }

      const sub = interaction.options.getSubcommand()
      const guildId = interaction.guild.id

      switch (sub) {
        case "ضبط": return await handleSet(interaction, guildId)
        case "إزالة": return await handleRemove(interaction, guildId)
        case "الكل": return await handleAll(interaction, guildId)
        case "تفعيل": return await handleEnable(interaction, guildId)
        case "إيقاف": return await handleDisable(interaction, guildId)
        case "حالة": return await handleStatus(interaction, guildId)
        case "مسح": return await handleReset(interaction, guildId)
      }

    } catch (error) {
      logger.error("LOG_COMMAND_FAILED", { error: error.message })
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: "❌ حدث خطأ في أمر السجلات", ephemeral: true })
      } else {
        await interaction.reply({ content: "❌ حدث خطأ في أمر السجلات", ephemeral: true })
      }
    }
  }
}

async function ensureSettings(guildId) {
  await databaseSystem.query(
    "INSERT INTO log_settings (guild_id, enabled) VALUES ($1, false) ON CONFLICT (guild_id) DO NOTHING",
    [guildId]
  )
}

function checkBotPermissions(channel, guild) {
  const permissions = channel.permissionsFor(guild.members.me)
  if (!permissions) return false
  return permissions.has(["ViewChannel", "SendMessages", "EmbedLinks"])
}

async function handleSet(interaction, guildId) {
  const eventKey = interaction.options.getString("الحدث")
  const channel = interaction.options.getChannel("القناة")
  const eventInfo = EVENT_TYPES.find(e => e.key === eventKey)
  if (!eventInfo) return interaction.reply({ content: "❌ حدث غير صالح", ephemeral: true })
  if (!checkBotPermissions(channel, interaction.guild)) {
    return interaction.reply({ content: "❌ البوت ما عنده صلاحيات كافية في هذي القناة", ephemeral: true })
  }
  await ensureSettings(guildId)
  await databaseSystem.query(
    "UPDATE log_settings SET " + eventInfo.column + " = $1, enabled = true WHERE guild_id = $2",
    [channel.id, guildId]
  )
  clearCache(guildId)
  const embed = new EmbedBuilder()
    .setTitle("📋 تم ضبط السجل")
    .setColor(0x2ecc71)
    .setDescription(eventInfo.emoji + " **" + eventInfo.label + "** → " + channel)
    .setFooter({ text: "النظام مفعّل تلقائياً" })
    .setTimestamp()
  await interaction.reply({ embeds: [embed] })
}

async function handleRemove(interaction, guildId) {
  const eventKey = interaction.options.getString("الحدث")
  const eventInfo = EVENT_TYPES.find(e => e.key === eventKey)
  if (!eventInfo) return interaction.reply({ content: "❌ حدث غير صالح", ephemeral: true })
  await databaseSystem.query(
    "UPDATE log_settings SET " + eventInfo.column + " = NULL WHERE guild_id = $1",
    [guildId]
  )
  clearCache(guildId)
  const embed = new EmbedBuilder()
    .setTitle("📋 تم إيقاف السجل")
    .setColor(0xe74c3c)
    .setDescription(eventInfo.emoji + " **" + eventInfo.label + "** — تم الإيقاف")
    .setTimestamp()
  await interaction.reply({ embeds: [embed] })
}

async function handleAll(interaction, guildId) {
  const channel = interaction.options.getChannel("القناة")
  if (!checkBotPermissions(channel, interaction.guild)) {
    return interaction.reply({ content: "❌ البوت ما عنده صلاحيات كافية في هذي القناة", ephemeral: true })
  }
  await ensureSettings(guildId)
  const setClauses = EVENT_TYPES.map(e => e.column + " = $2").join(", ")
  await databaseSystem.query(
    "UPDATE log_settings SET " + setClauses + ", enabled = true WHERE guild_id = $1",
    [guildId, channel.id]
  )
  clearCache(guildId)
  const embed = new EmbedBuilder()
    .setTitle("📋 تم ضبط جميع السجلات")
    .setColor(0x2ecc71)
    .setDescription("جميع الأحداث (" + EVENT_TYPES.length + ") ستُرسل في " + channel)
    .setTimestamp()
  await interaction.reply({ embeds: [embed] })
}

async function handleEnable(interaction, guildId) {
  await ensureSettings(guildId)
  const settings = await databaseSystem.queryOne("SELECT * FROM log_settings WHERE guild_id = $1", [guildId])
  const hasAnyChannel = EVENT_TYPES.some(e => settings?.[e.column])
  if (!hasAnyChannel) {
    return interaction.reply({ content: "⚠️ حدد قناة لحدث واحد على الأقل أولاً", ephemeral: true })
  }
  await databaseSystem.query("UPDATE log_settings SET enabled = true WHERE guild_id = $1", [guildId])
  clearCache(guildId)
  const embed = new EmbedBuilder().setTitle("📋 نظام السجلات — مفعّل").setColor(0x2ecc71).setDescription("🟢 تم تفعيل نظام السجلات").setTimestamp()
  await interaction.reply({ embeds: [embed] })
}

async function handleDisable(interaction, guildId) {
  await databaseSystem.query("UPDATE log_settings SET enabled = false WHERE guild_id = $1", [guildId])
  clearCache(guildId)
  const embed = new EmbedBuilder().setTitle("📋 نظام السجلات — معطّل").setColor(0xe74c3c).setDescription("🔴 تم إيقاف نظام السجلات").setTimestamp()
  await interaction.reply({ embeds: [embed] })
}

async function handleStatus(interaction, guildId) {
  const settings = await databaseSystem.queryOne("SELECT * FROM log_settings WHERE guild_id = $1", [guildId])
  if (!settings) {
    return interaction.reply({ content: "⚠️ نظام السجلات غير مُعد بعد", ephemeral: true })
  }
  let eventsStatus = ""
  let activeCount = 0
  for (const event of EVENT_TYPES) {
    const channelId = settings[event.column]
    if (channelId) {
      const channel = interaction.guild.channels.cache.get(channelId)
      if (channel) { eventsStatus += event.emoji + " **" + event.label + "** → " + channel + "\n"; activeCount++ }
      else { eventsStatus += event.emoji + " **" + event.label + "** → ⚠️ قناة محذوفة\n" }
    } else {
      eventsStatus += event.emoji + " **" + event.label + "** → ❌ غير محدد\n"
    }
  }
  const embed = new EmbedBuilder()
    .setTitle("📋 حالة نظام السجلات")
    .setColor(settings.enabled ? 0x2ecc71 : 0xe74c3c)
    .addFields(
      { name: "📊 النظام", value: settings.enabled ? "🟢 مفعّل" : "🔴 معطّل", inline: true },
      { name: "📈 الإحصائيات", value: "✅ " + activeCount + " مفعّل", inline: true },
      { name: "📝 الأحداث والقنوات", value: eventsStatus || "لا يوجد" }
    )
    .setTimestamp()
  await interaction.reply({ embeds: [embed] })
}

async function handleReset(interaction, guildId) {
  await databaseSystem.query("DELETE FROM log_settings WHERE guild_id = $1", [guildId])
  clearCache(guildId)
  const embed = new EmbedBuilder().setTitle("📋 تم مسح إعدادات السجلات").setColor(0x95a5a6).setDescription("تم مسح جميع إعدادات السجلات").setTimestamp()
  await interaction.reply({ embeds: [embed] })
}
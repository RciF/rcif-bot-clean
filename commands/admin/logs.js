const { SlashCommandBuilder, EmbedBuilder, ChannelType, PermissionFlagsBits } = require("discord.js")
const commandGuardSystem = require("../../systems/commandGuardSystem")
const databaseSystem = require("../../systems/databaseSystem")
const { clearCache } = require("../../utils/logSender")
const logger = require("../../systems/loggerSystem")

const EVENT_TYPES = [
  { key: "message_delete", label: "حذف الرسائل", emoji: "🗑️" },
  { key: "message_update", label: "تعديل الرسائل", emoji: "✏️" },
  { key: "member_join", label: "دخول الأعضاء", emoji: "📥" },
  { key: "member_leave", label: "خروج الأعضاء", emoji: "📤" },
  { key: "member_ban", label: "حظر الأعضاء", emoji: "🔨" },
  { key: "member_unban", label: "فك الحظر", emoji: "🔓" },
  { key: "member_update", label: "تعديل الأعضاء", emoji: "👤" },
  { key: "channel_create", label: "إنشاء القنوات", emoji: "➕" },
  { key: "channel_delete", label: "حذف القنوات", emoji: "➖" },
  { key: "role_create", label: "إنشاء الأدوار", emoji: "🏷️" },
  { key: "role_delete", label: "حذف الأدوار", emoji: "🗑️" }
]

module.exports = {
  data: new SlashCommandBuilder()
    .setName("لوق")
    .setDescription("إعدادات نظام السجلات")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addSubcommand(sub =>
      sub
        .setName("تفعيل")
        .setDescription("تفعيل نظام السجلات وتحديد القناة")
        .addChannelOption(option =>
          option
            .setName("القناة")
            .setDescription("قناة السجلات")
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("إيقاف")
        .setDescription("إيقاف نظام السجلات")
    )
    .addSubcommand(sub =>
      sub
        .setName("حالة")
        .setDescription("عرض حالة نظام السجلات الحالية")
    )
    .addSubcommand(sub =>
      sub
        .setName("تبديل")
        .setDescription("تفعيل أو إيقاف حدث معين")
        .addStringOption(option => {
          option
            .setName("الحدث")
            .setDescription("الحدث المراد تبديله")
            .setRequired(true)

          for (const event of EVENT_TYPES) {
            option.addChoices({ name: `${event.emoji} ${event.label}`, value: event.key })
          }

          return option
        })
    ),

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

      if (sub === "تفعيل") {
        await handleEnable(interaction, guildId)
      } else if (sub === "إيقاف") {
        await handleDisable(interaction, guildId)
      } else if (sub === "حالة") {
        await handleStatus(interaction, guildId)
      } else if (sub === "تبديل") {
        await handleToggle(interaction, guildId)
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

// ═══════════════════════════════════════
// تفعيل
// ═══════════════════════════════════════
async function handleEnable(interaction, guildId) {
  const channel = interaction.options.getChannel("القناة")

  // تحقق من صلاحيات البوت في القناة
  const permissions = channel.permissionsFor(interaction.guild.members.me)
  if (!permissions || !permissions.has(["ViewChannel", "SendMessages", "EmbedLinks"])) {
    return interaction.reply({
      content: "❌ البوت ما عنده صلاحيات كافية في هذي القناة (يحتاج: عرض القناة + إرسال رسائل + إرسال روابط)",
      ephemeral: true
    })
  }

  await databaseSystem.query(`
    INSERT INTO log_settings (guild_id, log_channel_id, enabled)
    VALUES ($1, $2, true)
    ON CONFLICT (guild_id)
    DO UPDATE SET log_channel_id = $2, enabled = true
  `, [guildId, channel.id])

  clearCache(guildId)

  const embed = new EmbedBuilder()
    .setTitle("📋 نظام السجلات — تم التفعيل")
    .setDescription(`تم تفعيل نظام السجلات في ${channel}`)
    .setColor(0x2ecc71)
    .addFields(
      { name: "📌 القناة", value: `${channel}`, inline: true },
      { name: "📊 الحالة", value: "🟢 مفعّل", inline: true }
    )
    .setFooter({ text: "استخدم /لوق تبديل لتخصيص الأحداث" })
    .setTimestamp()

  await interaction.reply({ embeds: [embed] })
}

// ═══════════════════════════════════════
// إيقاف
// ═══════════════════════════════════════
async function handleDisable(interaction, guildId) {
  await databaseSystem.query(`
    UPDATE log_settings SET enabled = false WHERE guild_id = $1
  `, [guildId])

  clearCache(guildId)

  const embed = new EmbedBuilder()
    .setTitle("📋 نظام السجلات — تم الإيقاف")
    .setDescription("تم إيقاف نظام السجلات")
    .setColor(0xe74c3c)
    .setTimestamp()

  await interaction.reply({ embeds: [embed] })
}

// ═══════════════════════════════════════
// حالة
// ═══════════════════════════════════════
async function handleStatus(interaction, guildId) {
  const result = await databaseSystem.queryOne(
    "SELECT * FROM log_settings WHERE guild_id = $1",
    [guildId]
  )

  if (!result) {
    return interaction.reply({
      content: "⚠️ نظام السجلات غير مُعد بعد. استخدم `/لوق تفعيل` لتفعيله",
      ephemeral: true
    })
  }

  const channel = result.log_channel_id
    ? interaction.guild.channels.cache.get(result.log_channel_id)
    : null

  let eventsStatus = ""
  for (const event of EVENT_TYPES) {
    const enabled = result[event.key] !== false
    eventsStatus += `${event.emoji} ${event.label}: ${enabled ? "🟢" : "🔴"}\n`
  }

  const embed = new EmbedBuilder()
    .setTitle("📋 حالة نظام السجلات")
    .setColor(result.enabled ? 0x2ecc71 : 0xe74c3c)
    .addFields(
      { name: "📊 الحالة", value: result.enabled ? "🟢 مفعّل" : "🔴 معطّل", inline: true },
      { name: "📌 القناة", value: channel ? `${channel}` : "❌ غير محدد", inline: true },
      { name: "\u200b", value: "\u200b", inline: true },
      { name: "📝 الأحداث", value: eventsStatus }
    )
    .setFooter({ text: "استخدم /لوق تبديل لتغيير حدث معين" })
    .setTimestamp()

  await interaction.reply({ embeds: [embed] })
}

// ═══════════════════════════════════════
// تبديل حدث
// ═══════════════════════════════════════
async function handleToggle(interaction, guildId) {
  const eventKey = interaction.options.getString("الحدث")

  const eventInfo = EVENT_TYPES.find(e => e.key === eventKey)
  if (!eventInfo) {
    return interaction.reply({ content: "❌ حدث غير صالح", ephemeral: true })
  }

  // تأكد إن الإعدادات موجودة
  const existing = await databaseSystem.queryOne(
    "SELECT * FROM log_settings WHERE guild_id = $1",
    [guildId]
  )

  if (!existing) {
    return interaction.reply({
      content: "⚠️ فعّل نظام السجلات أولاً باستخدام `/لوق تفعيل`",
      ephemeral: true
    })
  }

  const currentValue = existing[eventKey] !== false
  const newValue = !currentValue

  await databaseSystem.query(
    `UPDATE log_settings SET ${eventKey} = $1 WHERE guild_id = $2`,
    [newValue, guildId]
  )

  clearCache(guildId)

  const embed = new EmbedBuilder()
    .setTitle("📋 تبديل حدث")
    .setDescription(`${eventInfo.emoji} **${eventInfo.label}**: ${newValue ? "🟢 مفعّل" : "🔴 معطّل"}`)
    .setColor(newValue ? 0x2ecc71 : 0xe74c3c)
    .setTimestamp()

  await interaction.reply({ embeds: [embed] })
}
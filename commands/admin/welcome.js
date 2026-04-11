const { SlashCommandBuilder, EmbedBuilder, ChannelType, PermissionFlagsBits } = require("discord.js")
const databaseSystem = require("../../systems/databaseSystem")
const commandGuardSystem = require("../../systems/commandGuardSystem")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ترحيب")
    .setDescription("إعداد نظام الترحيب والوداع")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)

    .addSubcommand(sub =>
      sub.setName("ضبط")
        .setDescription("ضبط إعدادات الترحيب")
        .addChannelOption(o =>
          o.setName("قناة_الترحيب")
            .setDescription("القناة التي ترسل فيها رسائل الترحيب")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
        .addChannelOption(o =>
          o.setName("قناة_الوداع")
            .setDescription("القناة التي ترسل فيها رسائل الوداع (بروم مخفي مثلاً)")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false)
        )
        .addStringOption(o =>
          o.setName("رسالة_الترحيب")
            .setDescription("رسالة الترحيب — استخدم {user} {username} {server} {count}")
            .setRequired(false)
        )
        .addStringOption(o =>
          o.setName("رسالة_الوداع")
            .setDescription("رسالة الوداع — استخدم {username} {server}")
            .setRequired(false)
        )
    )

    .addSubcommand(sub =>
      sub.setName("تفعيل")
        .setDescription("تفعيل نظام الترحيب")
    )

    .addSubcommand(sub =>
      sub.setName("إيقاف")
        .setDescription("إيقاف نظام الترحيب")
    )

    .addSubcommand(sub =>
      sub.setName("اختبار")
        .setDescription("اختبار رسالة الترحيب")
    )

    .addSubcommand(sub =>
      sub.setName("حالة")
        .setDescription("عرض الإعدادات الحالية")
    ),

  async execute(interaction) {
    try {
      if (!interaction.guild) {
        return interaction.reply({ content: "❌ داخل السيرفر فقط", ephemeral: true })
      }

      const isAdmin = commandGuardSystem.requireAdmin(interaction)
      if (!isAdmin) {
        return interaction.reply({ content: "❌ للأدمن فقط", ephemeral: true })
      }

      const sub = interaction.options.getSubcommand()
      const guildId = interaction.guild.id

      if (sub === "ضبط") {
        const welcomeChannel = interaction.options.getChannel("قناة_الترحيب")
        const goodbyeChannel = interaction.options.getChannel("قناة_الوداع")
        const welcomeMsg = interaction.options.getString("رسالة_الترحيب")
        const goodbyeMsg = interaction.options.getString("رسالة_الوداع")

        await databaseSystem.query(`
          INSERT INTO welcome_settings 
          (guild_id, welcome_channel_id, goodbye_channel_id, welcome_message, goodbye_message, enabled)
          VALUES ($1, $2, $3, $4, $5, true)
          ON CONFLICT (guild_id) DO UPDATE SET
            welcome_channel_id = $2,
            goodbye_channel_id = $3,
            welcome_message = COALESCE($4, welcome_settings.welcome_message),
            goodbye_message = COALESCE($5, welcome_settings.goodbye_message),
            enabled = true
        `, [
          guildId,
          welcomeChannel.id,
          goodbyeChannel?.id || null,
          welcomeMsg || null,
          goodbyeMsg || null
        ])

        const embed = new EmbedBuilder()
          .setColor(0x22c55e)
          .setTitle("✅ تم ضبط نظام الترحيب")
          .addFields(
            { name: "📥 قناة الترحيب", value: `${welcomeChannel}`, inline: true },
            { name: "📤 قناة الوداع", value: goodbyeChannel ? `${goodbyeChannel}` : "غير محددة", inline: true },
            { name: "💬 رسالة الترحيب", value: welcomeMsg || "افتراضية", inline: false },
            { name: "💬 رسالة الوداع", value: goodbyeMsg || "افتراضية", inline: false }
          )
          .setFooter({ text: "متغيرات متاحة: {user} {username} {server} {count}" })
          .setTimestamp()

        return interaction.reply({ embeds: [embed] })
      }

      if (sub === "تفعيل") {
        await databaseSystem.query(
          "UPDATE welcome_settings SET enabled = true WHERE guild_id = $1",
          [guildId]
        )
        return interaction.reply({ content: "✅ تم تفعيل نظام الترحيب", ephemeral: true })
      }

      if (sub === "إيقاف") {
        await databaseSystem.query(
          "UPDATE welcome_settings SET enabled = false WHERE guild_id = $1",
          [guildId]
        )
        return interaction.reply({ content: "✅ تم إيقاف نظام الترحيب", ephemeral: true })
      }

      if (sub === "اختبار") {
        const settings = await databaseSystem.queryOne(
          "SELECT * FROM welcome_settings WHERE guild_id = $1",
          [guildId]
        )

        if (!settings) {
          return interaction.reply({ content: "❌ اضبط الإعدادات أولاً بـ /ترحيب ضبط", ephemeral: true })
        }

        // تشغيل الـ event يدوياً للاختبار
        const memberAddEvent = require("../events/guildMemberAdd")
        await memberAddEvent.execute(interaction.member, interaction.client)

        return interaction.reply({ content: "✅ تم إرسال رسالة اختبار!", ephemeral: true })
      }

      if (sub === "حالة") {
        const settings = await databaseSystem.queryOne(
          "SELECT * FROM welcome_settings WHERE guild_id = $1",
          [guildId]
        )

        if (!settings) {
          return interaction.reply({ content: "❌ لم يتم الإعداد بعد", ephemeral: true })
        }

        const welcomeCh = settings.welcome_channel_id
          ? `<#${settings.welcome_channel_id}>`
          : "غير محددة"

        const goodbyeCh = settings.goodbye_channel_id
          ? `<#${settings.goodbye_channel_id}>`
          : "غير محددة"

        const embed = new EmbedBuilder()
          .setColor(settings.enabled ? 0x22c55e : 0xef4444)
          .setTitle("📋 إعدادات الترحيب")
          .addFields(
            { name: "📊 الحالة", value: settings.enabled ? "🟢 مفعّل" : "🔴 معطّل", inline: true },
            { name: "📥 قناة الترحيب", value: welcomeCh, inline: true },
            { name: "📤 قناة الوداع", value: goodbyeCh, inline: true },
            { name: "💬 رسالة الترحيب", value: settings.welcome_message || "افتراضية", inline: false },
            { name: "💬 رسالة الوداع", value: settings.goodbye_message || "افتراضية", inline: false }
          )
          .setTimestamp()

        return interaction.reply({ embeds: [embed] })
      }

    } catch (err) {
      console.error("[WELCOME ERROR]", err)
      if (interaction.replied || interaction.deferred) {
        return interaction.followUp({ content: "❌ حدث خطأ", ephemeral: true })
      }
      return interaction.reply({ content: "❌ حدث خطأ", ephemeral: true })
    }
  }
}
const { SlashCommandBuilder, EmbedBuilder, ChannelType, PermissionFlagsBits } = require("discord.js")
const commandGuardSystem = require("../../systems/commandGuardSystem")
const databaseSystem = require("../../systems/databaseSystem")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("اعدادات_xp")
    .setDescription("إعدادات نظام XP والمستويات")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

    .addSubcommand(sub =>
      sub
        .setName("قناة_الصعود")
        .setDescription("تحديد القناة التي تُرسل فيها رسائل الصعود للمستوى")
        .addChannelOption(option =>
          option
            .setName("القناة")
            .setDescription("القناة المخصصة لرسائل الصعود")
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText)
        )
    )

    .addSubcommand(sub =>
      sub
        .setName("تعطيل_قناة")
        .setDescription("إيقاف رسائل الصعود (ترسل في نفس القناة)")
    )

    .addSubcommand(sub =>
      sub
        .setName("مضاعف_xp")
        .setDescription("ضبط مضاعف XP لجميع الأعضاء")
        .addNumberOption(option =>
          option
            .setName("المضاعف")
            .setDescription("مضاعف XP (مثال: 2 = ضعف XP، 0.5 = نص XP)")
            .setRequired(true)
            .setMinValue(0.1)
            .setMaxValue(10)
        )
    )

    .addSubcommand(sub =>
      sub
        .setName("تعطيل_قناة_xp")
        .setDescription("منع كسب XP في قناة معينة")
        .addChannelOption(option =>
          option
            .setName("القناة")
            .setDescription("القناة المراد تعطيل XP فيها")
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText)
        )
    )

    .addSubcommand(sub =>
      sub
        .setName("حالة")
        .setDescription("عرض إعدادات XP الحالية للسيرفر")
    ),

  async execute(interaction) {
    try {
      if (!interaction.guild) {
        return interaction.reply({ content: "❌ هذا الأمر داخل السيرفر فقط", ephemeral: true })
      }

      const isAdmin = commandGuardSystem.requireAdmin(interaction)
      if (!isAdmin) {
        return interaction.reply({ content: "❌ هذا الأمر للإدارة فقط", ephemeral: true })
      }

      const sub = interaction.options.getSubcommand()
      const guildId = interaction.guild.id

      // ✅ تأكد من وجود صف السيرفر
      await databaseSystem.query(`
        INSERT INTO xp_settings (guild_id)
        VALUES ($1)
        ON CONFLICT (guild_id) DO NOTHING
      `, [guildId])

      switch (sub) {
        case "قناة_الصعود": {
          const channel = interaction.options.getChannel("القناة")

          // ✅ تحقق من صلاحيات البوت
          const perms = channel.permissionsFor(interaction.guild.members.me)
          if (!perms?.has(["ViewChannel", "SendMessages", "EmbedLinks"])) {
            return interaction.reply({
              content: "❌ البوت ما عنده صلاحيات كافية في هذي القناة",
              ephemeral: true
            })
          }

          await databaseSystem.query(
            "UPDATE xp_settings SET levelup_channel_id = $1 WHERE guild_id = $2",
            [channel.id, guildId]
          )

          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(0x22c55e)
                .setTitle("⭐ تم ضبط قناة الصعود")
                .setDescription(`رسائل الصعود للمستوى ستُرسل في ${channel}`)
                .setTimestamp()
            ]
          })
        }

        case "تعطيل_قناة": {
          await databaseSystem.query(
            "UPDATE xp_settings SET levelup_channel_id = NULL WHERE guild_id = $1",
            [guildId]
          )

          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(0xf59e0b)
                .setTitle("⭐ تم التعطيل")
                .setDescription("رسائل الصعود ستُرسل في نفس القناة التي كتب فيها العضو")
                .setTimestamp()
            ]
          })
        }

        case "مضاعف_xp": {
          const multiplier = interaction.options.getNumber("المضاعف")

          await databaseSystem.query(
            "UPDATE xp_settings SET xp_multiplier = $1 WHERE guild_id = $2",
            [multiplier, guildId]
          )

          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(0x3b82f6)
                .setTitle("⭐ تم ضبط المضاعف")
                .addFields(
                  { name: "🔢 المضاعف الجديد", value: `**${multiplier}x**`, inline: true },
                  { name: "📊 مثال", value: `كل رسالة = **${Math.floor(10 * multiplier)} XP**`, inline: true }
                )
                .setTimestamp()
            ]
          })
        }

        case "تعطيل_قناة_xp": {
          const channel = interaction.options.getChannel("القناة")

          // ✅ جلب القنوات المعطلة الحالية
          const current = await databaseSystem.queryOne(
            "SELECT disabled_channels FROM xp_settings WHERE guild_id = $1",
            [guildId]
          )

          const disabled = current?.disabled_channels || []

          if (disabled.includes(channel.id)) {
            // ✅ إزالة القناة من القائمة (إعادة تفعيل)
            const updated = disabled.filter(id => id !== channel.id)
            await databaseSystem.query(
              "UPDATE xp_settings SET disabled_channels = $1 WHERE guild_id = $2",
              [JSON.stringify(updated), guildId]
            )

            return interaction.reply({
              embeds: [
                new EmbedBuilder()
                  .setColor(0x22c55e)
                  .setTitle("⭐ تم إعادة تفعيل XP")
                  .setDescription(`${channel} — تم إعادة تفعيل كسب XP فيها`)
                  .setTimestamp()
              ]
            })
          } else {
            // ✅ إضافة القناة للقائمة
            disabled.push(channel.id)
            await databaseSystem.query(
              "UPDATE xp_settings SET disabled_channels = $1 WHERE guild_id = $2",
              [JSON.stringify(disabled), guildId]
            )

            return interaction.reply({
              embeds: [
                new EmbedBuilder()
                  .setColor(0xef4444)
                  .setTitle("⭐ تم تعطيل XP")
                  .setDescription(`${channel} — لن يكسب الأعضاء XP فيها`)
                  .setFooter({ text: "نفذ الأمر مرة ثانية عشان تعيد التفعيل" })
                  .setTimestamp()
              ]
            })
          }
        }

        case "حالة": {
          const settings = await databaseSystem.queryOne(
            "SELECT * FROM xp_settings WHERE guild_id = $1",
            [guildId]
          )

          const levelupChannel = settings?.levelup_channel_id
            ? `<#${settings.levelup_channel_id}>`
            : "نفس القناة"

          const multiplier = settings?.xp_multiplier || 1
          const disabled = settings?.disabled_channels || []

          const disabledText = disabled.length > 0
            ? disabled.map(id => `<#${id}>`).join(", ")
            : "لا يوجد"

          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(0x5865f2)
                .setTitle("⭐ إعدادات نظام XP")
                .addFields(
                  { name: "📢 قناة الصعود", value: levelupChannel, inline: true },
                  { name: "🔢 مضاعف XP", value: `**${multiplier}x**`, inline: true },
                  { name: "📊 XP لكل رسالة", value: `**${Math.floor(10 * multiplier)} XP**`, inline: true },
                  { name: "🚫 قنوات بدون XP", value: disabledText, inline: false }
                )
                .setTimestamp()
            ],
            ephemeral: true
          })
        }
      }

    } catch (error) {
      console.error("[XP SETTINGS ERROR]", error)

      if (interaction.replied || interaction.deferred) {
        return interaction.followUp({ content: "❌ حدث خطأ في الإعدادات.", ephemeral: true })
      }
      return interaction.reply({ content: "❌ حدث خطأ في الإعدادات.", ephemeral: true })
    }
  }
}
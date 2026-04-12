const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require("discord.js")
const protectionSystem = require("../../systems/protectionSystem")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("حماية")
    .setDescription("إعداد نظام الحماية (Anti-Spam, Anti-Raid, Anti-Nuke)")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

    .addSubcommand(sub =>
      sub.setName("حالة").setDescription("عرض إعدادات الحماية الحالية")
    )

    .addSubcommand(sub =>
      sub.setName("سبام")
        .setDescription("إعداد نظام Anti-Spam")
        .addStringOption(o =>
          o.setName("الحالة").setDescription("تفعيل أو إيقاف").setRequired(true)
            .addChoices({ name: "✅ تفعيل", value: "on" }, { name: "❌ إيقاف", value: "off" })
        )
        .addIntegerOption(o =>
          o.setName("الحد").setDescription("عدد الرسائل قبل العقوبة (افتراضي: 5)").setMinValue(2).setMaxValue(20)
        )
        .addIntegerOption(o =>
          o.setName("الفترة").setDescription("الفترة الزمنية بالثواني (افتراضي: 3)").setMinValue(1).setMaxValue(30)
        )
        .addStringOption(o =>
          o.setName("العقوبة").setDescription("الإجراء عند الكشف")
            .addChoices(
              { name: "🔇 كتم | Mute", value: "mute" },
              { name: "👢 طرد | Kick", value: "kick" },
              { name: "🚫 حظر | Ban", value: "ban" }
            )
        )
        .addIntegerOption(o =>
          o.setName("مدة_الكتم").setDescription("مدة الكتم بالدقائق (افتراضي: 5)").setMinValue(1).setMaxValue(1440)
        )
    )

    .addSubcommand(sub =>
      sub.setName("رايد")
        .setDescription("إعداد نظام Anti-Raid")
        .addStringOption(o =>
          o.setName("الحالة").setDescription("تفعيل أو إيقاف").setRequired(true)
            .addChoices({ name: "✅ تفعيل", value: "on" }, { name: "❌ إيقاف", value: "off" })
        )
        .addIntegerOption(o =>
          o.setName("الحد").setDescription("عدد الأعضاء المنضمين قبل التفعيل (افتراضي: 10)").setMinValue(3).setMaxValue(50)
        )
        .addIntegerOption(o =>
          o.setName("الفترة").setDescription("الفترة الزمنية بالثواني (افتراضي: 10)").setMinValue(3).setMaxValue(60)
        )
        .addStringOption(o =>
          o.setName("العقوبة").setDescription("الإجراء عند الكشف")
            .addChoices(
              { name: "🔒 قفل السيرفر | Lockdown", value: "lockdown" },
              { name: "👢 طرد الجدد | Kick", value: "kick" }
            )
        )
    )

    .addSubcommand(sub =>
      sub.setName("نيوك")
        .setDescription("إعداد نظام Anti-Nuke")
        .addStringOption(o =>
          o.setName("الحالة").setDescription("تفعيل أو إيقاف").setRequired(true)
            .addChoices({ name: "✅ تفعيل", value: "on" }, { name: "❌ إيقاف", value: "off" })
        )
        .addIntegerOption(o =>
          o.setName("حد_القنوات").setDescription("حذف كم قناة قبل التفعيل (افتراضي: 3)").setMinValue(1).setMaxValue(10)
        )
        .addIntegerOption(o =>
          o.setName("حد_الرتب").setDescription("حذف كم رتبة قبل التفعيل (افتراضي: 3)").setMinValue(1).setMaxValue(10)
        )
        .addIntegerOption(o =>
          o.setName("حد_الحظر").setDescription("حظر كم عضو قبل التفعيل (افتراضي: 3)").setMinValue(1).setMaxValue(10)
        )
        .addStringOption(o =>
          o.setName("العقوبة").setDescription("الإجراء على المنفذ")
            .addChoices(
              { name: "🚫 حظر | Ban", value: "ban" },
              { name: "👢 طرد | Kick", value: "kick" },
              { name: "🔑 سلب الصلاحيات | Strip Roles", value: "strip_roles" }
            )
        )
    )

    .addSubcommand(sub =>
      sub.setName("لوق")
        .setDescription("تحديد قناة سجل الحماية")
        .addChannelOption(o =>
          o.setName("القناة").setDescription("القناة المخصصة للوق").setRequired(true)
            .addChannelTypes(ChannelType.GuildText)
        )
    )

    .addSubcommand(sub =>
      sub.setName("وايتلست")
        .setDescription("إضافة أو إزالة مستخدم/رتبة من القائمة البيضاء")
        .addStringOption(o =>
          o.setName("النوع").setDescription("نوع العنصر").setRequired(true)
            .addChoices({ name: "👤 مستخدم", value: "user" }, { name: "🏷️ رتبة", value: "role" })
        )
        .addStringOption(o =>
          o.setName("الإجراء").setDescription("إضافة أو إزالة").setRequired(true)
            .addChoices({ name: "➕ إضافة", value: "add" }, { name: "➖ إزالة", value: "remove" })
        )
        .addUserOption(o => o.setName("المستخدم").setDescription("المستخدم المراد إضافته/إزالته"))
        .addRoleOption(o => o.setName("الرتبة").setDescription("الرتبة المراد إضافتها/إزالتها"))
    )

    .addSubcommand(sub =>
      sub.setName("لوكداون")
        .setDescription("تفعيل أو إيقاف Lockdown يدوياً")
        .addStringOption(o =>
          o.setName("الإجراء").setDescription("تفعيل أو إيقاف").setRequired(true)
            .addChoices({ name: "🔒 تفعيل", value: "on" }, { name: "🔓 إيقاف", value: "off" })
        )
        .addStringOption(o =>
          o.setName("السبب").setDescription("سبب تفعيل/إيقاف اللوكداون")
        )
    ),

  async execute(interaction) {
    try {
      if (!interaction.guild) {
        return interaction.reply({ content: "❌ هذا الأمر داخل السيرفر فقط", ephemeral: true })
      }

      const sub = interaction.options.getSubcommand()
      const guildId = interaction.guild.id

      // ══════════════════════════════════════
      //  حالة
      // ══════════════════════════════════════
      if (sub === "حالة") {
        await interaction.deferReply()
        const s = await protectionSystem.getSettings(guildId)

        if (!s) {
          return interaction.editReply({
            embeds: [
              new EmbedBuilder()
                .setColor(0x64748b)
                .setTitle("🛡️ نظام الحماية")
                .setDescription("لم يتم إعداد نظام الحماية بعد.\nاستخدم الأوامر الفرعية للبدء.")
                .setTimestamp()
            ]
          })
        }

        const logChannel = s.log_channel_id ? `<#${s.log_channel_id}>` : "❌ غير محدد"
        const wlUsers = (s.whitelist_users || []).map(id => `<@${id}>`)
        const wlRoles = (s.whitelist_roles || []).map(id => `<@&${id}>`)
        const whitelist = [...wlUsers, ...wlRoles]
        const inLockdown = protectionSystem.isInLockdown(guildId)

        const embed = new EmbedBuilder()
          .setColor(inLockdown ? 0xef4444 : 0x8b5cf6)
          .setTitle(`🛡️ إعدادات نظام الحماية${inLockdown ? " — ⚠️ LOCKDOWN نشط!" : ""}`)
          .setThumbnail(interaction.guild.iconURL({ dynamic: true, size: 256 }))
          .addFields(
            {
              name: "🔴 Anti-Spam",
              value: [
                `الحالة: ${s.antispam_enabled ? "🟢 مفعّل" : "🔴 معطّل"}`,
                `الحد: **${s.antispam_max_messages || 5}** رسائل / **${(s.antispam_interval_ms || 3000) / 1000}** ثانية`,
                `العقوبة: **${actionLabel(s.antispam_action || "mute")}**`,
                s.antispam_action !== "mute" ? "" : `مدة الكتم: **${(s.antispam_mute_duration || 300000) / 60000}** دقيقة`
              ].filter(Boolean).join("\n"),
              inline: true
            },
            {
              name: "🌊 Anti-Raid",
              value: [
                `الحالة: ${s.antiraid_enabled ? "🟢 مفعّل" : "🔴 معطّل"}`,
                `الحد: **${s.antiraid_join_threshold || 10}** عضو / **${(s.antiraid_join_interval_ms || 10000) / 1000}** ثانية`,
                `العقوبة: **${actionLabel(s.antiraid_action || "lockdown")}**`
              ].join("\n"),
              inline: true
            },
            { name: "\u200b", value: "\u200b", inline: true },
            {
              name: "💣 Anti-Nuke",
              value: [
                `الحالة: ${s.antinuke_enabled ? "🟢 مفعّل" : "🔴 معطّل"}`,
                `حد القنوات: **${s.antinuke_channel_delete_threshold || 3}** | الرتب: **${s.antinuke_role_delete_threshold || 3}** | الحظر: **${s.antinuke_ban_threshold || 3}**`,
                `الفترة: **${(s.antinuke_interval_ms || 10000) / 1000}** ثانية`,
                `العقوبة: **${actionLabel(s.antinuke_action || "ban")}**`
              ].join("\n"),
              inline: true
            },
            {
              name: "📋 قناة اللوق",
              value: logChannel,
              inline: true
            },
            {
              name: `🔐 القائمة البيضاء (${whitelist.length})`,
              value: whitelist.length > 0 ? whitelist.slice(0, 5).join(", ") + (whitelist.length > 5 ? `\n... و ${whitelist.length - 5} آخرين` : "") : "لا يوجد",
              inline: true
            }
          )
          .setFooter({ text: `${interaction.guild.name} • نظام الحماية` })
          .setTimestamp()

        return interaction.editReply({ embeds: [embed] })
      }

      // ══════════════════════════════════════
      //  سبام
      // ══════════════════════════════════════
      if (sub === "سبام") {
        await interaction.deferReply()
        const current = await protectionSystem.getSettings(guildId) || {}

        const enabled = interaction.options.getString("الحالة") === "on"
        const maxMsgs = interaction.options.getInteger("الحد") ?? current.antispam_max_messages ?? 5
        const interval = (interaction.options.getInteger("الفترة") ?? (current.antispam_interval_ms ?? 3000) / 1000) * 1000
        const action = interaction.options.getString("العقوبة") ?? current.antispam_action ?? "mute"
        const muteDuration = (interaction.options.getInteger("مدة_الكتم") ?? (current.antispam_mute_duration ?? 300000) / 60000) * 60000

        await protectionSystem.saveSettings(guildId, {
          ...current,
          antispam_enabled: enabled,
          antispam_max_messages: maxMsgs,
          antispam_interval_ms: interval,
          antispam_action: action,
          antispam_mute_duration: muteDuration
        })

        const embed = new EmbedBuilder()
          .setColor(enabled ? 0x22c55e : 0xef4444)
          .setTitle(`🔴 Anti-Spam — ${enabled ? "✅ تم التفعيل" : "❌ تم الإيقاف"}`)
          .addFields(
            { name: "📊 الحد", value: `**${maxMsgs}** رسائل في **${interval / 1000}** ثانية`, inline: true },
            { name: "⚡ العقوبة", value: `**${actionLabel(action)}**`, inline: true },
            action === "mute" ? { name: "⏱️ مدة الكتم", value: `**${muteDuration / 60000}** دقيقة`, inline: true } : { name: "\u200b", value: "\u200b", inline: true },
            { name: "👮 بواسطة", value: `${interaction.user}`, inline: true }
          )
          .setTimestamp()

        return interaction.editReply({ embeds: [embed] })
      }

      // ══════════════════════════════════════
      //  رايد
      // ══════════════════════════════════════
      if (sub === "رايد") {
        await interaction.deferReply()
        const current = await protectionSystem.getSettings(guildId) || {}

        const enabled = interaction.options.getString("الحالة") === "on"
        const threshold = interaction.options.getInteger("الحد") ?? current.antiraid_join_threshold ?? 10
        const interval = (interaction.options.getInteger("الفترة") ?? (current.antiraid_join_interval_ms ?? 10000) / 1000) * 1000
        const action = interaction.options.getString("العقوبة") ?? current.antiraid_action ?? "lockdown"

        await protectionSystem.saveSettings(guildId, {
          ...current,
          antiraid_enabled: enabled,
          antiraid_join_threshold: threshold,
          antiraid_join_interval_ms: interval,
          antiraid_action: action
        })

        const embed = new EmbedBuilder()
          .setColor(enabled ? 0x22c55e : 0xef4444)
          .setTitle(`🌊 Anti-Raid — ${enabled ? "✅ تم التفعيل" : "❌ تم الإيقاف"}`)
          .addFields(
            { name: "📊 الحد", value: `**${threshold}** عضو في **${interval / 1000}** ثانية`, inline: true },
            { name: "⚡ العقوبة", value: `**${actionLabel(action)}**`, inline: true },
            { name: "👮 بواسطة", value: `${interaction.user}`, inline: true }
          )
          .setTimestamp()

        return interaction.editReply({ embeds: [embed] })
      }

      // ══════════════════════════════════════
      //  نيوك
      // ══════════════════════════════════════
      if (sub === "نيوك") {
        await interaction.deferReply()
        const current = await protectionSystem.getSettings(guildId) || {}

        const enabled = interaction.options.getString("الحالة") === "on"
        const chThreshold = interaction.options.getInteger("حد_القنوات") ?? current.antinuke_channel_delete_threshold ?? 3
        const roleThreshold = interaction.options.getInteger("حد_الرتب") ?? current.antinuke_role_delete_threshold ?? 3
        const banThreshold = interaction.options.getInteger("حد_الحظر") ?? current.antinuke_ban_threshold ?? 3
        const action = interaction.options.getString("العقوبة") ?? current.antinuke_action ?? "ban"

        await protectionSystem.saveSettings(guildId, {
          ...current,
          antinuke_enabled: enabled,
          antinuke_channel_delete_threshold: chThreshold,
          antinuke_role_delete_threshold: roleThreshold,
          antinuke_ban_threshold: banThreshold,
          antinuke_action: action
        })

        const embed = new EmbedBuilder()
          .setColor(enabled ? 0x22c55e : 0xef4444)
          .setTitle(`💣 Anti-Nuke — ${enabled ? "✅ تم التفعيل" : "❌ تم الإيقاف"}`)
          .addFields(
            { name: "🗑️ حد القنوات", value: `**${chThreshold}** حذف`, inline: true },
            { name: "🏷️ حد الرتب", value: `**${roleThreshold}** حذف`, inline: true },
            { name: "🔨 حد الحظر", value: `**${banThreshold}** حظر`, inline: true },
            { name: "⚡ العقوبة", value: `**${actionLabel(action)}**`, inline: true },
            { name: "👮 بواسطة", value: `${interaction.user}`, inline: true }
          )
          .setTimestamp()

        return interaction.editReply({ embeds: [embed] })
      }

      // ══════════════════════════════════════
      //  لوق
      // ══════════════════════════════════════
      if (sub === "لوق") {
        const channel = interaction.options.getChannel("القناة")
        const current = await protectionSystem.getSettings(guildId) || {}

        const perms = channel.permissionsFor(interaction.guild.members.me)
        if (!perms?.has(["ViewChannel", "SendMessages", "EmbedLinks"])) {
          return interaction.reply({
            content: "❌ البوت ما عنده صلاحيات كافية في هذي القناة.",
            ephemeral: true
          })
        }

        await protectionSystem.saveSettings(guildId, { ...current, log_channel_id: channel.id })

        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0x3b82f6)
              .setTitle("📋 قناة لوق الحماية")
              .setDescription(`تم تحديد ${channel} كقناة سجل لنظام الحماية.`)
              .setTimestamp()
          ]
        })
      }

      // ══════════════════════════════════════
      //  وايتلست
      // ══════════════════════════════════════
      if (sub === "وايتلست") {
        const type = interaction.options.getString("النوع")
        const action = interaction.options.getString("الإجراء")
        const user = interaction.options.getUser("المستخدم")
        const role = interaction.options.getRole("الرتبة")

        if (type === "user" && !user) {
          return interaction.reply({ content: "❌ يجب تحديد مستخدم.", ephemeral: true })
        }
        if (type === "role" && !role) {
          return interaction.reply({ content: "❌ يجب تحديد رتبة.", ephemeral: true })
        }

        const current = await protectionSystem.getSettings(guildId) || {}
        let wlUsers = current.whitelist_users || []
        let wlRoles = current.whitelist_roles || []

        if (type === "user") {
          if (action === "add") {
            if (!wlUsers.includes(user.id)) wlUsers.push(user.id)
          } else {
            wlUsers = wlUsers.filter(id => id !== user.id)
          }
        } else {
          if (action === "add") {
            if (!wlRoles.includes(role.id)) wlRoles.push(role.id)
          } else {
            wlRoles = wlRoles.filter(id => id !== role.id)
          }
        }

        await protectionSystem.saveSettings(guildId, {
          ...current,
          whitelist_users: wlUsers,
          whitelist_roles: wlRoles
        })

        const target = type === "user" ? user.toString() : role.toString()
        const actionText = action === "add" ? "تمت الإضافة ➕" : "تمت الإزالة ➖"

        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(action === "add" ? 0x22c55e : 0xef4444)
              .setTitle(`🔐 القائمة البيضاء — ${actionText}`)
              .addFields(
                { name: type === "user" ? "👤 المستخدم" : "🏷️ الرتبة", value: target, inline: true },
                { name: "📊 إجمالي", value: `👤 ${wlUsers.length} مستخدم | 🏷️ ${wlRoles.length} رتبة`, inline: true }
              )
              .setTimestamp()
          ]
        })
      }

      // ══════════════════════════════════════
      //  لوكداون
      // ══════════════════════════════════════
      if (sub === "لوكداون") {
        const action = interaction.options.getString("الإجراء")
        const reason = interaction.options.getString("السبب") || "تفعيل يدوي من الأدمن"
        const settings = await protectionSystem.getSettings(guildId) || {}

        await interaction.deferReply()

        if (action === "on") {
          if (protectionSystem.isInLockdown(guildId)) {
            return interaction.editReply({ content: "⚠️ السيرفر في Lockdown بالفعل." })
          }

          await protectionSystem.activateLockdown(interaction.guild, settings)

          const embed = new EmbedBuilder()
            .setColor(0xef4444)
            .setTitle("🔒 تم تفعيل Lockdown")
            .setDescription(`تم قفل جميع القنوات النصية.\nسيتم الرفع تلقائياً بعد 10 دقائق.`)
            .addFields(
              { name: "📝 السبب", value: reason, inline: true },
              { name: "👮 بواسطة", value: `${interaction.user}`, inline: true }
            )
            .setTimestamp()

          // لوق
          await protectionSystem.sendLog(interaction.guild, settings, embed)
          return interaction.editReply({ embeds: [embed] })

        } else {
          if (!protectionSystem.isInLockdown(guildId)) {
            return interaction.editReply({ content: "⚠️ السيرفر ليس في Lockdown." })
          }

          await protectionSystem.deactivateLockdown(interaction.guild, settings)

          const embed = new EmbedBuilder()
            .setColor(0x22c55e)
            .setTitle("🔓 تم رفع Lockdown")
            .setDescription("تم فتح جميع القنوات النصية.")
            .addFields(
              { name: "📝 السبب", value: reason, inline: true },
              { name: "👮 بواسطة", value: `${interaction.user}`, inline: true }
            )
            .setTimestamp()

          await protectionSystem.sendLog(interaction.guild, settings, embed)
          return interaction.editReply({ embeds: [embed] })
        }
      }

    } catch (err) {
      console.error("[PROTECTION COMMAND ERROR]", err)
      if (interaction.replied || interaction.deferred) {
        return interaction.followUp({ content: "❌ حدث خطأ في نظام الحماية.", ephemeral: true })
      }
      return interaction.reply({ content: "❌ حدث خطأ في نظام الحماية.", ephemeral: true })
    }
  }
}

// ══════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════
function actionLabel(action) {
  const map = {
    mute: "🔇 كتم",
    kick: "👢 طرد",
    ban: "🚫 حظر",
    lockdown: "🔒 قفل السيرفر",
    strip_roles: "🔑 سلب الصلاحيات"
  }
  return map[action] || action
}
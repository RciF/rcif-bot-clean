const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits
} = require("discord.js")
const {
  ensureTables,
  canManageEvents,
  getEvent,
  getAttendees,
  getEventStats,
  EVENT_COLORS,
  EVENT_EMOJIS
} = require("./_eventShared")

// ══════════════════════════════════════
//  /فعالية-حضور
// ══════════════════════════════════════

const eventAttendees = {
  data: new SlashCommandBuilder()
    .setName("فعالية-حضور")
    .setDescription("عرض قائمة المسجلين في فعالية")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addIntegerOption(o =>
      o.setName("الرقم").setDescription("رقم الفعالية").setRequired(true).setMinValue(1)
    ),

  async execute(interaction) {
    try {
      if (!interaction.guild) {
        return interaction.reply({ content: "❌ هذا الأمر داخل السيرفر فقط", ephemeral: true })
      }

      await ensureTables()

      const allowed = canManageEvents(interaction)
      if (!allowed) {
        return interaction.reply({ content: "❌ ما عندك صلاحية عرض قائمة الحضور.", ephemeral: true })
      }

      const eventId = interaction.options.getInteger("الرقم")
      await interaction.deferReply({ ephemeral: true })

      const event = await getEvent(eventId)
      if (!event || event.guild_id !== interaction.guild.id) {
        return interaction.editReply({ content: `❌ ما فيه فعالية برقم #${eventId}.` })
      }

      const attendees = await getAttendees(eventId)

      if (attendees.length === 0) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(EVENT_COLORS[event.category] || 0x5865f2)
              .setTitle(`👥 حضور: ${event.title}`)
              .setDescription("📭 لا يوجد مسجلون بعد في هذه الفعالية.")
              .setTimestamp()
          ]
        })
      }

      const going = attendees.filter(a => a.status === "going")
      const maybe = attendees.filter(a => a.status === "maybe")

      const embed = new EmbedBuilder()
        .setColor(EVENT_COLORS[event.category] || 0x5865f2)
        .setTitle(`👥 حضور: ${EVENT_EMOJIS[event.category] || "🎉"} ${event.title}`)
        .setTimestamp()

      if (going.length > 0) {
        const list = going.slice(0, 20).map((a, i) => `\`${i + 1}\` <@${a.user_id}>`).join("\n")
        embed.addFields({
          name: `✅ حاضر (${going.length})`,
          value: list + (going.length > 20 ? `\n... و**${going.length - 20}** آخرين` : ""),
          inline: false
        })
      }

      if (maybe.length > 0) {
        const list = maybe.slice(0, 10).map((a, i) => `\`${i + 1}\` <@${a.user_id}>`).join("\n")
        embed.addFields({
          name: `🤔 ربما (${maybe.length})`,
          value: list,
          inline: false
        })
      }

      // ── إحصائيات ──
      const total = going.length + maybe.length
      let footerText = `📊 إجمالي المسجلين: ${total}`

      if (event.max_attendees) {
        const remaining = event.max_attendees - going.length
        footerText += ` | ${going.length}/${event.max_attendees} مكان | متبقي: ${Math.max(0, remaining)}`
      }

      embed.setFooter({ text: footerText })

      return interaction.editReply({ embeds: [embed] })

    } catch (err) {
      console.error("[EVENT-ATTENDEES ERROR]", err)
      const msg = "❌ حدث خطأ في عرض الحضور."
      if (interaction.deferred) return interaction.editReply({ content: msg })
      if (!interaction.replied) return interaction.reply({ content: msg, ephemeral: true })
    }
  }
}

// ══════════════════════════════════════
//  /فعالية-تذكير
// ══════════════════════════════════════

const eventRemind = {
  data: new SlashCommandBuilder()
    .setName("فعالية-تذكير")
    .setDescription("إرسال تذكير للمسجلين في فعالية")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addIntegerOption(o =>
      o.setName("الرقم").setDescription("رقم الفعالية").setRequired(true).setMinValue(1)
    )
    .addStringOption(o =>
      o.setName("الرسالة")
        .setDescription("رسالة تذكير مخصصة (اختياري)")
        .setRequired(false)
        .setMaxLength(300)
    )
    .addStringOption(o =>
      o.setName("المجموعة")
        .setDescription("من تبي تذكّر؟")
        .setRequired(false)
        .addChoices(
          { name: "✅ الحاضرين فقط",  value: "going" },
          { name: "🤔 ربما فقط",      value: "maybe" },
          { name: "👥 الجميع",         value: "all"   }
        )
    ),

  async execute(interaction) {
    try {
      if (!interaction.guild) {
        return interaction.reply({ content: "❌ هذا الأمر داخل السيرفر فقط", ephemeral: true })
      }

      await ensureTables()

      const allowed = canManageEvents(interaction)
      if (!allowed) {
        return interaction.reply({ content: "❌ ما عندك صلاحية إرسال التذكير.", ephemeral: true })
      }

      const eventId   = interaction.options.getInteger("الرقم")
      const customMsg = interaction.options.getString("الرسالة")
      const group     = interaction.options.getString("المجموعة") || "going"

      await interaction.deferReply({ ephemeral: true })

      const event = await getEvent(eventId)
      if (!event || event.guild_id !== interaction.guild.id) {
        return interaction.editReply({ content: `❌ ما فيه فعالية برقم #${eventId}.` })
      }

      if (event.status === "ended" || event.status === "cancelled") {
        return interaction.editReply({ content: "❌ الفعالية منتهية أو ملغية." })
      }

      const attendees = await getAttendees(eventId)

      let targets = []
      if (group === "going")       targets = attendees.filter(a => a.status === "going")
      else if (group === "maybe")  targets = attendees.filter(a => a.status === "maybe")
      else                         targets = attendees

      if (targets.length === 0) {
        return interaction.editReply({ content: "📭 لا يوجد مسجلون في المجموعة المحددة." })
      }

      const channel = interaction.guild.channels.cache.get(event.channel_id)
      if (!channel) {
        return interaction.editReply({ content: "❌ قناة الفعالية غير موجودة." })
      }

      const ts          = Math.floor(event.start_time / 1000)
      const mentions    = targets.slice(0, 20).map(a => `<@${a.user_id}>`).join(" ")
      const reminderMsg = customMsg
        || `⏰ **تذكير!** فعالية **${event.title}** (#${event.id}) تبدأ <t:${ts}:R> — <t:${ts}:F>`

      await channel.send({
        content: `${mentions}\n${reminderMsg}`,
        allowedMentions: { users: targets.slice(0, 20).map(a => a.user_id) }
      })

      const groupLabel = group === "going" ? "الحاضرين" : group === "maybe" ? "ربما" : "الجميع"

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x22c55e)
            .setTitle("✅ تم إرسال التذكير")
            .addFields(
              { name: "👥 المجموعة",  value: groupLabel,          inline: true },
              { name: "📨 العدد",     value: `${targets.length}`, inline: true }
            )
            .setTimestamp()
        ]
      })

    } catch (err) {
      console.error("[EVENT-REMIND ERROR]", err)
      const msg = "❌ حدث خطأ في إرسال التذكير."
      if (interaction.deferred) return interaction.editReply({ content: msg })
      if (!interaction.replied) return interaction.reply({ content: msg, ephemeral: true })
    }
  }
}

// ══════════════════════════════════════
//  EXPORTS
// ══════════════════════════════════════

module.exports = {
  commands: [eventAttendees.data, eventRemind.data],
  data: eventAttendees.data,
  execute: eventAttendees.execute,
  eventAttendees,
  eventRemind
}
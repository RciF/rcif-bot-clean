const { SlashCommandBuilder, EmbedBuilder } = require("discord.js")
const {
  ensureTables,
  canManageEvents,
  getEvent,
  getAttendees,
  EVENT_COLORS
} = require("./_eventShared")

// ══════════════════════════════════════
//  /فعالية-حضور
// ══════════════════════════════════════

module.exports.eventAttendees = {
  data: new SlashCommandBuilder()
    .setName("فعالية-حضور")
    .setDescription("عرض قائمة المسجلين في فعالية")
    .setDMPermission(false)
    .addIntegerOption(o =>
      o.setName("الرقم").setDescription("رقم الفعالية").setRequired(true).setMinValue(1)
    ),

  async execute(interaction) {
    try {
      if (!interaction.guild) {
        return interaction.reply({ content: "❌ هذا الأمر داخل السيرفر فقط", ephemeral: true })
      }

      await ensureTables()

      const allowed = await canManageEvents(interaction)
      if (!allowed) {
        return interaction.reply({ content: "❌ ما عندك صلاحية عرض قائمة الحضور.", ephemeral: true })
      }

      const eventId = interaction.options.getInteger("الرقم")
      await interaction.deferReply({ ephemeral: true })

      const event = await getEvent(eventId)
      if (!event || event.guild_id !== interaction.guild.id) {
        return interaction.editReply({ content: "❌ فعالية غير موجودة." })
      }

      const attendees = await getAttendees(eventId)
      if (attendees.length === 0) {
        return interaction.editReply({ content: "📭 لا يوجد مسجلون بعد في هذه الفعالية." })
      }

      const going = attendees.filter(a => a.status === "going")
      const maybe = attendees.filter(a => a.status === "maybe")

      const embed = new EmbedBuilder()
        .setColor(EVENT_COLORS[event.category] || 0x5865f2)
        .setTitle(`👥 حضور: ${event.title}`)
        .setTimestamp()

      if (going.length > 0) {
        const list = going.slice(0, 20).map((a, i) => `${i + 1}. <@${a.user_id}>`).join("\n")
        embed.addFields({
          name: `✅ حاضر (${going.length})`,
          value: list + (going.length > 20 ? `\n... و${going.length - 20} آخرين` : ""),
          inline: false
        })
      }

      if (maybe.length > 0) {
        const list = maybe.slice(0, 10).map((a, i) => `${i + 1}. <@${a.user_id}>`).join("\n")
        embed.addFields({
          name: `🤔 ربما (${maybe.length})`,
          value: list,
          inline: false
        })
      }

      if (event.max_attendees) {
        const remaining = event.max_attendees - going.length
        embed.setFooter({
          text: `${going.length}/${event.max_attendees} مكان | متبقي: ${Math.max(0, remaining)}`
        })
      }

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

module.exports.eventRemind = {
  data: new SlashCommandBuilder()
    .setName("فعالية-تذكير")
    .setDescription("إرسال تذكير لجميع المسجلين في فعالية")
    .setDMPermission(false)
    .addIntegerOption(o =>
      o.setName("الرقم").setDescription("رقم الفعالية").setRequired(true).setMinValue(1)
    )
    .addStringOption(o =>
      o.setName("الرسالة").setDescription("رسالة التذكير المخصصة").setRequired(false)
    ),

  async execute(interaction) {
    try {
      if (!interaction.guild) {
        return interaction.reply({ content: "❌ هذا الأمر داخل السيرفر فقط", ephemeral: true })
      }

      await ensureTables()

      const allowed = await canManageEvents(interaction)
      if (!allowed) {
        return interaction.reply({ content: "❌ ما عندك صلاحية إرسال التذكير.", ephemeral: true })
      }

      const eventId   = interaction.options.getInteger("الرقم")
      const customMsg = interaction.options.getString("الرسالة")

      await interaction.deferReply({ ephemeral: true })

      const event = await getEvent(eventId)
      if (!event || event.guild_id !== interaction.guild.id) {
        return interaction.editReply({ content: "❌ فعالية غير موجودة." })
      }

      if (event.status === "ended" || event.status === "cancelled") {
        return interaction.editReply({ content: "❌ الفعالية منتهية أو ملغية." })
      }

      const going = (await getAttendees(eventId)).filter(a => a.status === "going")
      if (going.length === 0) {
        return interaction.editReply({ content: "📭 لا يوجد مسجلون لإرسال التذكير لهم." })
      }

      const channel = interaction.guild.channels.cache.get(event.channel_id)
      if (!channel) {
        return interaction.editReply({ content: "❌ القناة غير موجودة." })
      }

      const ts          = Math.floor(event.start_time / 1000)
      const mentions    = going.slice(0, 20).map(a => `<@${a.user_id}>`).join(" ")
      const reminderMsg = customMsg || `⏰ تذكير! فعالية **${event.title}** تبدأ <t:${ts}:R>`

      await channel.send({
        content: `${mentions}\n${reminderMsg}`,
        allowedMentions: { users: going.slice(0, 20).map(a => a.user_id) }
      })

      return interaction.editReply({
        content: `✅ تم إرسال التذكير لـ **${going.length}** شخص!`
      })

    } catch (err) {
      console.error("[EVENT-REMIND ERROR]", err)
      const msg = "❌ حدث خطأ في إرسال التذكير."
      if (interaction.deferred) return interaction.editReply({ content: msg })
      if (!interaction.replied) return interaction.reply({ content: msg, ephemeral: true })
    }
  }
}
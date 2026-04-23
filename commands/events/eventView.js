const { SlashCommandBuilder, EmbedBuilder } = require("discord.js")
const {
  ensureTables,
  getEvent,
  getGuildEvents,
  getAttendees,
  buildEventEmbed,
  buildEventButtons,
  EVENT_EMOJIS
} = require("./_eventShared")

// ══════════════════════════════════════
//  /فعالية-عرض  — عام للجميع
// ══════════════════════════════════════

module.exports.eventView = {
  data: new SlashCommandBuilder()
    .setName("فعالية-عرض")
    .setDescription("عرض تفاصيل فعالية محددة")
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
      await interaction.deferReply()

      const eventId = interaction.options.getInteger("الرقم")
      const event   = await getEvent(eventId)

      if (!event || event.guild_id !== interaction.guild.id) {
        return interaction.editReply({ content: "❌ فعالية غير موجودة في هذا السيرفر." })
      }

      const attendees  = await getAttendees(eventId)
      const goingCount = attendees.filter(a => a.status === "going").length
      const maybeCount = attendees.filter(a => a.status === "maybe").length

      const embed   = await buildEventEmbed(event, interaction.guild, goingCount, maybeCount)
      const buttons = buildEventButtons(event.id, event.status)

      return interaction.editReply({ embeds: [embed], components: [buttons] })

    } catch (err) {
      console.error("[EVENT-VIEW ERROR]", err)
      const msg = "❌ حدث خطأ في عرض الفعالية."
      if (interaction.deferred) return interaction.editReply({ content: msg })
      if (!interaction.replied) return interaction.reply({ content: msg, ephemeral: true })
    }
  }
}

// ══════════════════════════════════════
//  /فعالية-قائمة  — عام للجميع
// ══════════════════════════════════════

module.exports.eventList = {
  data: new SlashCommandBuilder()
    .setName("فعالية-قائمة")
    .setDescription("عرض الفعاليات القادمة في السيرفر")
    .setDMPermission(false),

  async execute(interaction) {
    try {
      if (!interaction.guild) {
        return interaction.reply({ content: "❌ هذا الأمر داخل السيرفر فقط", ephemeral: true })
      }

      await ensureTables()
      await interaction.deferReply()

      const upcoming   = await getGuildEvents(interaction.guild.id, "upcoming", 10)
      const live       = await getGuildEvents(interaction.guild.id, "live", 5)
      const allEvents  = [...live, ...upcoming]

      if (allEvents.length === 0) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0x64748b)
              .setTitle("📅 لا توجد فعاليات قادمة")
              .setDescription("ما فيه فعاليات مجدولة حالياً.")
              .setTimestamp()
          ]
        })
      }

      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle("📅 الفعاليات القادمة")
        .setThumbnail(interaction.guild.iconURL({ dynamic: true, size: 128 }))
        .setTimestamp()

      let description = ""

      for (const ev of allEvents) {
        const emoji      = EVENT_EMOJIS[ev.category] || "🎉"
        const statusBadge = ev.status === "live" ? " 🔴 **جارية الآن**" : ""
        const ts         = Math.floor(ev.start_time / 1000)
        const attendees  = parseInt(ev.going_count || 0)
        const maxText    = ev.max_attendees ? `/${ev.max_attendees}` : ""

        description += `${emoji} **${ev.title}**${statusBadge}\n`
        description += `   🆔 #${ev.id} | 📅 <t:${ts}:f> | 👥 ${attendees}${maxText} حاضر\n\n`
      }

      embed.setDescription(description)
      embed.setFooter({ text: "استخدم /فعالية-عرض [رقم] للتفاصيل" })

      return interaction.editReply({ embeds: [embed] })

    } catch (err) {
      console.error("[EVENT-LIST ERROR]", err)
      const msg = "❌ حدث خطأ في عرض القائمة."
      if (interaction.deferred) return interaction.editReply({ content: msg })
      if (!interaction.replied) return interaction.reply({ content: msg, ephemeral: true })
    }
  }
}
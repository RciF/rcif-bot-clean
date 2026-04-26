const {
  SlashCommandBuilder,
  EmbedBuilder
} = require("discord.js")
const {
  ensureTables,
  getEvent,
  getGuildEvents,
  getAttendees,
  getEventStats,
  buildEventEmbed,
  buildEventButtons,
  EVENT_EMOJIS,
  EVENT_LABELS,
  EVENT_STATUS
} = require("./_eventShared")

// ══════════════════════════════════════
//  /فعالية-عرض  — عام للجميع
// ══════════════════════════════════════

const eventView = {
  data: new SlashCommandBuilder()
    .setName("فعالية-عرض")
    .setDescription("عرض تفاصيل فعالية محددة")
    .setDMPermission(false)
    .addIntegerOption(o =>
      o.setName("الرقم")
        .setDescription("رقم الفعالية")
        .setRequired(true)
        .setMinValue(1)
    ),

  helpMeta: {
    category: "events",
    aliases: ["event-view", "view-event", "فعالية-عرض"],
    description: "عرض تفاصيل فعالية محددة (الموعد، الحضور، الحالة)",
    options: [
      { name: "الرقم", description: "رقم الفعالية", required: true }
    ],
    requirements: {
      botRoleHierarchy: false,
      userPermissions: [],
      subscriptionTier: "gold"
    },
    cooldown: 0,
    relatedCommands: ["فعالية-قائمة", "فعالية-حضور", "فعالية-إنشاء"],
    examples: [
      "/فعالية-عرض الرقم:1",
      "/فعالية-عرض الرقم:25"
    ],
    notes: [
      "متاح للجميع (ليس للأدمن فقط)",
      "يعرض الـ embed الأصلي مع الأزرار للتسجيل",
      "يعرض عدد الحاضرين وعدد 'ربما'"
    ]
  },

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
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xef4444)
              .setDescription(`❌ ما فيه فعالية برقم **#${eventId}** في هذا السيرفر.`)
          ]
        })
      }

      const stats      = await getEventStats(eventId)
      const goingCount = parseInt(stats?.going_count || 0)
      const maybeCount = parseInt(stats?.maybe_count || 0)

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

const eventList = {
  data: new SlashCommandBuilder()
    .setName("فعالية-قائمة")
    .setDescription("عرض الفعاليات في السيرفر")
    .setDMPermission(false)
    .addStringOption(o =>
      o.setName("الحالة")
        .setDescription("فلترة الفعاليات حسب الحالة")
        .setRequired(false)
        .addChoices(
          { name: "⏳ القادمة",       value: "upcoming"  },
          { name: "🔴 الجارية الآن", value: "live"      },
          { name: "✅ المنتهية",      value: "ended"     },
          { name: "❌ الملغية",       value: "cancelled" }
        )
    ),

  helpMeta: {
    category: "events",
    aliases: ["event-list", "list-events", "فعالية-قائمة"],
    description: "عرض قائمة الفعاليات في السيرفر مع إمكانية الفلترة بالحالة",
    options: [
      { name: "الحالة", description: "فلترة (القادمة/الجارية/المنتهية/الملغية)", required: false }
    ],
    requirements: {
      botRoleHierarchy: false,
      userPermissions: [],
      subscriptionTier: "gold"
    },
    cooldown: 0,
    relatedCommands: ["فعالية-عرض", "فعالية-إنشاء"],
    examples: [
      "/فعالية-قائمة",
      "/فعالية-قائمة الحالة:⏳ القادمة",
      "/فعالية-قائمة الحالة:✅ المنتهية"
    ],
    notes: [
      "بدون فلتر: يعرض الجارية + القادمة معاً",
      "حد أقصى 15 فعالية في القائمة",
      "متاح للجميع"
    ]
  },

  async execute(interaction) {
    try {
      if (!interaction.guild) {
        return interaction.reply({ content: "❌ هذا الأمر داخل السيرفر فقط", ephemeral: true })
      }

      await ensureTables()
      await interaction.deferReply()

      const filter = interaction.options.getString("الحالة") || null

      let allEvents = []

      if (filter) {
        allEvents = await getGuildEvents(interaction.guild.id, filter, 15)
      } else {
        const live     = await getGuildEvents(interaction.guild.id, "live",     5)
        const upcoming = await getGuildEvents(interaction.guild.id, "upcoming", 10)
        allEvents = [...live, ...upcoming]
      }

      const statusTitle = filter ? EVENT_STATUS[filter] : "⏳ القادمة و 🔴 الجارية"

      if (allEvents.length === 0) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0x64748b)
              .setTitle("📅 لا توجد فعاليات")
              .setDescription(`ما فيه فعاليات في حالة **${statusTitle}** حالياً.`)
              .setTimestamp()
          ]
        })
      }

      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(`📅 الفعاليات — ${statusTitle}`)
        .setThumbnail(interaction.guild.iconURL({ dynamic: true, size: 128 }))
        .setTimestamp()

      let description = ""

      for (const ev of allEvents) {
        const emoji       = EVENT_EMOJIS[ev.category] || "🎉"
        const statusBadge = ev.status === "live" ? " 🔴 **جارية الآن**" : ""
        const ts          = Math.floor(ev.start_time / 1000)
        const going       = parseInt(ev.going_count || 0)
        const maxText     = ev.max_attendees ? `/${ev.max_attendees}` : ""
        const label       = EVENT_LABELS[ev.category] || "فعالية"

        description += `${emoji} **${ev.title}**${statusBadge}\n`
        description += `┣ 🆔 #${ev.id}  |  🏷️ ${label}  |  📅 <t:${ts}:f>\n`
        description += `┗ 👥 ${going}${maxText} حاضر\n\n`
      }

      embed.setDescription(description)
      embed.setFooter({ text: `${allEvents.length} فعالية | استخدم /فعالية-عرض [رقم] للتفاصيل` })

      return interaction.editReply({ embeds: [embed] })

    } catch (err) {
      console.error("[EVENT-LIST ERROR]", err)
      const msg = "❌ حدث خطأ في عرض القائمة."
      if (interaction.deferred) return interaction.editReply({ content: msg })
      if (!interaction.replied) return interaction.reply({ content: msg, ephemeral: true })
    }
  }
}

// ══════════════════════════════════════
//  EXPORTS — commandHandler يقرأ commands[]
// ══════════════════════════════════════

module.exports = {
  commands: [eventView.data, eventList.data],
  data: eventView.data,
  execute: eventView.execute,
  eventView,
  eventList
}
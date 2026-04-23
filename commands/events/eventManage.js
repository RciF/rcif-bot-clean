const { SlashCommandBuilder, EmbedBuilder } = require("discord.js")
const {
  ensureTables,
  canManageEvents,
  getEvent,
  getAttendees,
  updateEventStatus,
  buildEventEmbed,
  buildEventButtons
} = require("./_eventShared")

// ══════════════════════════════════════
//  /فعالية-إلغاء
// ══════════════════════════════════════

module.exports.eventCancel = {
  data: new SlashCommandBuilder()
    .setName("فعالية-إلغاء")
    .setDescription("إلغاء فعالية")
    .setDMPermission(false)
    .addIntegerOption(o =>
      o.setName("الرقم").setDescription("رقم الفعالية").setRequired(true).setMinValue(1)
    )
    .addStringOption(o =>
      o.setName("السبب").setDescription("سبب الإلغاء").setRequired(false)
    ),

  async execute(interaction) {
    try {
      if (!interaction.guild) {
        return interaction.reply({ content: "❌ هذا الأمر داخل السيرفر فقط", ephemeral: true })
      }

      await ensureTables()

      const allowed = await canManageEvents(interaction)
      if (!allowed) {
        return interaction.reply({ content: "❌ ما عندك صلاحية إلغاء الفعاليات.", ephemeral: true })
      }

      const eventId = interaction.options.getInteger("الرقم")
      const reason  = interaction.options.getString("السبب") || "لم يتم تحديد سبب"

      await interaction.deferReply({ ephemeral: true })

      const event = await getEvent(eventId)
      if (!event || event.guild_id !== interaction.guild.id) {
        return interaction.editReply({ content: "❌ فعالية غير موجودة." })
      }

      if (event.creator_id !== interaction.user.id && !await canManageEvents(interaction)) {
        return interaction.editReply({ content: "❌ فقط منشئ الفعالية أو المدير يقدر يلغيها." })
      }

      if (event.status === "ended" || event.status === "cancelled") {
        return interaction.editReply({ content: "❌ الفعالية منتهية أو ملغية بالفعل." })
      }

      await updateEventStatus(eventId, "cancelled")

      if (event.message_id && event.channel_id) {
        try {
          const channel = interaction.guild.channels.cache.get(event.channel_id)
          if (channel) {
            const msg = await channel.messages.fetch(event.message_id).catch(() => null)
            if (msg) {
              await msg.edit({
                embeds: [
                  new EmbedBuilder()
                    .setColor(0x64748b)
                    .setTitle(`❌ ${event.title} — ملغية`)
                    .setDescription(`**السبب:** ${reason}`)
                    .addFields({ name: "✏️ ألغاها", value: `${interaction.user}`, inline: true })
                    .setTimestamp()
                ],
                components: []
              })
            }
          }
        } catch {}
      }

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x64748b)
            .setTitle("✅ تم إلغاء الفعالية")
            .addFields(
              { name: "🎉 الفعالية", value: event.title, inline: true },
              { name: "📝 السبب",    value: reason,       inline: true }
            )
            .setTimestamp()
        ]
      })

    } catch (err) {
      console.error("[EVENT-CANCEL ERROR]", err)
      const msg = "❌ حدث خطأ في إلغاء الفعالية."
      if (interaction.deferred) return interaction.editReply({ content: msg })
      if (!interaction.replied) return interaction.reply({ content: msg, ephemeral: true })
    }
  }
}

// ══════════════════════════════════════
//  /فعالية-بدء
// ══════════════════════════════════════

module.exports.eventStart = {
  data: new SlashCommandBuilder()
    .setName("فعالية-بدء")
    .setDescription("تفعيل الفعالية — جارية الآن")
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
        return interaction.reply({ content: "❌ ما عندك صلاحية تفعيل الفعاليات.", ephemeral: true })
      }

      const eventId = interaction.options.getInteger("الرقم")
      await interaction.deferReply({ ephemeral: true })

      const event = await getEvent(eventId)
      if (!event || event.guild_id !== interaction.guild.id) {
        return interaction.editReply({ content: "❌ فعالية غير موجودة." })
      }

      if (event.status !== "upcoming") {
        return interaction.editReply({ content: "❌ الفعالية ليست في حالة قادمة." })
      }

      await updateEventStatus(eventId, "live")

      if (event.message_id && event.channel_id) {
        try {
          const channel = interaction.guild.channels.cache.get(event.channel_id)
          if (channel) {
            const msg = await channel.messages.fetch(event.message_id).catch(() => null)
            if (msg) {
              const attendees  = await getAttendees(eventId)
              const goingCount = attendees.filter(a => a.status === "going").length
              const maybeCount = attendees.filter(a => a.status === "maybe").length
              const liveEvent  = { ...event, status: "live" }

              await msg.edit({
                embeds: [await buildEventEmbed(liveEvent, interaction.guild, goingCount, maybeCount)],
                components: [buildEventButtons(eventId, "live")]
              })

              const going    = attendees.filter(a => a.status === "going")
              const mentions = going.slice(0, 10).map(a => `<@${a.user_id}>`).join(" ")

              if (mentions) {
                await channel.send({
                  content: `🔴 **الفعالية بدأت الآن!**\n${mentions}${going.length > 10 ? ` و${going.length - 10} آخرين` : ""}`,
                  allowedMentions: { users: going.slice(0, 10).map(a => a.user_id) }
                })
              }
            }
          }
        } catch {}
      }

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xef4444)
            .setTitle("🔴 الفعالية بدأت!")
            .setDescription(`تم تفعيل **${event.title}** — الفعالية جارية الآن`)
            .setTimestamp()
        ]
      })

    } catch (err) {
      console.error("[EVENT-START ERROR]", err)
      const msg = "❌ حدث خطأ في تفعيل الفعالية."
      if (interaction.deferred) return interaction.editReply({ content: msg })
      if (!interaction.replied) return interaction.reply({ content: msg, ephemeral: true })
    }
  }
}

// ══════════════════════════════════════
//  /فعالية-إنهاء
// ══════════════════════════════════════

module.exports.eventEnd = {
  data: new SlashCommandBuilder()
    .setName("فعالية-إنهاء")
    .setDescription("إنهاء فعالية جارية")
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
        return interaction.reply({ content: "❌ ما عندك صلاحية إنهاء الفعاليات.", ephemeral: true })
      }

      const eventId = interaction.options.getInteger("الرقم")
      await interaction.deferReply({ ephemeral: true })

      const event = await getEvent(eventId)
      if (!event || event.guild_id !== interaction.guild.id) {
        return interaction.editReply({ content: "❌ فعالية غير موجودة." })
      }

      await updateEventStatus(eventId, "ended")

      if (event.message_id && event.channel_id) {
        try {
          const channel = interaction.guild.channels.cache.get(event.channel_id)
          if (channel) {
            const msg = await channel.messages.fetch(event.message_id).catch(() => null)
            if (msg) {
              const attendees  = await getAttendees(eventId)
              const goingCount = attendees.filter(a => a.status === "going").length
              const maybeCount = attendees.filter(a => a.status === "maybe").length
              const endedEvent = { ...event, status: "ended" }

              await msg.edit({
                embeds: [await buildEventEmbed(endedEvent, interaction.guild, goingCount, maybeCount)],
                components: [buildEventButtons(eventId, "ended")]
              })

              await channel.send({
                embeds: [
                  new EmbedBuilder()
                    .setColor(0x22c55e)
                    .setTitle("✅ انتهت الفعالية")
                    .setDescription(`**${event.title}** اختتمت!\nشكراً لجميع المشاركين 🎉`)
                    .addFields({
                      name: "👥 إجمالي الحضور المسجل",
                      value: `${goingCount} شخص`,
                      inline: true
                    })
                    .setTimestamp()
                ]
              })
            }
          }
        } catch {}
      }

      return interaction.editReply({ content: "✅ تم إنهاء الفعالية بنجاح." })

    } catch (err) {
      console.error("[EVENT-END ERROR]", err)
      const msg = "❌ حدث خطأ في إنهاء الفعالية."
      if (interaction.deferred) return interaction.editReply({ content: msg })
      if (!interaction.replied) return interaction.reply({ content: msg, ephemeral: true })
    }
  }
}
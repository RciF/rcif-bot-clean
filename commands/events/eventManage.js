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
  updateEventStatus,
  buildEventEmbed,
  buildEventButtons,
  logEvent
} = require("./_eventShared")

// ══════════════════════════════════════
//  /فعالية-إلغاء
// ══════════════════════════════════════

const eventCancel = {
  data: new SlashCommandBuilder()
    .setName("فعالية-إلغاء")
    .setDescription("إلغاء فعالية قادمة أو جارية")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addIntegerOption(o =>
      o.setName("الرقم").setDescription("رقم الفعالية").setRequired(true).setMinValue(1)
    )
    .addStringOption(o =>
      o.setName("السبب").setDescription("سبب الإلغاء").setRequired(false).setMaxLength(200)
    ),

  async execute(interaction) {
    try {
      if (!interaction.guild) {
        return interaction.reply({ content: "❌ هذا الأمر داخل السيرفر فقط", ephemeral: true })
      }

      await ensureTables()

      const allowed = canManageEvents(interaction)
      if (!allowed) {
        return interaction.reply({ content: "❌ ما عندك صلاحية إلغاء الفعاليات.", ephemeral: true })
      }

      const eventId = interaction.options.getInteger("الرقم")
      const reason  = interaction.options.getString("السبب") || "لم يتم تحديد سبب"

      await interaction.deferReply({ ephemeral: true })

      const event = await getEvent(eventId)
      if (!event || event.guild_id !== interaction.guild.id) {
        return interaction.editReply({ content: `❌ ما فيه فعالية برقم #${eventId}.` })
      }

      if (event.status === "ended" || event.status === "cancelled") {
        return interaction.editReply({ content: "❌ الفعالية منتهية أو ملغية بالفعل." })
      }

      await updateEventStatus(eventId, "cancelled")

      // ── تحديث رسالة الفعالية ──
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
                    .addFields(
                      { name: "✏️ ألغاها",   value: `${interaction.user}`, inline: true },
                      { name: "🆔 الفعالية", value: `#${event.id}`,        inline: true }
                    )
                    .setTimestamp()
                ],
                components: []
              })
            }
          }
        } catch {}
      }

      await logEvent(interaction.guild, "cancelled", event, interaction.user)

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x64748b)
            .setTitle("✅ تم إلغاء الفعالية")
            .addFields(
              { name: "🎉 الفعالية", value: `${event.title} (#${event.id})`, inline: true },
              { name: "📝 السبب",    value: reason,                           inline: true }
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

const eventStart = {
  data: new SlashCommandBuilder()
    .setName("فعالية-بدء")
    .setDescription("تفعيل الفعالية — تصبح جارية الآن")
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
        return interaction.reply({ content: "❌ ما عندك صلاحية تفعيل الفعاليات.", ephemeral: true })
      }

      const eventId = interaction.options.getInteger("الرقم")
      await interaction.deferReply({ ephemeral: true })

      const event = await getEvent(eventId)
      if (!event || event.guild_id !== interaction.guild.id) {
        return interaction.editReply({ content: `❌ ما فيه فعالية برقم #${eventId}.` })
      }

      if (event.status !== "upcoming") {
        return interaction.editReply({ content: `❌ الفعالية حالتها الحالية: **${event.status}** — لا يمكن تفعيلها.` })
      }

      await updateEventStatus(eventId, "live")

      // ── تحديث رسالة الفعالية وتنبيه المسجلين ──
      if (event.message_id && event.channel_id) {
        try {
          const channel = interaction.guild.channels.cache.get(event.channel_id)
          if (channel) {
            const msg = await channel.messages.fetch(event.message_id).catch(() => null)
            if (msg) {
              const stats      = await getEventStats(eventId)
              const goingCount = parseInt(stats?.going_count || 0)
              const maybeCount = parseInt(stats?.maybe_count || 0)
              const liveEvent  = { ...event, status: "live" }

              await msg.edit({
                embeds: [await buildEventEmbed(liveEvent, interaction.guild, goingCount, maybeCount)],
                components: [buildEventButtons(eventId, "live")]
              })

              // تنبيه المسجلين
              const attendees = await getAttendees(eventId)
              const going     = attendees.filter(a => a.status === "going")
              const mentions  = going.slice(0, 10).map(a => `<@${a.user_id}>`).join(" ")

              if (mentions) {
                await channel.send({
                  content: `🔴 **الفعالية بدأت الآن!** ${mentions}${going.length > 10 ? ` و**${going.length - 10}** آخرين` : ""}`,
                  allowedMentions: { users: going.slice(0, 10).map(a => a.user_id) }
                })
              }
            }
          }
        } catch {}
      }

      await logEvent(interaction.guild, "started", event, interaction.user)

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xef4444)
            .setTitle("🔴 الفعالية بدأت!")
            .setDescription(`**${event.title}** (#${event.id}) — جارية الآن`)
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

const eventEnd = {
  data: new SlashCommandBuilder()
    .setName("فعالية-إنهاء")
    .setDescription("إنهاء فعالية جارية أو قادمة")
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
        return interaction.reply({ content: "❌ ما عندك صلاحية إنهاء الفعاليات.", ephemeral: true })
      }

      const eventId = interaction.options.getInteger("الرقم")
      await interaction.deferReply({ ephemeral: true })

      const event = await getEvent(eventId)
      if (!event || event.guild_id !== interaction.guild.id) {
        return interaction.editReply({ content: `❌ ما فيه فعالية برقم #${eventId}.` })
      }

      if (event.status === "ended" || event.status === "cancelled") {
        return interaction.editReply({ content: "❌ الفعالية منتهية أو ملغية بالفعل." })
      }

      await updateEventStatus(eventId, "ended")

      if (event.message_id && event.channel_id) {
        try {
          const channel = interaction.guild.channels.cache.get(event.channel_id)
          if (channel) {
            const msg = await channel.messages.fetch(event.message_id).catch(() => null)
            if (msg) {
              const stats      = await getEventStats(eventId)
              const goingCount = parseInt(stats?.going_count || 0)
              const maybeCount = parseInt(stats?.maybe_count || 0)
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
                    .setDescription(`**${event.title}** اختتمت! شكراً لجميع المشاركين 🎉`)
                    .addFields(
                      { name: "👥 إجمالي الحضور", value: `${goingCount} شخص`, inline: true },
                      { name: "🤔 ربما",           value: `${maybeCount} شخص`, inline: true }
                    )
                    .setTimestamp()
                ]
              })
            }
          }
        } catch {}
      }

      await logEvent(interaction.guild, "ended", event, interaction.user)

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x22c55e)
            .setTitle("✅ تم إنهاء الفعالية")
            .setDescription(`**${event.title}** (#${event.id}) — انتهت بنجاح`)
            .setTimestamp()
        ]
      })

    } catch (err) {
      console.error("[EVENT-END ERROR]", err)
      const msg = "❌ حدث خطأ في إنهاء الفعالية."
      if (interaction.deferred) return interaction.editReply({ content: msg })
      if (!interaction.replied) return interaction.reply({ content: msg, ephemeral: true })
    }
  }
}

// ══════════════════════════════════════
//  EXPORTS
// ══════════════════════════════════════

module.exports = {
  commands: [eventCancel.data, eventStart.data, eventEnd.data],
  data: eventCancel.data,
  execute: eventCancel.execute,
  eventCancel,
  eventStart,
  eventEnd
}
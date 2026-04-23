const { EmbedBuilder } = require("discord.js")
const {
  getEvent,
  getAttendees,
  getUserStatus,
  setAttendeeStatus,
  removeAttendee,
  buildEventEmbed,
  EVENT_COLORS
} = require("./_eventShared")

// ══════════════════════════════════════
//  BUTTON HANDLER
//  يُستدعى من events/interactionCreate.js
//  عند customId يبدأ بـ event_
// ══════════════════════════════════════

module.exports.handleEventButton = async function(interaction) {
  try {
    const [, action, eventIdStr] = interaction.customId.split("_")
    const eventId = parseInt(eventIdStr)

    if (!eventId || isNaN(eventId)) return

    const event = await getEvent(eventId)
    if (!event || event.guild_id !== interaction.guild.id) {
      return interaction.reply({ content: "❌ الفعالية غير موجودة.", ephemeral: true })
    }

    if (event.status === "ended" || event.status === "cancelled") {
      return interaction.reply({ content: "❌ هذه الفعالية منتهية أو ملغية.", ephemeral: true })
    }

    // ══════════════════════════════════════
    //  عرض قائمة الحضور
    // ══════════════════════════════════════
    if (action === "attendees") {
      const attendees = await getAttendees(eventId)
      const going     = attendees.filter(a => a.status === "going")
      const maybe     = attendees.filter(a => a.status === "maybe")

      const embed = new EmbedBuilder()
        .setColor(EVENT_COLORS[event.category] || 0x5865f2)
        .setTitle(`👥 حضور: ${event.title}`)

      if (going.length > 0) {
        embed.addFields({
          name: `✅ حاضر (${going.length})`,
          value: going.slice(0, 15).map((a, i) => `${i + 1}. <@${a.user_id}>`).join("\n") +
            (going.length > 15 ? `\n... +${going.length - 15}` : ""),
          inline: false
        })
      }

      if (maybe.length > 0) {
        embed.addFields({
          name: `🤔 ربما (${maybe.length})`,
          value: maybe.slice(0, 10).map((a, i) => `${i + 1}. <@${a.user_id}>`).join("\n"),
          inline: false
        })
      }

      if (going.length === 0 && maybe.length === 0) {
        embed.setDescription("لا يوجد مسجلون بعد.")
      }

      return interaction.reply({ embeds: [embed], ephemeral: true })
    }

    // ══════════════════════════════════════
    //  التسجيل / الإلغاء
    // ══════════════════════════════════════
    const userId        = interaction.user.id
    const currentStatus = await getUserStatus(eventId, userId)
    let replyText       = ""

    if (action === "going") {
      if (currentStatus?.status === "going") {
        await removeAttendee(eventId, userId)
        replyText = "❌ تم إلغاء تسجيلك كـ **حاضر**"
      } else {
        if (event.max_attendees) {
          const going = (await getAttendees(eventId)).filter(a => a.status === "going")
          if (going.length >= event.max_attendees) {
            return interaction.reply({
              content: "❌ وصلت الفعالية للحد الأقصى من المسجلين!",
              ephemeral: true
            })
          }
        }
        await setAttendeeStatus(eventId, userId, "going")
        replyText = "✅ تم تسجيلك كـ **حاضر** في الفعالية!"
      }

    } else if (action === "maybe") {
      if (currentStatus?.status === "maybe") {
        await removeAttendee(eventId, userId)
        replyText = "❌ تم إلغاء تسجيلك كـ **ربما**"
      } else {
        await setAttendeeStatus(eventId, userId, "maybe")
        replyText = "🤔 تم تسجيلك كـ **ربما** في الفعالية!"
      }

    } else if (action === "notgoing") {
      await removeAttendee(eventId, userId)
      replyText = "✅ تم تسجيل **غيابك** عن الفعالية"
    }

    // ── تحديث رسالة الفعالية ──
    if (event.message_id) {
      try {
        const channel = interaction.guild.channels.cache.get(event.channel_id)
        if (channel) {
          const msg = await channel.messages.fetch(event.message_id).catch(() => null)
          if (msg) {
            const attendees  = await getAttendees(eventId)
            const goingCount = attendees.filter(a => a.status === "going").length
            const maybeCount = attendees.filter(a => a.status === "maybe").length
            const updated    = await buildEventEmbed(event, interaction.guild, goingCount, maybeCount)
            await msg.edit({ embeds: [updated] })
          }
        }
      } catch {}
    }

    return interaction.reply({ content: replyText, ephemeral: true })

  } catch (err) {
    console.error("[EVENT-BUTTON ERROR]", err)
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: "❌ حدث خطأ", ephemeral: true }).catch(() => {})
    }
  }
}
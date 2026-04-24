const { EmbedBuilder } = require("discord.js")
const {
  getEvent,
  getAttendees,
  getEventStats,
  getUserStatus,
  setAttendeeStatus,
  removeAttendee,
  buildEventEmbed,
  EVENT_COLORS,
  EVENT_EMOJIS
} = require("./_eventShared")

// ══════════════════════════════════════
//  COOLDOWN — منع الضغط المتكرر
// ══════════════════════════════════════
const cooldowns = new Map()
const COOLDOWN_MS = 2000

function isOnCooldown(userId, eventId) {
  const key = `${userId}_${eventId}`
  const last = cooldowns.get(key)
  if (last && Date.now() - last < COOLDOWN_MS) return true
  cooldowns.set(key, Date.now())
  return false
}

// ══════════════════════════════════════
//  BUTTON HANDLER
//  يُستدعى من events/interactionCreate.js
//  عند customId يبدأ بـ event_
// ══════════════════════════════════════

module.exports.handleEventButton = async function(interaction) {
  try {
    const parts   = interaction.customId.split("_")
    const action  = parts[1]
    const eventId = parseInt(parts[2])

    if (!eventId || isNaN(eventId)) return

    // ── Cooldown ──
    if (isOnCooldown(interaction.user.id, eventId)) {
      return interaction.reply({
        content: "⏳ انتظر ثانيتين قبل الضغط مرة ثانية.",
        ephemeral: true
      })
    }

    const event = await getEvent(eventId)
    if (!event || event.guild_id !== interaction.guild.id) {
      return interaction.reply({ content: "❌ الفعالية غير موجودة.", ephemeral: true })
    }

    if (event.status === "ended" || event.status === "cancelled") {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x64748b)
            .setDescription(`❌ هذه الفعالية **${event.status === "ended" ? "منتهية" : "ملغية"}** — لا يمكن التسجيل فيها.`)
        ],
        ephemeral: true
      })
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
        .setTitle(`👥 ${EVENT_EMOJIS[event.category] || "🎉"} ${event.title}`)

      if (going.length > 0) {
        embed.addFields({
          name: `✅ حاضر (${going.length})`,
          value: going.slice(0, 15).map((a, i) => `\`${i + 1}\` <@${a.user_id}>`).join("\n") +
            (going.length > 15 ? `\n... و**${going.length - 15}** آخرين` : ""),
          inline: false
        })
      }

      if (maybe.length > 0) {
        embed.addFields({
          name: `🤔 ربما (${maybe.length})`,
          value: maybe.slice(0, 10).map((a, i) => `\`${i + 1}\` <@${a.user_id}>`).join("\n"),
          inline: false
        })
      }

      if (going.length === 0 && maybe.length === 0) {
        embed.setDescription("📭 لا يوجد مسجلون بعد — كن أول المسجلين!")
      }

      const total = going.length + maybe.length
      let footerText = `📊 إجمالي: ${total} مسجل`
      if (event.max_attendees) {
        footerText += ` | ${going.length}/${event.max_attendees} مكان`
      }
      embed.setFooter({ text: footerText })

      return interaction.reply({ embeds: [embed], ephemeral: true })
    }

    // ══════════════════════════════════════
    //  التسجيل / الإلغاء
    // ══════════════════════════════════════
    const userId        = interaction.user.id
    const currentStatus = await getUserStatus(eventId, userId)
    let   replyColor    = 0x22c55e
    let   replyText     = ""

    if (action === "going") {
      if (currentStatus?.status === "going") {
        await removeAttendee(eventId, userId)
        replyText  = "❌ تم إلغاء تسجيلك كـ **حاضر**"
        replyColor = 0xef4444
      } else {
        // التحقق من الحد الأقصى
        if (event.max_attendees) {
          const stats = await getEventStats(eventId)
          const going = parseInt(stats?.going_count || 0)
          if (going >= event.max_attendees) {
            return interaction.reply({
              embeds: [
                new EmbedBuilder()
                  .setColor(0xef4444)
                  .setDescription(`❌ وصلت الفعالية للحد الأقصى (**${event.max_attendees}** شخص)!`)
              ],
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
        replyText  = "❌ تم إلغاء تسجيلك كـ **ربما**"
        replyColor = 0xef4444
      } else {
        await setAttendeeStatus(eventId, userId, "maybe")
        replyText  = "🤔 تم تسجيلك كـ **ربما** في الفعالية!"
        replyColor = 0xf59e0b
      }

    } else if (action === "notgoing") {
      if (!currentStatus) {
        return interaction.reply({
          content: "ℹ️ أنت غير مسجل في هذه الفعالية أصلاً.",
          ephemeral: true
        })
      }
      await removeAttendee(eventId, userId)
      replyText  = "👋 تم تسجيل **غيابك** عن الفعالية"
      replyColor = 0x64748b
    }

    // ── تحديث رسالة الفعالية ──
    if (event.message_id && replyText) {
      try {
        const channel = interaction.guild.channels.cache.get(event.channel_id)
        if (channel) {
          const msg = await channel.messages.fetch(event.message_id).catch(() => null)
          if (msg) {
            const stats      = await getEventStats(eventId)
            const goingCount = parseInt(stats?.going_count || 0)
            const maybeCount = parseInt(stats?.maybe_count || 0)
            const updated    = await buildEventEmbed(event, interaction.guild, goingCount, maybeCount)
            await msg.edit({ embeds: [updated] })
          }
        }
      } catch {}
    }

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(replyColor)
          .setDescription(replyText)
      ],
      ephemeral: true
    })

  } catch (err) {
    console.error("[EVENT-BUTTON ERROR]", err)
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: "❌ حدث خطأ", ephemeral: true }).catch(() => {})
    }
  }
}
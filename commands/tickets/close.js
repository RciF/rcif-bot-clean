const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js")

const ticketSystem = require("../../systems/ticketSystem")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("اغلاق")
    .setDescription("إغلاق التذكرة الحالية")
    .setDMPermission(false)
    .addStringOption(option =>
      option
        .setName("السبب")
        .setDescription("سبب إغلاق التذكرة (اختياري)")
        .setRequired(false)
        .setMaxLength(300)
    ),

  async execute(interaction) {
    try {
      if (!interaction.guild) {
        return interaction.reply({ content: "❌ هذا الأمر داخل السيرفر فقط.", ephemeral: true })
      }

      // ✅ تحقق: هذه قناة تذكرة؟
      const ticket = await ticketSystem.getTicketByChannel(interaction.channel.id)

      if (!ticket) {
        return interaction.reply({
          content: "❌ هذه القناة ليست تذكرة.\nاستخدم هذا الأمر داخل قناة تذكرة فقط.",
          ephemeral: true
        })
      }

      // ✅ تحقق: التذكرة مفتوحة
      if (ticket.status === "closed") {
        return interaction.reply({ content: "❌ هذه التذكرة مغلقة بالفعل.", ephemeral: true })
      }

      // ✅ تحقق: الصلاحية — صاحب التذكرة أو فريق الدعم
      const staff = await ticketSystem.isStaff(interaction)
      if (ticket.user_id !== interaction.user.id && !staff) {
        return interaction.reply({
          content: "❌ فقط صاحب التذكرة أو فريق الدعم يقدر يغلقها.",
          ephemeral: true
        })
      }

      const reason = interaction.options.getString("السبب") || null

      // ── لو فيه سبب — إغلاق مباشر بدون تأكيد ──
      if (reason) {
        await interaction.deferReply()

        const settings = await ticketSystem.getSettings(interaction.guild.id)

        // حفظ المحادثة
        let transcriptData = { transcript: "", messageCount: 0 }
        if (settings?.transcript_enabled !== false) {
          transcriptData = await ticketSystem.generateTranscript(interaction.channel, ticket)
        }

        // تحديث الداتابيس
        await ticketSystem.updateTicket(interaction.channel.id, {
          status: "closed",
          closed_by: interaction.user.id,
          close_reason: reason,
          closed_at: new Date().toISOString(),
          message_count: transcriptData.messageCount
        })

        // حذف صلاحية الكتابة من صاحب التذكرة
        try {
          await interaction.channel.permissionOverwrites.edit(ticket.user_id, {
            SendMessages: false,
            ViewChannel: true
          })
        } catch {
          // العضو ممكن يكون طلع
        }

        // حساب المدة
        const duration = formatDuration(ticket.created_at, Date.now())

        // إرسال transcript لقناة اللوق
        if (settings?.log_channel_id && transcriptData.transcript) {
          const logChannel = interaction.guild.channels.cache.get(settings.log_channel_id)
          if (logChannel) {
            const buffer = Buffer.from(transcriptData.transcript, "utf-8")
            await logChannel.send({
              files: [{
                attachment: buffer,
                name: `transcript-${ticket.id}.txt`
              }]
            }).catch(() => {})
          }
        }

        // لوق
        await ticketSystem.sendLog(interaction.guild, ticket, "close", interaction.user, {
          reason,
          messageCount: transcriptData.messageCount,
          duration
        })

        // رسالة الإغلاق
        const closedEmbed = new EmbedBuilder()
          .setColor(0xef4444)
          .setTitle("🔒 تم إغلاق التذكرة")
          .addFields(
            { name: "🔒 أُغلقت بواسطة", value: `${interaction.user}`, inline: true },
            { name: "💬 عدد الرسائل", value: `${transcriptData.messageCount}`, inline: true },
            { name: "⏱️ مدة التذكرة", value: duration, inline: true },
            { name: "📝 السبب", value: reason, inline: false }
          )
          .setTimestamp()

        // أزرار ما بعد الإغلاق
        const afterCloseButtons = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("ticket_transcript")
            .setLabel("حفظ المحادثة")
            .setEmoji("📜")
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId("ticket_reopen")
            .setLabel("إعادة فتح")
            .setEmoji("🔓")
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId("ticket_delete")
            .setLabel("حذف التذكرة")
            .setEmoji("🗑️")
            .setStyle(ButtonStyle.Danger)
        )

        await interaction.editReply({
          embeds: [closedEmbed],
          components: [afterCloseButtons]
        })

        // تعديل اسم القناة
        await interaction.channel.setName(`مغلقة-${ticket.id}`).catch(() => {})

        return
      }

      // ── بدون سبب — طلب تأكيد ──
      const confirmEmbed = new EmbedBuilder()
        .setColor(0xef4444)
        .setTitle("⚠️ تأكيد إغلاق التذكرة")
        .setDescription(
          "هل أنت متأكد من إغلاق هذه التذكرة؟\n" +
          "سيتم حفظ المحادثة وإرسالها لقناة اللوق.\n\n" +
          "💡 **نصيحة:** استخدم `/اغلاق السبب:...` للإغلاق المباشر مع سبب."
        )

      const confirmButtons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("ticket_close_confirm")
          .setLabel("تأكيد الإغلاق")
          .setEmoji("✅")
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId("ticket_close_cancel")
          .setLabel("إلغاء")
          .setEmoji("❌")
          .setStyle(ButtonStyle.Secondary)
      )

      await interaction.reply({
        embeds: [confirmEmbed],
        components: [confirmButtons]
      })

    } catch (error) {
      console.error("[TICKET CLOSE ERROR]", error)

      if (interaction.replied || interaction.deferred) {
        return interaction.followUp({ content: "❌ حدث خطأ أثناء إغلاق التذكرة.", ephemeral: true }).catch(() => {})
      }
      return interaction.reply({ content: "❌ حدث خطأ أثناء إغلاق التذكرة.", ephemeral: true }).catch(() => {})
    }
  }
}

// ══════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════

function formatDuration(start, end) {
  const diff = (end || Date.now()) - new Date(start).getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days} يوم ${hours % 24} ساعة`
  if (hours > 0) return `${hours} ساعة ${minutes % 60} دقيقة`
  return `${minutes} دقيقة`
}
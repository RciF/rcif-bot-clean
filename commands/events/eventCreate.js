const {
  SlashCommandBuilder,
  EmbedBuilder,
  ChannelType,
  PermissionFlagsBits
} = require("discord.js")
const {
  ensureTables,
  canManageEvents,
  createEvent,
  updateEventMessage,
  buildEventEmbed,
  buildEventButtons,
  parseDateTime,
  formatTimeShort,
  logEvent,
  EVENT_COLORS,
  EVENT_EMOJIS
} = require("./_eventShared")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("فعالية-إنشاء")
    .setDescription("إنشاء فعالية جديدة في السيرفر")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption(o =>
      o.setName("العنوان")
        .setDescription("عنوان الفعالية")
        .setRequired(true)
        .setMaxLength(100)
    )
    .addStringOption(o =>
      o.setName("الموعد")
        .setDescription('موعد البداية — مثال: "غداً 8م" أو "الجمعة 9:30م" أو "2025-12-25 20:00"')
        .setRequired(true)
    )
    .addStringOption(o =>
      o.setName("النوع")
        .setDescription("نوع الفعالية")
        .setRequired(false)
        .addChoices(
          { name: "🎮 جيمينج",      value: "gaming"  },
          { name: "🔊 جلسة صوتية",  value: "voice"   },
          { name: "🎬 سهرة مشاهدة", value: "movie"   },
          { name: "🏆 مسابقة",      value: "contest" },
          { name: "📋 اجتماع",      value: "meeting" },
          { name: "🎉 أخرى",        value: "other"   }
        )
    )
    .addStringOption(o =>
      o.setName("الوصف")
        .setDescription("وصف الفعالية")
        .setRequired(false)
        .setMaxLength(500)
    )
    .addStringOption(o =>
      o.setName("المكان")
        .setDescription("مكان الفعالية (قناة صوتية أو رابط)")
        .setRequired(false)
    )
    .addIntegerOption(o =>
      o.setName("الحد_الأقصى")
        .setDescription("أقصى عدد مسجلين")
        .setRequired(false)
        .setMinValue(2)
        .setMaxValue(500)
    )
    .addStringOption(o =>
      o.setName("موعد_الانتهاء")
        .setDescription("موعد انتهاء الفعالية (اختياري)")
        .setRequired(false)
    )
    .addRoleOption(o =>
      o.setName("بينج")
        .setDescription("رتبة يتم تنبيهها عند نشر الفعالية")
        .setRequired(false)
    )
    .addChannelOption(o =>
      o.setName("القناة")
        .setDescription("قناة النشر (الافتراضي: القناة الحالية)")
        .setRequired(false)
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
    )
    .addStringOption(o =>
      o.setName("صورة")
        .setDescription("رابط صورة بانر للفعالية")
        .setRequired(false)
    ),

  async execute(interaction) {
    try {
      if (!interaction.guild) {
        return interaction.reply({ content: "❌ هذا الأمر داخل السيرفر فقط", ephemeral: true })
      }

      await ensureTables()

      const allowed = await canManageEvents(interaction)
      if (!allowed) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xef4444)
              .setDescription("❌ ما عندك صلاحية إنشاء فعاليات.\nتواصل مع الإدارة لإعطائك رتبة مدير الفعاليات.")
          ],
          ephemeral: true
        })
      }

      await interaction.deferReply()

      const title     = interaction.options.getString("العنوان")
      const timeInput = interaction.options.getString("الموعد")
      const category  = interaction.options.getString("النوع") || "other"
      const desc      = interaction.options.getString("الوصف")
      const location  = interaction.options.getString("المكان")
      const maxPeople = interaction.options.getInteger("الحد_الأقصى")
      const endInput  = interaction.options.getString("موعد_الانتهاء")
      const pingRole  = interaction.options.getRole("بينج")
      const channel   = interaction.options.getChannel("القناة") || interaction.channel
      const imageUrl  = interaction.options.getString("صورة")

      // ── التحقق من الموعد ──
      const startTime = parseDateTime(timeInput)
      if (!startTime) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xef4444)
              .setTitle("❌ موعد غير صحيح")
              .setDescription(`القيمة: \`${timeInput}\``)
              .addFields({
                name: "✅ أمثلة صحيحة",
                value: "• `غداً 8م`\n• `الجمعة 9:30م`\n• `2025-12-25 20:00`\n• `tomorrow 8pm`"
              })
          ]
        })
      }

      // ── التحقق من موعد الانتهاء ──
      let endTime = null
      if (endInput) {
        endTime = parseDateTime(endInput)
        if (!endTime || endTime <= startTime) {
          return interaction.editReply({
            content: "❌ موعد الانتهاء يجب أن يكون بعد موعد البداية."
          })
        }
      }

      // ── التحقق من صلاحيات البوت في القناة ──
      const botPerms = channel.permissionsFor(interaction.guild.members.me)
      if (!botPerms?.has(["SendMessages", "EmbedLinks"])) {
        return interaction.editReply({ content: `❌ البوت ما يقدر يرسل في ${channel}.` })
      }

      // ── التحقق من رابط الصورة ──
      if (imageUrl && !imageUrl.match(/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)/i)) {
        return interaction.editReply({ content: "❌ رابط الصورة غير صحيح — يجب أن ينتهي بـ jpg/png/gif/webp" })
      }

      // ── إنشاء الفعالية ──
      const event = await createEvent({
        guild_id: interaction.guild.id,
        channel_id: channel.id,
        creator_id: interaction.user.id,
        title, description: desc, category,
        start_time: startTime,
        end_time: endTime,
        max_attendees: maxPeople,
        image_url: imageUrl,
        location,
        ping_role_id: pingRole?.id || null
      })

      if (!event) {
        return interaction.editReply({ content: "❌ فشل في إنشاء الفعالية، حاول مرة ثانية." })
      }

      // ── نشر الفعالية ──
      const embed   = await buildEventEmbed(event, interaction.guild, 0, 0)
      const buttons = buildEventButtons(event.id)
      const content = pingRole ? `<@&${pingRole.id}> 🎉 فعالية جديدة!` : null

      const eventMsg = await channel.send({
        content,
        embeds: [embed],
        components: [buttons],
        allowedMentions: { roles: pingRole ? [pingRole.id] : [] }
      })

      await updateEventMessage(event.id, eventMsg.id)

      // ── تسجيل في اللوق ──
      await logEvent(interaction.guild, "created", event, interaction.user)

      // ── رد التأكيد ──
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(EVENT_COLORS[category] || 0x8b5cf6)
            .setTitle(`${EVENT_EMOJIS[category]} تم إنشاء الفعالية بنجاح! 🎉`)
            .addFields(
              { name: "🆔 رقم الفعالية", value: `**#${event.id}**`,               inline: true },
              { name: "📢 القناة",        value: `${channel}`,                     inline: true },
              { name: "📅 الموعد",        value: formatTimeShort(startTime),       inline: true },
              { name: "📌 الرابط",        value: `[انقر هنا](${eventMsg.url})`,    inline: true },
              { name: "🏷️ النوع",         value: `${EVENT_EMOJIS[category]} ${category}`, inline: true },
              { name: "👥 الحد الأقصى",   value: maxPeople ? `${maxPeople} شخص` : "غير محدد", inline: true }
            )
            .setFooter({ text: "يمكن للأعضاء التسجيل عبر الأزرار في رسالة الفعالية" })
            .setTimestamp()
        ]
      })

    } catch (err) {
      console.error("[EVENT-CREATE ERROR]", err)
      const msg = "❌ حدث خطأ في إنشاء الفعالية."
      if (interaction.deferred) return interaction.editReply({ content: msg })
      if (!interaction.replied) return interaction.reply({ content: msg, ephemeral: true })
    }
  }
}
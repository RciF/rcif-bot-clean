const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits
} = require("discord.js")
const databaseSystem = require("../../systems/databaseSystem")
const logger = require("../../systems/loggerSystem")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("reaction-role")
    .setDescription("نظام الرتب بالريأكشن")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)

    // ══ إعداد ══
    .addSubcommand(sub =>
      sub
        .setName("إعداد")
        .setDescription("ربط إيموجي برتبة على رسالة معينة")
        .addStringOption(o =>
          o.setName("message_id")
            .setDescription("ID الرسالة")
            .setRequired(true)
        )
        .addStringOption(o =>
          o.setName("إيموجي")
            .setDescription("الإيموجي (مثال: ✅ أو <:name:id>)")
            .setRequired(true)
        )
        .addRoleOption(o =>
          o.setName("الرتبة")
            .setDescription("الرتبة التي ستُعطى")
            .setRequired(true)
        )
        .addStringOption(o =>
          o.setName("الوضع")
            .setDescription("exclusive = رتبة وحدة من المجموعة، normal = عادي")
            .setRequired(false)
            .addChoices(
              { name: "🔄 عادي | Normal", value: "normal" },
              { name: "☝️ حصري | Exclusive", value: "exclusive" }
            )
        )
        .addChannelOption(o =>
          o.setName("القناة")
            .setDescription("القناة التي فيها الرسالة (الافتراضي: الحالية)")
            .setRequired(false)
        )
    )

    // ══ عرض ══
    .addSubcommand(sub =>
      sub
        .setName("عرض")
        .setDescription("عرض كل Reaction Roles في السيرفر")
    )

    // ══ حذف ══
    .addSubcommand(sub =>
      sub
        .setName("حذف")
        .setDescription("حذف ربط إيموجي من رسالة")
        .addStringOption(o =>
          o.setName("message_id")
            .setDescription("ID الرسالة")
            .setRequired(true)
        )
        .addStringOption(o =>
          o.setName("إيموجي")
            .setDescription("الإيموجي المراد حذفه")
            .setRequired(true)
        )
    )

    // ══ مسح الكل ══
    .addSubcommand(sub =>
      sub
        .setName("مسح")
        .setDescription("مسح كل Reaction Roles على رسالة معينة")
        .addStringOption(o =>
          o.setName("message_id")
            .setDescription("ID الرسالة")
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    try {
      if (!interaction.guild) {
        return interaction.reply({ content: "❌ هذا الأمر داخل السيرفر فقط", ephemeral: true })
      }

      const sub = interaction.options.getSubcommand()
      const guildId = interaction.guild.id

      // ══════════════════════════════════════
      //  إعداد
      // ══════════════════════════════════════
      if (sub === "إعداد") {
        const messageId = interaction.options.getString("message_id").trim()
        const emoji = interaction.options.getString("إيموجي").trim()
        const role = interaction.options.getRole("الرتبة")
        const mode = interaction.options.getString("الوضع") || "normal"
        const channel = interaction.options.getChannel("القناة") || interaction.channel

        await interaction.deferReply({ ephemeral: true })

        // ✅ تحقق: البوت يقدر يعطي الرتبة
        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) {
          return interaction.editReply({ content: "❌ البوت ما عنده صلاحية **إدارة الأدوار**" })
        }

        if (role.position >= interaction.guild.members.me.roles.highest.position) {
          return interaction.editReply({ content: "❌ رتبة البوت أقل من الرتبة المطلوبة. ارفع رتبة البوت أولاً." })
        }

        if (role.managed) {
          return interaction.editReply({ content: "❌ هذه رتبة مُدارة (بوت) ولا يمكن إعطاؤها." })
        }

        // ✅ تحقق: الرسالة موجودة
        let targetMessage
        try {
          targetMessage = await channel.messages.fetch(messageId)
        } catch {
          return interaction.editReply({ content: `❌ ما قدرت أجد الرسالة في ${channel}. تأكد من الـ ID والقناة.` })
        }

        // ✅ استخراج الإيموجي ID للتخزين
        const emojiKey = parseEmoji(emoji)
        if (!emojiKey) {
          return interaction.editReply({ content: "❌ الإيموجي غير صالح." })
        }

        // ✅ تحقق: ما فيه تكرار
        const existing = await databaseSystem.queryOne(
          "SELECT id FROM reaction_roles WHERE guild_id = $1 AND message_id = $2 AND emoji = $3",
          [guildId, messageId, emojiKey]
        )

        if (existing) {
          return interaction.editReply({ content: "⚠️ هذا الإيموجي مربوط برتبة بالفعل على هذه الرسالة." })
        }

        // ✅ تحقق: حد 20 ريأكشن رول على نفس الرسالة
        const count = await databaseSystem.queryOne(
          "SELECT COUNT(*) as cnt FROM reaction_roles WHERE guild_id = $1 AND message_id = $2",
          [guildId, messageId]
        )
        if (parseInt(count?.cnt || 0) >= 20) {
          return interaction.editReply({ content: "❌ الحد الأقصى 20 ريأكشن رول لكل رسالة." })
        }

        // ✅ حفظ في قاعدة البيانات
        await databaseSystem.query(
          `INSERT INTO reaction_roles (guild_id, channel_id, message_id, emoji, role_id, mode)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [guildId, channel.id, messageId, emojiKey, role.id, mode]
        )

        // ✅ إضافة الريأكشن على الرسالة
        try {
          await targetMessage.react(emoji)
        } catch {
          return interaction.editReply({
            content: "✅ تم الحفظ، لكن ما قدرت أضيف الريأكشن تلقائياً. أضفه يدوياً على الرسالة."
          })
        }

        const embed = new EmbedBuilder()
          .setColor(0x22c55e)
          .setTitle("✅ تم إعداد Reaction Role")
          .addFields(
            { name: "📌 الرسالة", value: `[اضغط هنا](${targetMessage.url})`, inline: true },
            { name: "😀 الإيموجي", value: emoji, inline: true },
            { name: "🏷️ الرتبة", value: `${role}`, inline: true },
            { name: "⚙️ الوضع", value: mode === "exclusive" ? "☝️ حصري" : "🔄 عادي", inline: true },
            { name: "📡 القناة", value: `${channel}`, inline: true }
          )
          .setTimestamp()

        return interaction.editReply({ embeds: [embed] })
      }

      // ══════════════════════════════════════
      //  عرض
      // ══════════════════════════════════════
      if (sub === "عرض") {
        await interaction.deferReply({ ephemeral: true })

        const rows = await databaseSystem.queryMany(
          "SELECT * FROM reaction_roles WHERE guild_id = $1 ORDER BY message_id",
          [guildId]
        )

        if (!rows.length) {
          return interaction.editReply({ content: "📭 ما فيه Reaction Roles في هذا السيرفر." })
        }

        // تجميع حسب الرسالة
        const grouped = {}
        for (const row of rows) {
          if (!grouped[row.message_id]) grouped[row.message_id] = []
          grouped[row.message_id].push(row)
        }

        const embed = new EmbedBuilder()
          .setColor(0x3b82f6)
          .setTitle("🎭 Reaction Roles")
          .setDescription(`إجمالي: **${rows.length}** ربط على **${Object.keys(grouped).length}** رسالة`)
          .setTimestamp()

        for (const [msgId, items] of Object.entries(grouped)) {
          const channel = interaction.guild.channels.cache.get(items[0].channel_id)
          const channelText = channel ? `${channel}` : `ID: ${items[0].channel_id}`

          let text = ""
          for (const item of items) {
            const role = interaction.guild.roles.cache.get(item.role_id)
            const roleText = role ? `${role}` : `ID: ${item.role_id}`
            const modeIcon = item.mode === "exclusive" ? "☝️" : "🔄"
            text += `${item.emoji} → ${roleText} ${modeIcon}\n`
          }

          embed.addFields({
            name: `📌 ${channelText} — \`${msgId}\``,
            value: text,
            inline: false
          })
        }

        return interaction.editReply({ embeds: [embed] })
      }

      // ══════════════════════════════════════
      //  حذف
      // ══════════════════════════════════════
      if (sub === "حذف") {
        const messageId = interaction.options.getString("message_id").trim()
        const emoji = interaction.options.getString("إيموجي").trim()

        await interaction.deferReply({ ephemeral: true })

        const emojiKey = parseEmoji(emoji)

        const deleted = await databaseSystem.query(
          "DELETE FROM reaction_roles WHERE guild_id = $1 AND message_id = $2 AND emoji = $3 RETURNING *",
          [guildId, messageId, emojiKey]
        )

        if (!deleted.rows.length) {
          return interaction.editReply({ content: "❌ ما وجدت هذا الربط." })
        }

        // ✅ إزالة الريأكشن من الرسالة
        try {
          const channelId = deleted.rows[0].channel_id
          const channel = interaction.guild.channels.cache.get(channelId)
          if (channel) {
            const msg = await channel.messages.fetch(messageId).catch(() => null)
            if (msg) {
              const botReaction = msg.reactions.cache.find(r => parseEmoji(r.emoji.toString()) === emojiKey)
              if (botReaction) await botReaction.users.remove(interaction.client.user.id).catch(() => {})
            }
          }
        } catch {}

        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xef4444)
              .setTitle("🗑️ تم حذف Reaction Role")
              .addFields(
                { name: "📌 الرسالة", value: `\`${messageId}\``, inline: true },
                { name: "😀 الإيموجي", value: emoji, inline: true }
              )
              .setTimestamp()
          ]
        })
      }

      // ══════════════════════════════════════
      //  مسح الكل
      // ══════════════════════════════════════
      if (sub === "مسح") {
        const messageId = interaction.options.getString("message_id").trim()

        await interaction.deferReply({ ephemeral: true })

        const deleted = await databaseSystem.query(
          "DELETE FROM reaction_roles WHERE guild_id = $1 AND message_id = $2 RETURNING *",
          [guildId, messageId]
        )

        if (!deleted.rows.length) {
          return interaction.editReply({ content: "❌ ما وجدت أي Reaction Roles على هذه الرسالة." })
        }

        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xf59e0b)
              .setTitle("🧹 تم مسح Reaction Roles")
              .setDescription(`تم مسح **${deleted.rows.length}** ربط من الرسالة \`${messageId}\``)
              .setTimestamp()
          ]
        })
      }

    } catch (error) {
      logger.error("REACTION_ROLE_COMMAND_ERROR", { error: error.message })

      if (interaction.deferred) {
        return interaction.editReply({ content: "❌ حدث خطأ في نظام Reaction Roles." })
      }
      return interaction.reply({ content: "❌ حدث خطأ في نظام Reaction Roles.", ephemeral: true })
    }
  }
}

// ══════════════════════════════════════
//  Helper: استخراج مفتاح الإيموجي للتخزين
// ══════════════════════════════════════
function parseEmoji(emoji) {
  if (!emoji) return null

  // Custom emoji: <:name:id> أو <a:name:id>
  const customMatch = emoji.match(/<a?:(\w+):(\d+)>/)
  if (customMatch) return customMatch[2] // نخزن الـ ID

  // Unicode emoji
  const trimmed = emoji.trim()
  if (trimmed.length > 0) return trimmed

  return null
}
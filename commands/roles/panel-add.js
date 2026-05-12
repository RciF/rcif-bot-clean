const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  MessageFlags
} = require("discord.js")
const commandGuardSystem = require("../../systems/commandGuardSystem")
const databaseSystem     = require("../../systems/databaseSystem")
const {
  ensureTable,
  getPanel,
  getPanelButtons,
  buildPanelMessage,
  parseButtons,
  sanitizeButtonEmoji,
  COLOR_CHOICES_NO_GOLD
} = require("./_button-role-shared")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("لوحة-رتب-إضافة")
    .setDescription("إضافة زر رتبة للوحة موجودة")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addStringOption(o => o.setName("معرف_الرسالة").setDescription("ID الرسالة").setRequired(true))
    .addRoleOption(o => o.setName("الرتبة").setDescription("الرتبة").setRequired(true))
    .addStringOption(o => o.setName("النص").setDescription("نص الزر").setRequired(true))
    .addStringOption(o => o.setName("الإيموجي").setDescription("إيموجي الزر").setRequired(false))
    .addStringOption(o => o
      .setName("اللون").setDescription("لون الزر").setRequired(false)
      .addChoices(...COLOR_CHOICES_NO_GOLD)
    ),

  helpMeta: {
    category: "roles",
    description: "إضافة زر رتبة لوحة موجودة (حد أقصى 25 زر لكل لوحة)",
    examples: [
      "/لوحة-رتب-إضافة معرف_الرسالة:1234567890 الرتبة:@Gamer النص:🎮 لاعب",
      "/لوحة-رتب-إضافة معرف_الرسالة:1234567890 الرتبة:@Anime النص:🌸 أنمي اللون:🟣 بنفسجي"
    ],
    notes: [
      "الإيموجي يقدر يكون عادي أو من السيرفر",
      "يدعم لوحات البوت ولوحات الداش",
      "5 ألوان أزرار: أخضر، أحمر، أزرق، رمادي"
    ],
    requirements: {
      botRoleHierarchy: true,
      userPermissions: ["ManageRoles"],
      subscriptionTier: "silver"
    },
    cooldown: 0,
    relatedCommands: ["لوحة-رتب-إنشاء", "لوحة-رتب-حذف-زر"]
  },

  async execute(interaction) {
    // ✅ Defer أول شي — قبل أي شي ممكن يفشل
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral })
    } catch (e) {
      // الـ interaction انتهى أو تم ack مسبقاً — ما نقدر نكمل
      console.error("[BUTTON-ROLE-ADD] defer failed:", e.message)
      return
    }

    try {
      if (!interaction.guild) {
        return interaction.editReply({ content: "❌ هذا الأمر داخل السيرفر فقط" })
      }

      const isAdmin = commandGuardSystem.requireAdmin(interaction)
      if (!isAdmin) {
        return interaction.editReply({ content: "❌ هذا الأمر للإدارة فقط" })
      }

      await ensureTable()

      const messageId = interaction.options.getString("معرف_الرسالة").trim()
      const role      = interaction.options.getRole("الرتبة")
      const label     = interaction.options.getString("النص")
      const emojiRaw  = interaction.options.getString("الإيموجي")
      const color     = interaction.options.getString("اللون") || "أزرق"

      let safeEmoji = null
      if (emojiRaw) {
        safeEmoji = sanitizeButtonEmoji(emojiRaw)
        if (!safeEmoji) {
          return interaction.editReply({
            content: "❌ الإيموجي غير صالح. استخدم Unicode emoji أو إيموجي مخصص من السيرفر."
          })
        }
      }

      const panel = await getPanel(messageId)
      if (!panel || panel.guild_id !== interaction.guild.id) {
        return interaction.editReply({
          content: "❌ ما لقيت هذه اللوحة في السيرفر.\n💡 تأكد إنك ناسخ ID الرسالة الصحيح، وإن اللوحة في نفس السيرفر."
        })
      }

      // ✅ تحقق التكرار — يفحص كلا المصدرين (legacy + jsonb)
      const allButtons = await getPanelButtons(messageId)
      const duplicate  = allButtons.find(b => b.role_id === role.id)
      if (duplicate) {
        return interaction.editReply({ content: `❌ رتبة ${role} مضافة بالفعل في هذه اللوحة.` })
      }

      if (allButtons.length >= 25) {
        return interaction.editReply({ content: "❌ وصلت الحد الأقصى (25 زر)." })
      }

      const botMember = interaction.guild.members.me
      if (botMember && role.position >= botMember.roles.highest.position) {
        return interaction.editReply({
          content: "❌ رتبة البوت أقل من هذه الرتبة، ارفع رتبة البوت أولاً."
        })
      }

      if (role.managed) {
        return interaction.editReply({
          content: "❌ هذه الرتبة مُدارة من تكامل خارجي ولا يمكن إعطاؤها يدوياً."
        })
      }

      // ✅ نضيف الزر في الجدول legacy (button_roles)
      //    حتى لو اللوحة أصلها من الداش (JSONB)، نكمل الـ bridge
      const insertResult = await databaseSystem.query(`
        INSERT INTO button_roles (guild_id, channel_id, message_id, role_id, label, emoji, color)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        RETURNING id
      `, [
        interaction.guild.id,
        panel.channel_id,
        messageId,
        role.id,
        label,
        safeEmoji,
        color
      ])
      const insertedId = insertResult.rows?.[0]?.id

      // ✅ حدّث الرسالة في القناة — مع rollback لو فشل
      const newButtons = await getPanelButtons(messageId)
      const channel    = interaction.guild.channels.cache.get(panel.channel_id)
      let editFailed = false
      let editError  = null

      if (channel) {
        try {
          const msg     = await channel.messages.fetch(messageId)
          const updated = await buildPanelMessage(panel, newButtons)
          await msg.edit(updated)
        } catch (editErr) {
          editFailed = true
          editError  = editErr
          console.error("[BUTTON-ROLE-ADD] message edit failed:", editErr.message)
        }
      }

      // ✅ Rollback: لو فشل تحديث الرسالة، احذف الزر من DB عشان ما يصير تناقض
      if (editFailed && insertedId) {
        try {
          await databaseSystem.query(
            "DELETE FROM button_roles WHERE id = $1",
            [insertedId]
          )
        } catch {}

        return interaction.editReply({
          content: "❌ فشل تحديث رسالة اللوحة. تم التراجع عن إضافة الزر."
        })
      }

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x22c55e)
            .setTitle("✅ تم إضافة الزر")
            .addFields(
              { name: "🏷️ الرتبة", value: `${role}`, inline: true },
              { name: "📝 النص",   value: label,     inline: true },
              { name: "🎨 اللون",  value: color,     inline: true }
            )
        ]
      })

    } catch (err) {
      console.error("[BUTTON-ROLE-ADD ERROR]", err)
      try {
        return await interaction.editReply({ content: "❌ حدث خطأ أثناء إضافة الزر." })
      } catch {}
    }
  }
}
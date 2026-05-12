const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js")
const commandGuardSystem = require("../../systems/commandGuardSystem")
const databaseSystem     = require("../../systems/databaseSystem")
const {
  ensureTable,
  getPanel,
  getPanelButtons,
  buildPanelMessage,
  isValidHttpUrl,
  COLOR_CHOICES
} = require("./_button-role-shared")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("لوحة-رتب-تعديل")
    .setDescription("تعديل لوحة رتب موجودة")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addStringOption(o => o.setName("معرف_الرسالة").setDescription("ID الرسالة").setRequired(true))
    .addStringOption(o => o.setName("العنوان").setDescription("عنوان جديد").setRequired(false))
    .addStringOption(o => o.setName("الوصف").setDescription("وصف جديد").setRequired(false))
    .addStringOption(o => o
      .setName("اللون").setDescription("لون جديد").setRequired(false)
      .addChoices(...COLOR_CHOICES)
    )
    .addStringOption(o => o.setName("صورة").setDescription("رابط صورة جديدة (http/https) — اكتب 'إزالة' للحذف").setRequired(false))
    .addStringOption(o => o.setName("ثمبنيل").setDescription("رابط ثمبنيل جديد (http/https) — اكتب 'إزالة' للحذف").setRequired(false))
    .addBooleanOption(o => o.setName("حصري").setDescription("تغيير وضع الحصري").setRequired(false)),

  helpMeta: {
    category: "roles",
    description: "تعديل لوحة رتب موجودة (العنوان، المحتوى، اللون)",
    examples: [
      "/لوحة-رتب-تعديل معرف_الرسالة:1234567890 العنوان:عنوان جديد",
      "/لوحة-رتب-تعديل معرف_الرسالة:1234567890 اللون:أحمر حصري:✅ مفعّل",
      "/لوحة-رتب-تعديل معرف_الرسالة:1234567890 صورة:إزالة"
    ],
    notes: [
      "أي خيار تتركه فاضي يبقى على إعداده الحالي",
      "اللوحة تتحدّث في القناة فوراً بعد التعديل",
      "اكتب `إزالة` في خانة الصورة أو الثمبنيل لمسحها"
    ],
    requirements: {
      botRoleHierarchy: true,
      userPermissions: ["ManageRoles"],
      subscriptionTier: "silver"
    },
    cooldown: 0,
    relatedCommands: ["لوحة-رتب-إنشاء", "لوحة-رتب-قائمة"]
  },

  async execute(interaction) {
    try {
      if (!interaction.guild) {
        return interaction.reply({ content: "❌ هذا الأمر داخل السيرفر فقط", ephemeral: true })
      }

      const isAdmin = commandGuardSystem.requireAdmin(interaction)
      if (!isAdmin) {
        return interaction.reply({ content: "❌ هذا الأمر للإدارة فقط", ephemeral: true })
      }

      const messageId = interaction.options.getString("معرف_الرسالة").trim()
      const title     = interaction.options.getString("العنوان")
      const desc      = interaction.options.getString("الوصف")
      const color     = interaction.options.getString("اللون")
      const imageRaw  = interaction.options.getString("صورة")
      const thumbRaw  = interaction.options.getString("ثمبنيل")
      const exclusive = interaction.options.getBoolean("حصري")

      // ✅ تحقق مبكر من الروابط — قبل deferReply
      // (نقبل "إزالة" كقيمة خاصة لمسح الحقل)
      if (imageRaw && imageRaw.trim() !== "إزالة" && !isValidHttpUrl(imageRaw)) {
        return interaction.reply({
          content: "❌ خيار `صورة` لازم يكون رابط يبدأ بـ `http://` أو `https://` أو اكتب `إزالة` للحذف",
          ephemeral: true
        })
      }
      if (thumbRaw && thumbRaw.trim() !== "إزالة" && !isValidHttpUrl(thumbRaw)) {
        return interaction.reply({
          content: "❌ خيار `ثمبنيل` لازم يكون رابط يبدأ بـ `http://` أو `https://` أو اكتب `إزالة` للحذف",
          ephemeral: true
        })
      }

      await ensureTable()
      await interaction.deferReply({ ephemeral: true })

      const panel = await getPanel(messageId)
      if (!panel || panel.guild_id !== interaction.guild.id) {
        return interaction.editReply({ content: "❌ ما لقيت هذه اللوحة." })
      }

      const updates = {}
      if (title !== null)     updates.title       = title
      if (desc !== null)      updates.description = desc
      if (color !== null)     updates.color       = color

      if (imageRaw !== null) {
        updates.image_url = imageRaw.trim() === "إزالة" ? null : imageRaw.trim()
      }
      if (thumbRaw !== null) {
        updates.thumbnail = thumbRaw.trim() === "إزالة" ? null : thumbRaw.trim()
      }
      if (exclusive !== null) updates.exclusive = exclusive

      if (!Object.keys(updates).length) {
        return interaction.editReply({ content: "⚠️ ما حددت أي تعديل." })
      }

      const sets = Object.keys(updates).map((k, i) => `${k} = $${i + 2}`).join(", ")
      await databaseSystem.query(
        `UPDATE button_role_panels SET ${sets} WHERE message_id = $1`,
        [messageId, ...Object.values(updates)]
      )

      const updatedPanel = await getPanel(messageId)
      const buttons      = await getPanelButtons(messageId)
      const channel      = interaction.guild.channels.cache.get(panel.channel_id)
      if (channel) {
        try {
          const msg     = await channel.messages.fetch(messageId)
          const updated = await buildPanelMessage(updatedPanel, buttons)
          await msg.edit(updated)
        } catch {}
      }

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x3b82f6)
            .setTitle("✏️ تم تعديل اللوحة")
            .setDescription("تم تحديث اللوحة بنجاح.")
        ]
      })

    } catch (err) {
      console.error("[BUTTON-ROLE-EDIT ERROR]", err)
      const msg = "❌ حدث خطأ أثناء تعديل اللوحة."
      if (interaction.deferred) return interaction.editReply({ content: msg })
      if (!interaction.replied) return interaction.reply({ content: msg, ephemeral: true })
    }
  }
}
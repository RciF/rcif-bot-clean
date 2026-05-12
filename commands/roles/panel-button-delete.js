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
  parseButtons
} = require("./_button-role-shared")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("لوحة-رتب-حذف-زر")
    .setDescription("حذف زر رتبة من لوحة موجودة")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addStringOption(o => o.setName("معرف_الرسالة").setDescription("ID الرسالة").setRequired(true))
    .addRoleOption(o => o.setName("الرتبة").setDescription("الرتبة اللي تبي تحذفها").setRequired(true)),

  helpMeta: {
    category: "roles",
    description: "حذف زر رتبة معين من لوحة (الزر فقط، اللوحة تبقى)",
    examples: [
      "/لوحة-رتب-حذف-زر معرف_الرسالة:1234567890 الرتبة:@Gamer"
    ],
    notes: [
      "اللوحة تتحدّث فوراً بعد حذف الزر",
      "يدعم لوحات البوت ولوحات الداش"
    ],
    requirements: {
      botRoleHierarchy: true,
      userPermissions: ["ManageRoles"],
      subscriptionTier: "silver"
    },
    cooldown: 0,
    relatedCommands: ["لوحة-رتب-إضافة", "لوحة-رتب-قائمة"]
  },

  async execute(interaction) {
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral })
    } catch (e) {
      console.error("[BUTTON-ROLE-REMOVE] defer failed:", e.message)
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

      const panel = await getPanel(messageId)
      if (!panel || panel.guild_id !== interaction.guild.id) {
        return interaction.editReply({ content: "❌ ما لقيت هذه اللوحة." })
      }

      let foundInLegacy = false
      let foundInJsonb  = false

      // 1) احذف من button_roles (legacy)
      try {
        const deleted = await databaseSystem.query(
          "DELETE FROM button_roles WHERE message_id = $1 AND role_id = $2 RETURNING id",
          [messageId, role.id]
        )
        if (deleted.rows.length > 0) foundInLegacy = true
      } catch {}

      // 2) احذف من button_role_panels.buttons (JSONB من الداش)
      try {
        const arr = parseButtons(panel.buttons)
        const filtered = arr.filter(b => b && b.role_id !== role.id)
        if (filtered.length !== arr.length) {
          foundInJsonb = true
          await databaseSystem.query(
            "UPDATE button_role_panels SET buttons = $1::jsonb WHERE message_id = $2",
            [JSON.stringify(filtered), messageId]
          )
        }
      } catch {}

      if (!foundInLegacy && !foundInJsonb) {
        return interaction.editReply({
          content: `❌ رتبة ${role} غير موجودة في هذه اللوحة.`
        })
      }

      // ✅ حدّث رسالة اللوحة
      const updatedPanel = await getPanel(messageId)
      const newButtons   = await getPanelButtons(messageId)
      const channel      = interaction.guild.channels.cache.get(panel.channel_id)
      if (channel) {
        try {
          const msg     = await channel.messages.fetch(messageId)
          const updated = await buildPanelMessage(updatedPanel || panel, newButtons)
          await msg.edit(updated)
        } catch (editErr) {
          console.error("[BUTTON-ROLE-REMOVE] message edit failed:", editErr.message)
        }
      }

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xef4444)
            .setTitle("🗑️ تم حذف الزر")
            .setDescription(`تم حذف زر رتبة ${role} من اللوحة.`)
        ]
      })

    } catch (err) {
      console.error("[BUTTON-ROLE-REMOVE ERROR]", err)
      try {
        return await interaction.editReply({ content: "❌ حدث خطأ أثناء حذف الزر." })
      } catch {}
    }
  }
}
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js")
const commandGuardSystem = require("../../systems/commandGuardSystem")
const databaseSystem     = require("../../systems/databaseSystem")
const {
  ensureTable,
  getPanel,
  getPanelButtons,
  buildPanelMessage
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
      "الرتبة نفسها ما تتأثر — يحذف الزر فقط من اللوحة"
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
      if (!interaction.guild) {
        return interaction.reply({ content: "❌ هذا الأمر داخل السيرفر فقط", ephemeral: true })
      }

      const isAdmin = commandGuardSystem.requireAdmin(interaction)
      if (!isAdmin) {
        return interaction.reply({ content: "❌ هذا الأمر للإدارة فقط", ephemeral: true })
      }

      await ensureTable()

      const messageId = interaction.options.getString("معرف_الرسالة").trim()
      const role      = interaction.options.getRole("الرتبة")

      await interaction.deferReply({ ephemeral: true })

      const panel = await getPanel(messageId)
      if (!panel || panel.guild_id !== interaction.guild.id) {
        return interaction.editReply({ content: "❌ ما لقيت هذه اللوحة." })
      }

      const deleted = await databaseSystem.query(
        "DELETE FROM button_roles WHERE message_id = $1 AND role_id = $2 RETURNING id",
        [messageId, role.id]
      )

      if (!deleted.rows.length) {
        return interaction.editReply({ content: `❌ رتبة ${role} غير موجودة في هذه اللوحة.` })
      }

      const newButtons = await getPanelButtons(messageId)
      const channel = interaction.guild.channels.cache.get(panel.channel_id)
      if (channel) {
        try {
          const msg     = await channel.messages.fetch(messageId)
          const updated = await buildPanelMessage(panel, newButtons)
          await msg.edit(updated)
        } catch {}
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
      const msg = "❌ حدث خطأ أثناء حذف الزر."
      if (interaction.deferred) return interaction.editReply({ content: msg })
      if (!interaction.replied) return interaction.reply({ content: msg, ephemeral: true })
    }
  }
}
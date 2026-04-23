const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js")
const commandGuardSystem = require("../../systems/commandGuardSystem")
const databaseSystem     = require("../../systems/databaseSystem")
const {
  ensureTable,
  getPanel
} = require("./_button-role-shared")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("لوحة-رتب-مسح")
    .setDescription("حذف لوحة رتب بالكامل مع كل أزرارها")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addStringOption(o => o.setName("معرف_الرسالة").setDescription("ID الرسالة").setRequired(true)),

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

      await interaction.deferReply({ ephemeral: true })

      const panel = await getPanel(messageId)
      if (!panel || panel.guild_id !== interaction.guild.id) {
        return interaction.editReply({ content: "❌ ما لقيت هذه اللوحة." })
      }

      await databaseSystem.query("DELETE FROM button_roles WHERE message_id = $1", [messageId])
      await databaseSystem.query("DELETE FROM button_role_panels WHERE message_id = $1", [messageId])

      const channel = interaction.guild.channels.cache.get(panel.channel_id)
      if (channel) {
        try {
          const msg = await channel.messages.fetch(messageId)
          await msg.delete()
        } catch {}
      }

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xef4444)
            .setTitle("🗑️ تم حذف اللوحة")
            .setDescription(`تم حذف لوحة **"${panel.title}"** بالكامل.`)
        ]
      })

    } catch (err) {
      console.error("[BUTTON-ROLE-DELETE ERROR]", err)
      const msg = "❌ حدث خطأ أثناء حذف اللوحة."
      if (interaction.deferred) return interaction.editReply({ content: msg })
      if (!interaction.replied) return interaction.reply({ content: msg, ephemeral: true })
    }
  }
}
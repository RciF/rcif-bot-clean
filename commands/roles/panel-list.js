const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js")
const commandGuardSystem = require("../../systems/commandGuardSystem")
const {
  ensureTable,
  getAllPanels,
  getPanelButtons
} = require("./_button-role-shared")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("لوحة-رتب-قائمة")
    .setDescription("عرض كل لوحات الرتب في السيرفر")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  helpMeta: {
    category: "roles",
    description: "عرض كل لوحات الرتب الموجودة في السيرفر",
    examples: ["/لوحة-رتب-قائمة"],
    notes: [
      "يعرض: العنوان، ID الرسالة، القناة، عدد الأزرار، وضع الحصري",
      "يعرض أول 10 لوحات فقط لو عندك أكثر"
    ],
    requirements: {
      botRoleHierarchy: false,
      userPermissions: ["ManageRoles"],
      subscriptionTier: "silver"
    },
    cooldown: 0,
    relatedCommands: ["لوحة-رتب-إنشاء", "لوحة-رتب-تعديل", "لوحة-رتب-مسح"]
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
      await interaction.deferReply({ ephemeral: true })

      const panels = await getAllPanels(interaction.guild.id)

      if (!panels.length) {
        return interaction.editReply({ content: "📭 ما فيه لوحات رتب في هذا السيرفر." })
      }

      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle("📋 لوحات الرتب بالأزرار")
        .setDescription(`إجمالي: **${panels.length}** لوحة`)
        .setTimestamp()

      for (const p of panels.slice(0, 10)) {
        const buttons = await getPanelButtons(p.message_id)
        embed.addFields({
          name: p.title,
          value: [
            `📌 ID: \`${p.message_id}\``,
            `📍 القناة: <#${p.channel_id}>`,
            `🔘 الأزرار: **${buttons.length}**`,
            `⚡ حصري: ${p.exclusive ? "نعم" : "لا"}`
          ].join("\n")
        })
      }

      return interaction.editReply({ embeds: [embed] })

    } catch (err) {
      console.error("[BUTTON-ROLE-LIST ERROR]", err)
      const msg = "❌ حدث خطأ أثناء جلب القائمة."
      if (interaction.deferred) return interaction.editReply({ content: msg })
      if (!interaction.replied) return interaction.reply({ content: msg, ephemeral: true })
    }
  }
}
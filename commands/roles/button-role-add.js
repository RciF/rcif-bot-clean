const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js")
const commandGuardSystem = require("../../systems/commandGuardSystem")
const databaseSystem     = require("../../systems/databaseSystem")
const {
  ensureTable,
  getPanel,
  getPanelButtons,
  buildPanelMessage,
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
      const label     = interaction.options.getString("النص")
      const emoji     = interaction.options.getString("الإيموجي")
      const color     = interaction.options.getString("اللون") || "أزرق"

      await interaction.deferReply({ ephemeral: true })

      const panel = await getPanel(messageId)
      if (!panel || panel.guild_id !== interaction.guild.id) {
        return interaction.editReply({ content: "❌ ما لقيت هذه اللوحة في السيرفر." })
      }

      const existing = await databaseSystem.queryOne(
        "SELECT id FROM button_roles WHERE message_id = $1 AND role_id = $2",
        [messageId, role.id]
      )
      if (existing) {
        return interaction.editReply({ content: `❌ رتبة ${role} مضافة بالفعل.` })
      }

      const buttons = await getPanelButtons(messageId)
      if (buttons.length >= 25) {
        return interaction.editReply({ content: "❌ وصلت الحد الأقصى (25 زر)." })
      }

      const botMember = interaction.guild.members.me
      if (role.position >= botMember.roles.highest.position) {
        return interaction.editReply({ content: "❌ رتبة البوت أقل من هذه الرتبة، ارفع رتبة البوت أولاً." })
      }

      await databaseSystem.query(`
        INSERT INTO button_roles (guild_id, channel_id, message_id, role_id, label, emoji, color)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
      `, [interaction.guild.id, panel.channel_id, messageId, role.id, label, emoji || null, color])

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
            .setColor(0x22c55e)
            .setTitle("✅ تم إضافة الزر")
            .addFields(
              { name: "🏷️ الرتبة", value: `${role}`, inline: true },
              { name: "📝 النص",   value: label,       inline: true },
              { name: "🎨 اللون",  value: color,        inline: true }
            )
        ]
      })

    } catch (err) {
      console.error("[BUTTON-ROLE-ADD ERROR]", err)
      const msg = "❌ حدث خطأ أثناء إضافة الزر."
      if (interaction.deferred) return interaction.editReply({ content: msg })
      if (!interaction.replied) return interaction.reply({ content: msg, ephemeral: true })
    }
  }
}
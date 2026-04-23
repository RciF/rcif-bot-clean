const { EmbedBuilder } = require("discord.js")
const databaseSystem = require("../../systems/databaseSystem")
const {
  getPanel,
  getPanelButtons
} = require("./_button-role-shared")

// ══════════════════════════════════════
//  BUTTON INTERACTION HANDLER
//  يُستدعى من events/interactionCreate.js
//  عند customId يبدأ بـ brole_
// ══════════════════════════════════════

module.exports.handleButtonRoleInteraction = async function(interaction) {
  try {
    const btnId = parseInt(interaction.customId.replace("brole_", ""))
    if (isNaN(btnId)) return

    const btnData = await databaseSystem.queryOne(
      "SELECT * FROM button_roles WHERE id = $1",
      [btnId]
    )

    if (!btnData) {
      return interaction.reply({ content: "❌ هذا الزر لم يعد موجوداً.", ephemeral: true })
    }

    const guild  = interaction.guild
    const member = interaction.member
    const role   = guild.roles.cache.get(btnData.role_id)

    if (!role) {
      return interaction.reply({ content: "❌ الرتبة غير موجودة.", ephemeral: true })
    }

    const botMember = guild.members.me
    if (role.position >= botMember.roles.highest.position) {
      return interaction.reply({
        content: "❌ البوت ما يقدر يعطي هذه الرتبة — ارفع رتبة البوت.",
        ephemeral: true
      })
    }

    const hasRole = member.roles.cache.has(role.id)

    // ── وضع الحصري: نزيل باقي رتب اللوحة قبل الإضافة ──
    if (!hasRole) {
      const panel = await getPanel(btnData.message_id)
      if (panel?.exclusive) {
        const allButtons = await getPanelButtons(btnData.message_id)
        for (const btn of allButtons) {
          if (btn.role_id !== role.id && member.roles.cache.has(btn.role_id)) {
            try {
              await member.roles.remove(btn.role_id, "Button Roles — Exclusive")
            } catch {}
          }
        }
      }
    }

    // ── Toggle: إضافة أو إزالة ──
    if (hasRole) {
      await member.roles.remove(role.id, "Button Roles — Remove")
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xef4444)
            .setDescription(`❌ تم **إزالة** رتبة ${role} منك.`)
        ],
        ephemeral: true
      })
    } else {
      await member.roles.add(role.id, "Button Roles — Add")
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x22c55e)
            .setDescription(`✅ تم **إضافة** رتبة ${role} لك.`)
        ],
        ephemeral: true
      })
    }

  } catch (err) {
    console.error("[BUTTON-ROLE-HANDLER ERROR]", err)
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: "❌ حدث خطأ.", ephemeral: true }).catch(() => {})
    }
  }
}
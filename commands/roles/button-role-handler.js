// ══════════════════════════════════════════════════════════════════
//  Button Role Interaction Handler
//  المسار: commands/roles/button-role-handler.js
//
//  يُستدعى من events/interactionCreate.js عند customId يبدأ بـ brole_
//  يدعم الـ formats:
//    - brole_<numeric>      ← legacy (button_roles table)
//    - brole_p_<id>_<idx>   ← dashboard (button_role_panels.buttons JSONB)
// ══════════════════════════════════════════════════════════════════

const { EmbedBuilder } = require("discord.js")
const { findButtonByCustomId, getPanelButtons } = require("./_button-role-shared")
const logger = require("../../systems/loggerSystem")

module.exports.handleButtonRoleInteraction = async function (interaction) {
  try {
    if (!interaction.customId?.startsWith("brole_")) return

    // ✅ ابحث عن الزر (legacy أو jsonb)
    const btnData = await findButtonByCustomId(interaction.customId)

    if (!btnData) {
      return interaction.reply({
        content: "❌ هذا الزر لم يعد موجوداً.",
        ephemeral: true
      })
    }

    const guild = interaction.guild
    const member = interaction.member
    const role = guild.roles.cache.get(btnData.role_id)

    if (!role) {
      return interaction.reply({
        content: "❌ الرتبة غير موجودة (تم حذفها).",
        ephemeral: true
      })
    }

    const botMember = guild.members.me
    if (role.position >= botMember.roles.highest.position) {
      return interaction.reply({
        content: "❌ البوت ما يقدر يعطي هذه الرتبة — ارفع رتبة البوت.",
        ephemeral: true
      })
    }

    if (role.managed) {
      return interaction.reply({
        content: "❌ هذه الرتبة مُدارة من تكامل خارجي ولا يمكن إعطاؤها يدوياً.",
        ephemeral: true
      })
    }

    const hasRole = member.roles.cache.has(role.id)

    // ── وضع الحصري: نزيل باقي رتب اللوحة قبل الإضافة ──
    if (!hasRole && btnData.panel?.exclusive && btnData.panel_message_id) {
      try {
        const allButtons = await getPanelButtons(btnData.panel_message_id)
        for (const btn of allButtons) {
          if (btn.role_id !== role.id && member.roles.cache.has(btn.role_id)) {
            try {
              await member.roles.remove(btn.role_id, "Button Roles — Exclusive")
            } catch {}
          }
        }
      } catch (err) {
        logger.error("BUTTON_ROLE_EXCLUSIVE_FAILED", { error: err.message })
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
    logger.error("BUTTON_ROLE_HANDLER_FAILED", {
      error: err.message,
      stack: err.stack
    })
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "❌ حدث خطأ.",
        ephemeral: true
      }).catch(() => {})
    }
  }
}
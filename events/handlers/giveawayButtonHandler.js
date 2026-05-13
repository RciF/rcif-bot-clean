// ══════════════════════════════════════════════════════════════════
//  GIVEAWAY BUTTON HANDLER
//  المسار: events/handlers/giveawayButtonHandler.js
//
//  يُستدعى من events/interactionCreate.js عند الضغط على زر السحب.
//  customId pattern: "giveaway_join_<id>"
// ══════════════════════════════════════════════════════════════════

const giveawaySystem = require("../../systems/giveawaySystem")
const logger = require("../../systems/loggerSystem")

async function handleGiveawayButton(interaction) {
  try {
    const customId = interaction.customId
    if (!customId?.startsWith("giveaway_join_")) return false

    const giveawayId = parseInt(customId.replace("giveaway_join_", ""))
    if (!isFinite(giveawayId)) return false

    await interaction.deferReply({ ephemeral: true })

    const result = await giveawaySystem.enterGiveaway(giveawayId, interaction.member)

    if (!result.ok) {
      await interaction.editReply({ content: `❌ ${result.reason}` }).catch(() => {})
      return true
    }

    if (result.toggled === "removed") {
      await interaction.editReply({
        content: "✅ تم سحب مشاركتك من السحب."
      }).catch(() => {})
    } else {
      await interaction.editReply({
        content: "🎉 تم تسجيل مشاركتك! حظ موفق."
      }).catch(() => {})
    }

    // ─── حدّث رسالة السحب (في الخلفية) ───
    giveawaySystem.refreshGiveawayMessage(giveawayId).catch(() => {})

    return true
  } catch (err) {
    logger.error("GIVEAWAY_BUTTON_HANDLER_FAILED", { error: err.message })
    try {
      if (interaction.deferred && !interaction.replied) {
        await interaction.editReply({ content: "❌ حدث خطأ، حاول مرة ثانية." })
      } else if (!interaction.replied) {
        await interaction.reply({ content: "❌ حدث خطأ، حاول مرة ثانية.", ephemeral: true })
      }
    } catch {}
    return true
  }
}

module.exports = { handleGiveawayButton }
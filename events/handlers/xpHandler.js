// ══════════════════════════════════════════════════════════════════
//  XP Handler — يضيف XP ويتعامل مع الترقية
// ══════════════════════════════════════════════════════════════════

const levelSystem = require("../../systems/levelSystem")
const xpSystem = require("../../systems/xpSystem")
const xpCooldownSystem = require("../../systems/xpCooldownSystem")
const logger = require("../../systems/loggerSystem")
const { sendLevelUpMessage } = require("./levelUpHandler")

async function handleXP(message) {
  const xpEnabled = await xpSystem.ensureXPEnabled(message)
  if (!xpEnabled) return

  if (!xpCooldownSystem.canGainXP(message.author.id)) return

  let result
  try {
    result = await levelSystem.addXP(message.author.id, message.guild.id, message)
  } catch (err) {
    logger.error("XP_ADD_FAILED", { error: err.message })
    return
  }

  if (result?.leveledUp) {
    try {
      await sendLevelUpMessage(message, result)
    } catch (err) {
      logger.error("LEVEL_UP_MESSAGE_FAILED", { error: err.message })
    }
  }
}

module.exports = { handleXP }
// ══════════════════════════════════════════════════════════════════
//  AI Handler — observation + social + auto-reply
// ══════════════════════════════════════════════════════════════════

const aiSystem = require("../../systems/aiSystem")
const aiAutoReplySystem = require("../../systems/aiAutoReplySystem")
const aiObservationSystem = require("../../systems/aiObservationSystem")
const aiSocialAwarenessSystem = require("../../systems/aiSocialAwarenessSystem")
const logger = require("../../systems/loggerSystem")

async function handleAI(message) {
  // observation (non-blocking)
  try {
    aiObservationSystem.observeMessage(message)
  } catch (err) {
    logger.error("AI_OBSERVATION_FAILED", { error: err.message })
  }

  // social awareness
  try {
    await aiSocialAwarenessSystem.trackInteraction(message)
  } catch (err) {
    logger.error("AI_SOCIAL_AWARENESS_FAILED", { error: err.message })
  }

  // auto reply
  const aiEnabled = await aiSystem.ensureAIEnabled(message)
  if (aiEnabled) {
    try {
      await aiAutoReplySystem(message)
    } catch (err) {
      logger.error("AI_REPLY_FAILED", { error: err.message })
    }
  }
}

module.exports = { handleAI }
const logger = require("./loggerSystem")

/**
 * معالج خطأ موحّد
 *
 * @param {Error|*} error - الخطأ
 * @param {object} context - سياق إضافي (commandName, userId, guildId, source)
 */
function handleError(error, context = {}) {

  const errorMessage = error?.message || String(error)
  const errorStack = error?.stack || "no stack"

  logger.error("SYSTEM_ERROR", {
    message: errorMessage,
    source: context.source || "unknown",
    commandName: context.commandName,
    userId: context.userId,
    guildId: context.guildId,
    stack: errorStack
  })

}

module.exports = {
  handleError
}
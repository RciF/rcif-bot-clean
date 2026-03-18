const logger = require("../utils/logger")

function init() {

  try {
    logger.info("LOGGER_SYSTEM_INITIALIZED")
    logger.success("SYSTEMS_RUNNING")
  } catch (err) {
    console.error("LOGGER_INIT_FAILED", err?.message)
  }

}

function safeLog(method, message, data) {

  if (!message) return

  try {

    if (typeof logger[method] !== "function") {
      console.error("LOGGER_METHOD_INVALID", method, message, data)
      return
    }

    if (data) {
      logger[method](message, data)
    } else {
      logger[method](message)
    }

  } catch (err) {

    try {
      console.error("LOGGER_SAFELOG_FAILED", {
        method,
        message,
        error: err?.message
      })
    } catch {}

  }

}

function info(message, data = null) {
  safeLog("info", message, data)
}

function warn(message, data = null) {
  safeLog("warn", message, data)
}

function error(message, data = null) {
  safeLog("error", message, data)
}

function success(message, data = null) {
  safeLog("success", message, data)
}

module.exports = {
  init,
  info,
  warn,
  error,
  success
}
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
      logger[method](message, sanitizeData(data))
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

// ✅ improved sanitize (handles arrays + depth)
function sanitizeData(data) {

  try {

    if (!data) return data

    if (typeof data !== "object") return data

    const safe = {}

    for (const key in data) {

      const value = data[key]

      if (value === null || value === undefined) {
        safe[key] = value
        continue
      }

      if (typeof value === "string") {
        safe[key] = value.slice(0, 300)
        continue
      }

      if (typeof value === "number" || typeof value === "boolean") {
        safe[key] = value
        continue
      }

      if (Array.isArray(value)) {
        safe[key] = `[array(${value.length})]`
        continue
      }

      if (typeof value === "object") {
        safe[key] = "[object]"
        continue
      }

      safe[key] = "[unknown]"
    }

    return safe

  } catch {
    return "[sanitize_failed]"
  }
}

// 🔥 performance log
function perf(label, ms) {
  safeLog("info", "PERF", { label, ms })
}

// 🔥 debug mode
function debug(message, data = null) {
  if (process.env.DEBUG !== "true") return
  safeLog("info", "DEBUG: " + message, data)
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
  success,
  debug,
  perf
}
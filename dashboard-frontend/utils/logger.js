const COLORS = {
  reset: "\x1b[0m",
  gray: "\x1b[90m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m"
}

function time() {
  return new Date().toISOString()
}

function format(level, color, message) {
  return `${COLORS.gray}[${time()}]${COLORS.reset} ${color}${level}${COLORS.reset} ${message}`
}

function sanitize(data) {
  try {
    if (!data) return null

    if (typeof data !== "object") return data

    const safe = {}

    for (const key in data) {
      const val = data[key]

      if (val === null || val === undefined) {
        safe[key] = val
        continue
      }

      if (typeof val === "string") {
        safe[key] = val.slice(0, 300)
        continue
      }

      if (typeof val === "number" || typeof val === "boolean") {
        safe[key] = val
        continue
      }

      safe[key] = "[object]"
    }

    return safe
  } catch {
    return "[sanitize_failed]"
  }
}

function log(method, level, color, message, data) {

  const output = format(level, color, message)

  if (data) {
    console[method](output, sanitize(data))
  } else {
    console[method](output)
  }

}

// 🔥 optional debug toggle
function debug(message, data = null) {
  if (process.env.DEBUG !== "true") return
  log("log", "DEBUG", COLORS.cyan, message, data)
}

// 🔥 performance helper
function perf(label, ms) {
  log("log", "PERF", COLORS.gray, `${label} (${ms}ms)`)
}

module.exports = {

  info(message, data = null) {
    log("log", "INFO", COLORS.cyan, message, data)
  },

  success(message, data = null) {
    log("log", "SUCCESS", COLORS.green, message, data)
  },

  warn(message, data = null) {
    log("warn", "WARN", COLORS.yellow, message, data)
  },

  error(message, data = null) {
    log("error", "ERROR", COLORS.red, message, data)
  },

  debug,
  perf

}
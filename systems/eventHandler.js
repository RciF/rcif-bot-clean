const fs = require("fs")
const path = require("path")
const logger = require("./loggerSystem")

function getAllEventFiles(dir) {
  let results = []

  const items = fs.readdirSync(dir)

  for (const item of items) {
    const fullPath = path.join(dir, item)
    const stat = fs.statSync(fullPath)

    if (stat.isDirectory()) {
      results = results.concat(getAllEventFiles(fullPath))
    } else if (item.endsWith(".js")) {
      results.push(fullPath)
    }
  }

  return results
}

module.exports = (client) => {
  const eventsPath = path.join(__dirname, "../events")

  if (!fs.existsSync(eventsPath)) {
    logger.warn("EVENTS_FOLDER_NOT_FOUND")
    return
  }

  let eventFiles = []

  try {
    eventFiles = getAllEventFiles(eventsPath)
  } catch (err) {
    logger.error("EVENT_FOLDER_READ_FAILED", {
      error: err.message
    })
    return
  }

  let loaded = 0
  let skipped = 0

  for (const filePath of eventFiles) {
    try {
      delete require.cache[require.resolve(filePath)]

      const event = require(filePath)

      if (!event || !event.name || typeof event.execute !== "function") {
        const fileName = path.relative(eventsPath, filePath)
        logger.warn(`INVALID_EVENT_FILE ${fileName}`)
        skipped++
        continue
      }

      if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client))
      } else {
        client.on(event.name, (...args) => event.execute(...args, client))
      }

      loaded++

      const fileName = path.relative(eventsPath, filePath)
      logger.info(`EVENT_LOADED ${event.name} (${fileName})`)
    } catch (error) {
      const fileName = path.relative(eventsPath, filePath)
      logger.error("EVENT_LOAD_FAILED", {
        file: fileName,
        error: error.message
      })
      skipped++
    }
  }

  logger.success(`EVENTS_LOADED ${loaded}`)

  if (skipped > 0) {
    logger.warn(`EVENTS_SKIPPED ${skipped}`)
  }
}
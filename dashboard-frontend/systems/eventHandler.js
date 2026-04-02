const fs = require("fs")
const path = require("path")
const logger = require("./loggerSystem")

module.exports = (client) => {

  const eventsPath = path.join(__dirname, "../events")

  if (!fs.existsSync(eventsPath)) {

    logger.warn("EVENTS_FOLDER_NOT_FOUND")
    return

  }

  let eventFiles = []

  try {

    eventFiles = fs
      .readdirSync(eventsPath)
      .filter(file => file.endsWith(".js"))

  } catch (err) {

    logger.error("EVENT_FOLDER_READ_FAILED", {
      error: err.message
    })

    return
  }

  let loaded = 0
  let skipped = 0

  for (const file of eventFiles) {

    try {

      const filePath = path.join(eventsPath, file)

      delete require.cache[require.resolve(filePath)]

      const event = require(filePath)

      if (!event || !event.name || typeof event.execute !== "function") {

        logger.warn(`INVALID_EVENT_FILE ${file}`)
        skipped++
        continue

      }

      if (event.once) {

        client.once(event.name, (...args) => event.execute(...args, client))

      } else {

        client.on(event.name, (...args) => event.execute(...args, client))

      }

      loaded++

      logger.info(`EVENT_LOADED ${event.name}`)

    } catch (error) {

      logger.error("EVENT_LOAD_FAILED", {
        file,
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
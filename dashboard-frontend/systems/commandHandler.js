const fs = require("fs")
const path = require("path")
const logger = require("./loggerSystem")

module.exports = (client) => {

  const commandsPath = path.join(__dirname, "../commands")

  if (!fs.existsSync(commandsPath)) {

    logger.warn("COMMANDS_FOLDER_NOT_FOUND")
    return

  }

  if (!client.commands) {
    client.commands = new Map()
  }

  let loaded = 0
  let skipped = 0

  let commandFolders = []

  try {
    commandFolders = fs.readdirSync(commandsPath)
  } catch (err) {
    logger.error("COMMAND_FOLDER_READ_FAILED", {
      error: err.message
    })
    return
  }

  for (const folder of commandFolders) {

    const folderPath = path.join(commandsPath, folder)

    let stat

    try {
      stat = fs.lstatSync(folderPath)
    } catch {
      continue
    }

    if (!stat.isDirectory()) continue

    let commandFiles = []

    try {

      commandFiles = fs
        .readdirSync(folderPath)
        .filter(file => file.endsWith(".js"))

    } catch {
      continue
    }

    for (const file of commandFiles) {

      try {

        const filePath = path.join(folderPath, file)

        delete require.cache[require.resolve(filePath)]

        const command = require(filePath)

        if (!command || !command.data || !command.data.name) {

          logger.warn(`INVALID_COMMAND_FILE ${file}`)
          skipped++
          continue

        }

        const name = command.data.name

        if (client.commands.has(name)) {

          logger.warn(`DUPLICATE_COMMAND ${name}`)
          skipped++
          continue

        }

        client.commands.set(name, command)

        loaded++

      } catch (error) {

        logger.error("COMMAND_LOAD_FAILED", {
          file,
          error: error.message
        })

        skipped++

      }

    }

  }

  logger.success(`COMMANDS_LOADED ${loaded}`)

  if (skipped > 0) {
    logger.warn(`COMMANDS_SKIPPED ${skipped}`)
  }

}
const fs = require("fs")
const path = require("path")
const logger = require("./loggerSystem")

module.exports = () => {

  const dataFolder = path.join(__dirname, "../data")
  const backupFolder = path.join(__dirname, "../data/backups")

  try {

    if (!fs.existsSync(dataFolder)) {
      fs.mkdirSync(dataFolder, { recursive: true })
    }

    if (!fs.existsSync(backupFolder)) {
      fs.mkdirSync(backupFolder, { recursive: true })
    }

  } catch (error) {

    logger.error("BACKUP_FOLDER_INIT_FAILED", {
      error: error.message
    })

  }

  setInterval(() => {

    try {

      const files = fs.readdirSync(dataFolder)

      for (const file of files) {

        if (!file.endsWith(".json")) continue

        const source = path.join(dataFolder, file)
        const destination = path.join(backupFolder, file)

        fs.copyFileSync(source, destination)

      }

      logger.info("DATA_BACKUP_COMPLETED")

    } catch (error) {

      logger.error("DATA_BACKUP_FAILED", {
        error: error.message
      })

    }

  }, 300000)

}
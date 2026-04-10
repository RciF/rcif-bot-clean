require("dotenv").config()

const { Client, GatewayIntentBits, Partials, Collection } = require("discord.js")

const startupSystem = require("./systems/startupSystem")
const { startApiServer } = require("./systems/apiServerSystem")
const logger = require("./systems/loggerSystem")

const DISCORD_TOKEN = process.env.DISCORD_TOKEN

if (!DISCORD_TOKEN) {
  console.error("❌ DISCORD_TOKEN is missing in .env")
  process.exit(1)
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildPresences
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.GuildMember
  ]
})

client.commands = new Collection()

logger.init()

require("./systems/commandHandler")(client)
require("./systems/eventHandler")(client)

try {
  require("./systems/backupSystem")()
} catch (err) {
  logger.warn("BACKUP_SYSTEM_LOAD_FAILED", { error: err.message })
}

;(async () => {
  try {
    await startupSystem()
    await client.login(DISCORD_TOKEN)
    startApiServer(client)
    logger.success("DISCORD_CLIENT_CONNECTED")
  } catch (error) {
    logger.error("SYSTEM_STARTUP_FAILED", {
      error: error.message,
      stack: error.stack
    })
    process.exit(1)
  }
})()

process.on("unhandledRejection", (error) => {
  logger.error("UNHANDLED_PROMISE_REJECTION", {
    error: error?.message || error
  })
})

process.on("uncaughtException", (error) => {
  logger.error("UNCAUGHT_EXCEPTION", {
    error: error?.message || error
  })
})

process.on("warning", (warning) => {
  logger.warn("NODE_WARNING", { message: warning.message })
})
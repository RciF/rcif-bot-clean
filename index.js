require("dotenv").config()

const { Client, GatewayIntentBits, Collection } = require("discord.js")

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
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
    // ✅ FIX: إضافة GuildPresences عشان online_members في statsSystem يشتغل صح
    GatewayIntentBits.GuildPresences,
  ],
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
    startApiServer(client)

    await startupSystem()
    await client.login(DISCORD_TOKEN)
    logger.success("DISCORD_CLIENT_CONNECTED")

    const { updateAllGuilds } = require("./systems/statsSystem")
    // ✅ FIX: Discord يسمح بتغيير اسم القناة مرتين كل 10 دقائق
    // نستخدم 10 دقائق بدل 5 عشان نتجنب rate limit
    setInterval(async () => {
      try {
        await updateAllGuilds(client)
      } catch (err) {
        logger.error("STATS_AUTO_UPDATE_FAILED", { error: err.message })
      }
    }, 10 * 60 * 1000) // ✅ FIX: من 5 دقائق إلى 10 دقائق

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
    error: error?.message || error,
    stack: error?.stack || "no stack"
  })
})

process.on("warning", (warning) => {
  logger.warn("NODE_WARNING", { message: warning.message })
})
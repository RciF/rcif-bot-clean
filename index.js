require("dotenv").config()

const { Client, GatewayIntentBits, Collection } = require("discord.js")

const startupSystem = require("./systems/startupSystem")
const { startApiServer } = require("./systems/apiServerSystem")
const logger = require("./systems/loggerSystem")
const subRoleSystem = require("./systems/subscriptionRoleSystem")
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
    subRoleSystem.init(client)
// ══════════════════════════════════════
//  ✅ نشر الأوامر تلقائياً عند بدء التشغيل
// ══════════════════════════════════════
try {
  const { REST, Routes } = require("discord.js")
  const path = require("path")
  const fs = require("fs")

  const DEPLOY_MODE = process.env.DEPLOY_MODE || "guild"
  const GUILD_ID = process.env.GUILD_ID
  const CLIENT_ID = process.env.CLIENT_ID

  const commands = []
  const commandsPath = path.join(__dirname, "commands")
  const folders = fs.readdirSync(commandsPath)

  for (const folder of folders) {
    const folderPath = path.join(commandsPath, folder)
    if (!fs.lstatSync(folderPath).isDirectory()) continue

    const files = fs.readdirSync(folderPath).filter(f => f.endsWith(".js"))
    for (const file of files) {
      const command = require(path.join(folderPath, file))

      // ✅ دعم الملفات التي تصدّر commands[] — يسجّل كل أمر
      if (Array.isArray(command?.commands)) {
        for (const cmd of command.commands) {
          if (cmd?.toJSON) {
            commands.push(cmd.toJSON())
          }
        }
        continue
      }

      // الحالة العادية — أمر واحد عبر data
      if (command?.data?.toJSON) {
        commands.push(command.data.toJSON())
      }
    }
  }

  const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN)

  if (DEPLOY_MODE === "guild" && GUILD_ID) {
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    )
    logger.success(`COMMANDS_DEPLOYED_GUILD ${commands.length} → ${GUILD_ID}`)
  } else if (DEPLOY_MODE === "global") {
    await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      { body: commands }
    )
    logger.success(`COMMANDS_DEPLOYED_GLOBAL ${commands.length}`)
  }

} catch (err) {
  logger.error("AUTO_DEPLOY_COMMANDS_FAILED", { error: err.message })
}

    const { updateAllGuilds } = require("./systems/statsSystem")
    setInterval(async () => {
      try {
        await updateAllGuilds(client)
      } catch (err) {
        logger.error("STATS_AUTO_UPDATE_FAILED", { error: err.message })
      }
    }, 10 * 60 * 1000)

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
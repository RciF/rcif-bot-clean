require("dotenv").config()

const { Client, GatewayIntentBits, Collection } = require("discord.js")

const startupSystem = require("./systems/startupSystem")
const { startApiServer } = require("./systems/apiServerSystem")
const logger = require("./systems/loggerSystem")
const subRoleSystem = require("./systems/subscriptionRoleSystem")
const scheduler = require("./systems/schedulerSystem")
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

// ══════════════════════════════════════════════════════════════════
//  COLLECT COMMANDS FOR AUTO-DEPLOY
// ══════════════════════════════════════════════════════════════════
function collectCommandsForDeploy() {
  const path = require("path")
  const fs = require("fs")

  const commands = []
  const commandsPath = path.join(__dirname, "commands")
  const categoryFolders = fs.readdirSync(commandsPath)

  for (const category of categoryFolders) {
    const categoryPath = path.join(commandsPath, category)
    if (!fs.lstatSync(categoryPath).isDirectory()) continue

    const categoryIndexPath = path.join(categoryPath, "index.js")
    if (fs.existsSync(categoryIndexPath)) {
      pushCommand(categoryIndexPath, commands)
      continue
    }

    const entries = fs.readdirSync(categoryPath)

    for (const entry of entries) {
      if (entry.startsWith("_")) continue

      const entryPath = path.join(categoryPath, entry)
      const entryStat = fs.lstatSync(entryPath)

      if (entryStat.isFile()) {
        if (!entry.endsWith(".js")) continue
        pushCommand(entryPath, commands)
        continue
      }

      if (entryStat.isDirectory()) {
        const indexPath = path.join(entryPath, "index.js")
        if (!fs.existsSync(indexPath)) continue
        pushCommand(indexPath, commands)
      }
    }
  }

  return commands
}

function pushCommand(filePath, commands) {
  try {
    const command = require(filePath)

    if (command.commands) {
      for (const cmd of command.commands) {
        if (cmd?.toJSON) commands.push(cmd.toJSON())
      }
      return
    }

    if (command?.data?.toJSON) {
      commands.push(command.data.toJSON())
    }
  } catch (err) {
    logger.error("AUTO_DEPLOY_LOAD_FAILED", {
      file: filePath,
      error: err.message
    })
  }
}

;(async () => {
  try {
    startApiServer(client)

    await startupSystem()
    await client.login(DISCORD_TOKEN)
    logger.success("DISCORD_CLIENT_CONNECTED")
    subRoleSystem.init(client)

    const fridaySaleSystem = require("./systems/fridaySaleSystem")
    fridaySaleSystem.startScheduler()

    const eventReminderSystem = require("./systems/eventReminderSystem")
    eventReminderSystem.startScheduler(client)

    // ══════════════════════════════════════
    //  ✅ نشر الأوامر تلقائياً
    // ══════════════════════════════════════
    try {
      const { REST, Routes } = require("discord.js")

      const DEPLOY_MODE = process.env.DEPLOY_MODE || "guild"
      const GUILD_ID    = process.env.GUILD_ID
      const CLIENT_ID   = process.env.CLIENT_ID

      const commands = collectCommandsForDeploy()
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

    // ══════════════════════════════════════
    //  ✅ Scheduler — كل الـ cron jobs هنا
    // ══════════════════════════════════════
    const { updateAllGuilds, ensureTables } = require("./systems/statsSystem")

    // إنشاء الجداول عند البدء
    try {
      await ensureTables()
      logger.success("STATS_TABLES_READY")
    } catch (err) {
      logger.error("STATS_TABLES_FAILED", { error: err.message })
    }

    // تحديث لوحات الإحصائيات كل 10 دقائق
    scheduler.register(
      "stats-panel-update",
      10 * 60 * 1000,
      () => updateAllGuilds(client),
      false // لا تشتغل فوراً — انتظر حتى يتحمل الكلاينت بالكامل
    )

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
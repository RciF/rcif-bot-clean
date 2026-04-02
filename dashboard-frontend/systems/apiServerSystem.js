const express = require("express")
const logger = require("./loggerSystem")

const { getHealth } = require("./healthSystem")
const { getStatus } = require("./statusSystem")
const { getMetrics } = require("./metricsSystem")
const { checkDatabaseHealth } = require("./databaseHealthSystem")
const { getDatabaseStats } = require("./databaseStatsSystem")
const { checkRepositories } = require("./repositoryHealthSystem")

function startApiServer(client) {

  const app = express()

  // ✅ FIX: use Render required PORT
  const PORT = process.env.PORT || 3000

  app.get("/", (req, res) => {
    res.json({
      service: "Discord Production Platform",
      component: "Bot Core",
      status: "running"
    })
  })

  app.get("/health", async (req, res) => {

    const system = getHealth()
    const database = await checkDatabaseHealth()
    const repositories = checkRepositories()

    res.json({
      system,
      database,
      repositories
    })

  })

  app.get("/status", (req, res) => {

    const status = getStatus(client)

    res.json(status)

  })

  app.get("/metrics", (req, res) => {

    const metrics = getMetrics()

    res.json(metrics)

  })

  app.get("/dbstats", async (req, res) => {

    const stats = await getDatabaseStats()

    res.json(stats)

  })

  app.get("/diagnostics", async (req, res) => {

    const database = await checkDatabaseHealth()
    const repositories = checkRepositories()

    const guilds = client?.guilds?.cache?.size || 0
    const users = client?.users?.cache?.size || 0

    res.json({
      bot: client?.user ? client.user.tag : "not ready",
      status: client?.isReady?.() ? "online" : "starting",
      uptime: process.uptime(),
      memory: process.memoryUsage().rss,
      guilds,
      users,
      database,
      repositories
    })

  })

  app.listen(PORT, () => {
    logger.success(`API_SERVER_RUNNING ${PORT}`)
  })

}

module.exports = {
  startApiServer
}
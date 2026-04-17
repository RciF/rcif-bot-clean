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

  // ═══════════════════════════════════════════════════
  //  ✅ NEW: /diagnostics/env
  //  endpoint تشخيصي يعرض حالة Environment Variables
  //  ويختبر الاتصال بالداشبورد
  //  — بدون كشف القيم الحساسة —
  // ═══════════════════════════════════════════════════
  app.get("/diagnostics/env", async (req, res) => {

    // ── المتغيرات المطلوبة
    const requiredVars = [
      "DISCORD_TOKEN",
      "CLIENT_ID",
      "DATABASE_URL",
      "OPENAI_API_KEY",
      "OWNER_ID"
    ]

    // ── المتغيرات الاختيارية (مهمة لكن ما تسبب كراش)
    const optionalVars = [
      "DASHBOARD_URL",
      "BOT_SECRET",
      "CLIENT_SECRET",
      "GUILD_ID",
      "DEPLOY_MODE",
      "PORT",
      "NODE_ENV",
      "FRONTEND_URL",
      "REDIRECT_URI"
    ]

    const envStatus = {}

    // فحص المتغيرات المطلوبة
    for (const key of requiredVars) {
      const value = process.env[key]
      envStatus[key] = {
        required: true,
        present: Boolean(value),
        length: value ? value.length : 0,
        preview: value ? maskValue(value) : null
      }
    }

    // فحص المتغيرات الاختيارية
    for (const key of optionalVars) {
      const value = process.env[key]
      envStatus[key] = {
        required: false,
        present: Boolean(value),
        length: value ? value.length : 0,
        preview: value ? maskValue(value) : null
      }
    }

    // ── اختبار الاتصال بالداشبورد
    const dashboardTest = await testDashboardConnection()

    // ── حساب الصحة الإجمالية
    const missingRequired = requiredVars.filter(k => !process.env[k])
    const missingOptional = optionalVars.filter(k => !process.env[k])
    const healthScore = calculateHealthScore(envStatus, dashboardTest)

    res.json({
      timestamp: new Date().toISOString(),
      health_score: healthScore,
      status: healthScore >= 90 ? "excellent" : healthScore >= 70 ? "good" : healthScore >= 50 ? "warning" : "critical",
      summary: {
        required_present: requiredVars.length - missingRequired.length,
        required_total: requiredVars.length,
        optional_present: optionalVars.length - missingOptional.length,
        optional_total: optionalVars.length,
        missing_required: missingRequired,
        missing_optional: missingOptional
      },
      environment: envStatus,
      dashboard_connection: dashboardTest,
      recommendations: buildRecommendations(envStatus, dashboardTest)
    })

  })

  app.listen(PORT, "0.0.0.0", () => {
    logger.success(`API_SERVER_RUNNING ${PORT}`)
    console.log(`🚀 Server listening on 0.0.0.0:${PORT}`)
  })

}

// ═══════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════

/**
 * يخفي القيمة الحساسة ويظهر أول 4 أحرف + آخر 4 أحرف فقط
 * مثال: "abc123xyz789" → "abc1...z789"
 */
function maskValue(value) {
  if (!value) return null
  const str = String(value)
  if (str.length <= 10) return "***"
  return str.slice(0, 4) + "..." + str.slice(-4)
}

/**
 * يختبر الاتصال بالداشبورد
 */
async function testDashboardConnection() {
  const dashUrl = process.env.DASHBOARD_URL
  const botSecret = process.env.BOT_SECRET

  if (!dashUrl) {
    return {
      configured: false,
      reachable: false,
      authenticated: false,
      error: "DASHBOARD_URL not set"
    }
  }

  if (!botSecret) {
    return {
      configured: false,
      reachable: false,
      authenticated: false,
      error: "BOT_SECRET not set"
    }
  }

  try {
    // اختبار 1: هل الداشبورد يرد أصلاً؟
    const pingRes = await fetch(dashUrl, {
      signal: AbortSignal.timeout(5000)
    })

    const reachable = pingRes.ok || pingRes.status === 404

    if (!reachable) {
      return {
        configured: true,
        reachable: false,
        authenticated: false,
        dashboard_url: dashUrl,
        error: `Dashboard returned status ${pingRes.status}`
      }
    }

    // اختبار 2: هل BOT_SECRET صحيح؟
    const testGuildId = "0000000000000000000"
    const authRes = await fetch(`${dashUrl}/api/bot/guild/${testGuildId}/command-settings`, {
      headers: { "x-bot-secret": botSecret },
      signal: AbortSignal.timeout(5000)
    })

    const authenticated = authRes.status !== 401

    return {
      configured: true,
      reachable: true,
      authenticated,
      dashboard_url: dashUrl,
      ping_status: pingRes.status,
      auth_status: authRes.status,
      error: authenticated ? null : "BOT_SECRET mismatch between bot and dashboard"
    }

  } catch (err) {
    return {
      configured: true,
      reachable: false,
      authenticated: false,
      dashboard_url: dashUrl,
      error: err.message || "Connection failed"
    }
  }
}

/**
 * حساب نقاط الصحة من 0 إلى 100
 */
function calculateHealthScore(envStatus, dashboardTest) {
  let score = 0
  let maxScore = 0

  // المتغيرات المطلوبة: 10 نقاط لكل واحد
  for (const [key, info] of Object.entries(envStatus)) {
    if (info.required) {
      maxScore += 10
      if (info.present) score += 10
    }
  }

  // المتغيرات الاختيارية: 5 نقاط لكل واحد
  for (const [key, info] of Object.entries(envStatus)) {
    if (!info.required) {
      maxScore += 5
      if (info.present) score += 5
    }
  }

  // اتصال الداشبورد: 20 نقطة
  maxScore += 20
  if (dashboardTest.reachable) score += 10
  if (dashboardTest.authenticated) score += 10

  return Math.round((score / maxScore) * 100)
}

/**
 * بناء توصيات بناءً على الحالة
 */
function buildRecommendations(envStatus, dashboardTest) {
  const recommendations = []

  // متغيرات مطلوبة ناقصة
  for (const [key, info] of Object.entries(envStatus)) {
    if (info.required && !info.present) {
      recommendations.push({
        severity: "critical",
        message: `المتغير المطلوب ${key} غير موجود — أضفه في Environment`
      })
    }
  }

  // متغيرات اختيارية مهمة ناقصة
  if (!envStatus.DASHBOARD_URL?.present) {
    recommendations.push({
      severity: "warning",
      message: "DASHBOARD_URL غير موجود — التحكم من الداشبورد لن يعمل"
    })
  }

  if (!envStatus.BOT_SECRET?.present) {
    recommendations.push({
      severity: "warning",
      message: "BOT_SECRET غير موجود — التحكم من الداشبورد لن يعمل"
    })
  }

  // مشاكل في اتصال الداشبورد
  if (envStatus.DASHBOARD_URL?.present && !dashboardTest.reachable) {
    recommendations.push({
      severity: "high",
      message: `الداشبورد غير قابل للوصول: ${dashboardTest.error}`
    })
  }

  if (dashboardTest.reachable && !dashboardTest.authenticated) {
    recommendations.push({
      severity: "high",
      message: "BOT_SECRET لا يطابق بين البوت والداشبورد — تأكد من أن نفس القيمة في الخدمتين"
    })
  }

  if (recommendations.length === 0) {
    recommendations.push({
      severity: "info",
      message: "كل شيء يعمل بشكل ممتاز ✅"
    })
  }

  return recommendations
}

module.exports = {
  startApiServer
}
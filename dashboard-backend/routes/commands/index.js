/**
 * ═══════════════════════════════════════════════════════════
 *  Commands Routes Rollup
 *
 *  ⚠️ مهم: ترتيب التحميل + المسارات
 *  - bot-internal: مسار منفصل (/api/bot/...)
 *  - باقي الـ routes تحت: /api/guild/:guildId/commands/...
 *
 *  استخدام في server.js:
 *
 *    const commandsRoutes = require("./routes/commands")
 *
 *    // للمستخدمين (الداشبورد):
 *    app.use("/api/guild/:guildId/commands", commandsRoutes.guildRoutes)
 *
 *    // للبوت:
 *    app.use("/api", commandsRoutes.botRoutes)
 *
 *  ⚠️ ملاحظة: هذا الباتش 1 — ما زال route القديم
 *  /api/guild/:guildId/commands من الملف commands.js القديم
 *  شغّال. بعد الباتش 3 (Frontend) راح نشيله ونعتمد فقط على هذا.
 * ═══════════════════════════════════════════════════════════
 */

const express = require("express")

// ════════════════════════════════════════════════════════════
//  Guild routes (للمستخدمين — محمية بـ requireAuth)
// ════════════════════════════════════════════════════════════

const guildRouter = express.Router({ mergeParams: true })

// نحمّل الـ sub-routes — كل واحد يستخدم mergeParams
guildRouter.use("/", require("./list"))
guildRouter.use("/", require("./aliases"))
guildRouter.use("/", require("./restrictions"))
guildRouter.use("/", require("./defaults"))
guildRouter.use("/", require("./leaderboard"))

// ════════════════════════════════════════════════════════════
//  Bot internal routes (للبوت — محمية بـ x-bot-secret)
// ════════════════════════════════════════════════════════════

const botRouter = require("./bot-internal")

module.exports = {
  guildRoutes: guildRouter,
  botRoutes: botRouter,
}
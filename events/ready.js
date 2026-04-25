// ══════════════════════════════════════════════════════════════════
//  CLIENT READY EVENT
//  المسار: events/ready.js
//
//  يُستدعى مرة واحدة لما البوت يتصل بـ Discord بنجاح.
//  استخدم هذا الـ event لتهيئة الأنظمة اللي تحتاج client جاهز.
// ══════════════════════════════════════════════════════════════════

const helpSystem = require("../systems/helpSystem")
const logger = require("../systems/loggerSystem")

module.exports = {
  name: "clientReady",
  once: true,

  execute(client) {
    console.log(`🤖 Logged in as ${client.user.tag}`)

    // ✅ تهيئة نظام /help — يقرأ كل الأوامر ويبني الفهرسة
    try {
      helpSystem.init()
      const stats = helpSystem.getStats()
      logger.success("HELP_SYSTEM_READY", {
        commands: stats.totalCommands,
        categories: stats.totalCategories,
        aliases: stats.totalAliases
      })
    } catch (err) {
      logger.error("HELP_SYSTEM_INIT_FAILED", { error: err.message })
    }
  },
}
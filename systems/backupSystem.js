const logger = require("./loggerSystem")
const databaseManager = require("../utils/databaseManager")

// ✅ FIX: النظام القديم كان يحاول عمل backup لملفات JSON
// لكن كل البيانات في قاعدة البيانات (PostgreSQL)، فلا يوجد JSON files
// الآن نستبدله بـ health check دوري لقاعدة البيانات يُسجَّل في الـ logs

module.exports = () => {

  // ✅ health check كل 5 دقائق
  setInterval(async () => {

    try {

      const stats = await databaseManager.stats()

      if (!stats.initialized) {
        logger.warn("DATABASE_NOT_INITIALIZED_IN_HEALTH_CHECK")
        return
      }

      // لوق تفاصيل الـ connection pool
      if (stats.waitingCount > 5) {
        logger.warn("DATABASE_POOL_HIGH_WAIT", {
          waiting: stats.waitingCount,
          idle:    stats.idleCount,
          total:   stats.totalCount
        })
      }

      logger.debug("DATABASE_HEALTH_OK", {
        idle:    stats.idleCount,
        total:   stats.totalCount,
        waiting: stats.waitingCount
      })

    } catch (error) {

      logger.error("DATABASE_HEALTH_CHECK_FAILED", {
        error: error.message
      })

    }

  }, 5 * 60 * 1000)

  logger.info("HEALTH_MONITOR_STARTED")

}
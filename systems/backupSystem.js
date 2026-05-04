const logger = require("./loggerSystem")
const databaseManager = require("../utils/databaseManager")
const scheduler = require("./schedulerSystem")

// ─────────────────────────────────────────────────────────────────
//  ملاحظة: اسم الملف "backup" تاريخي.
//  الفعلياً هذا نظام Health Monitor يفحص حالة DB connection pool
//  دورياً ويسجلها في الـ logs.
//
//  السبب: كل البيانات في PostgreSQL، فلا يوجد ملفات JSON تحتاج backup.
//  الـ backup الحقيقي يتم على مستوى Render (snapshots للـ database).
// ─────────────────────────────────────────────────────────────────

const HEALTH_CHECK_INTERVAL = 5 * 60 * 1000 // 5 دقائق

async function performHealthCheck() {

  try {

    const stats = await databaseManager.stats()

    if (!stats.initialized) {
      logger.warn("DATABASE_NOT_INITIALIZED_IN_HEALTH_CHECK")
      return
    }

    // تحذير لو الـ pool يعاني من ضغط
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

}

module.exports = () => {

  // استخدم schedulerSystem (مو setInterval خام)
  // عشان graceful shutdown يقدر يوقفه نظيف عبر scheduler.stopAll()
  scheduler.register(
    "db-health-monitor",
    HEALTH_CHECK_INTERVAL,
    performHealthCheck,
    false
  )

  logger.info("HEALTH_MONITOR_STARTED")

}
// ═══════════════════════════════════════════════════════════════════════
//  SCHEDULER SYSTEM — نظام الجدولة المركزي
//  يدير كل الـ cron jobs في مكان واحد
// ═══════════════════════════════════════════════════════════════════════

const logger = require("./loggerSystem")

const jobs = new Map()

/**
 * تسجيل job جديد
 * @param {string} name - اسم الـ job
 * @param {number} intervalMs - الفترة بالملي ثانية
 * @param {Function} fn - الدالة المطلوب تشغيلها
 * @param {boolean} runImmediately - هل تشتغل فوراً عند التسجيل؟
 */
function register(name, intervalMs, fn, runImmediately = false) {
  if (jobs.has(name)) {
    logger.warn(`SCHEDULER_JOB_ALREADY_EXISTS ${name}`)
    return
  }

  if (runImmediately) {
    fn().catch(err => logger.error(`SCHEDULER_JOB_FAILED ${name}`, { error: err.message }))
  }

  const id = setInterval(async () => {
    try {
      await fn()
    } catch (err) {
      logger.error(`SCHEDULER_JOB_FAILED ${name}`, { error: err.message })
    }
  }, intervalMs)

  jobs.set(name, { id, intervalMs, name })
  logger.success(`SCHEDULER_JOB_REGISTERED ${name} every ${intervalMs / 1000}s`)
}

/**
 * إلغاء job
 */
function unregister(name) {
  const job = jobs.get(name)
  if (!job) return
  clearInterval(job.id)
  jobs.delete(name)
  logger.warn(`SCHEDULER_JOB_UNREGISTERED ${name}`)
}

/**
 * إيقاف كل الـ jobs (للـ graceful shutdown)
 */
function stopAll() {
  const count = jobs.size
  for (const job of jobs.values()) {
    clearInterval(job.id)
  }
  jobs.clear()
  if (count > 0) {
    logger.warn(`SCHEDULER_ALL_JOBS_STOPPED ${count}`)
  }
}

/**
 * قائمة الـ jobs النشطة
 */
function list() {
  return [...jobs.values()].map(j => ({
    name: j.name,
    interval: `${j.intervalMs / 1000}s`
  }))
}

module.exports = { register, unregister, stopAll, list }
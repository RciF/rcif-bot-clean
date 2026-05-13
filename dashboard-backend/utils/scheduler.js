/**
 * ═══════════════════════════════════════════════════════════
 *  Dashboard Scheduler — Centralized Intervals
 *  كل setInterval في الداش يمر من هنا (للـ graceful shutdown)
 * ═══════════════════════════════════════════════════════════
 */

const intervals = new Map()

function register(name, intervalMs, fn, runImmediately = false) {
  if (intervals.has(name)) {
    console.warn(`[SCHEDULER] Job already exists: ${name}`)
    return
  }

  if (runImmediately) {
    try { fn() } catch (err) { console.error(`[SCHEDULER] ${name} failed:`, err.message) }
  }

  const id = setInterval(() => {
    try { fn() } catch (err) { console.error(`[SCHEDULER] ${name} failed:`, err.message) }
  }, intervalMs)

  id.unref?.()
  intervals.set(name, id)
}

function stopAll() {
  for (const id of intervals.values()) {
    clearInterval(id)
  }
  intervals.clear()
}

function list() {
  return [...intervals.keys()]
}

module.exports = { register, stopAll, list }
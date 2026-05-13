// ══════════════════════════════════════════════════════════════════
//  Unified Cache System
//  - Namespacing (مساحات منفصلة لكل نظام)
//  - Auto cleanup عبر scheduler
//  - LRU eviction (max size)
//  - إحصائيات (hits / misses / size)
// ══════════════════════════════════════════════════════════════════

const cache = new Map()
const stats = { hits: 0, misses: 0, evictions: 0 }

const DEFAULT_MAX_SIZE = 5000
let maxSize = DEFAULT_MAX_SIZE

function set(key, value, ttl = null) {
  if (cache.size >= maxSize) {
    const firstKey = cache.keys().next().value
    if (firstKey) {
      cache.delete(firstKey)
      stats.evictions++
    }
  }
  cache.set(key, {
    value,
    expires: ttl ? Date.now() + ttl : null
  })
}

function get(key) {
  const entry = cache.get(key)
  if (!entry) { stats.misses++; return null }
  if (entry.expires && Date.now() > entry.expires) {
    cache.delete(key)
    stats.misses++
    return null
  }
  stats.hits++
  return entry.value
}

function has(key) {
  const entry = cache.get(key)
  if (!entry) return false
  if (entry.expires && Date.now() > entry.expires) {
    cache.delete(key)
    return false
  }
  return true
}

function del(key) { cache.delete(key) }
function clear() { cache.clear() }

// ── Namespacing ──
// مثال: ns("ai").set("key", value, ttl)
function ns(namespace) {
  const prefix = `${namespace}:`
  return {
    set: (k, v, t) => set(prefix + k, v, t),
    get: (k) => get(prefix + k),
    has: (k) => has(prefix + k),
    del: (k) => del(prefix + k),
    clear: () => {
      for (const key of cache.keys()) {
        if (key.startsWith(prefix)) cache.delete(key)
      }
    },
    keys: () => [...cache.keys()].filter(k => k.startsWith(prefix)).map(k => k.slice(prefix.length))
  }
}

// ── Cleanup expired entries ──
function cleanupExpired() {
  const now = Date.now()
  let removed = 0
  for (const [key, entry] of cache.entries()) {
    if (entry.expires && now > entry.expires) {
      cache.delete(key)
      removed++
    }
  }
  return removed
}

function getStats() {
  const total = stats.hits + stats.misses
  return {
    size: cache.size,
    maxSize,
    hits: stats.hits,
    misses: stats.misses,
    evictions: stats.evictions,
    hitRate: total > 0 ? (stats.hits / total * 100).toFixed(1) + "%" : "0%"
  }
}

function setMaxSize(n) { maxSize = n }

// ── Auto cleanup عبر scheduler (lazy require to avoid circular) ──
try {
  const scheduler = require("../systems/schedulerSystem")
  scheduler.register("cache-cleanup", 5 * 60 * 1000, async () => {
    cleanupExpired()
  }, false)
} catch {}

module.exports = {
  set, get, has, del, clear,
  ns,
  cleanupExpired,
  getStats,
  setMaxSize
}
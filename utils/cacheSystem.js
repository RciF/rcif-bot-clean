const cache = new Map()

function set(key, value, ttl = null) {

  const entry = {
    value,
    expires: ttl ? Date.now() + ttl : null
  }

  cache.set(key, entry)
}

function get(key) {

  const entry = cache.get(key)

  if (!entry) return null

  if (entry.expires && Date.now() > entry.expires) {
    cache.delete(key)
    return null
  }

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

function del(key) {
  cache.delete(key)
}

function clear() {
  cache.clear()
}

module.exports = {
  set,
  get,
  has,
  del,
  clear
}
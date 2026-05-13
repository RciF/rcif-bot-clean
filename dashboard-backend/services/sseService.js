/**
 * ═══════════════════════════════════════════════════════════
 *  SSE Service — Real-time Event Bus
 *  المسار: dashboard-backend/services/sseService.js
 *
 *  المنطق:
 *   - كل مستخدم متصل عنده "client" مفتوح للـ SSE
 *   - الـ clients مفهرسة حسب guildId (نعرف من نبعث له)
 *   - أي مكان في الكود يقدر يبعث event بـ broadcast()
 *   - heartbeat كل 25 ثانية عشان ما ينقطع (Render يقطع بعد 60s)
 *
 *  Events المدعومة:
 *   - settings_changed   → الإعدادات اتحدثت (يعيد جلب الـ data)
 *   - member_count       → تغيّر عدد الأعضاء
 *   - notification       → تنبيه عام (Anti-Raid, ticket جديد...)
 *   - audit_entry        → سجل جديد في الـ audit log
 *   - heartbeat          → keepalive (داخلي)
 *
 *  الخطة المطلوبة: Diamond (للتوافق مع الإعلان)
 * ═══════════════════════════════════════════════════════════
 */

// ────────────────────────────────────────────────────────────
//  In-memory clients registry
//  Map<guildId, Set<{ res, userId, userAgent, connectedAt }>>
// ────────────────────────────────────────────────────────────

const clients = new Map()
const HEARTBEAT_INTERVAL = 25 * 1000 // 25s — تحت 60s limit في Render
const MAX_CLIENTS_PER_GUILD = 20 // حماية من leak

let heartbeatTimer = null

// ════════════════════════════════════════════════════════════
//  Subscribe — يضيف client جديد
// ════════════════════════════════════════════════════════════

function subscribe(guildId, userId, res, req) {
  if (!guildId || !userId || !res) return null

  // ─── Headers الخاصة بـ SSE ───
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no", // مهم لـ Nginx/Render
  })

  // Initial connection message
  res.write(`event: connected\ndata: ${JSON.stringify({ guildId, timestamp: Date.now() })}\n\n`)

  // ─── سجّل الـ client ───
  if (!clients.has(guildId)) {
    clients.set(guildId, new Set())
  }

  const guildClients = clients.get(guildId)

  // حماية من تراكم الـ clients (مستخدم عنده 50 تاب مفتوح)
  if (guildClients.size >= MAX_CLIENTS_PER_GUILD) {
    // أغلق أقدم client
    const oldest = guildClients.values().next().value
    if (oldest) {
      try { oldest.res.end() } catch {}
      guildClients.delete(oldest)
    }
  }

  const client = {
    res,
    userId,
    userAgent: req?.headers?.["user-agent"]?.slice(0, 100) || "unknown",
    connectedAt: Date.now(),
  }

  guildClients.add(client)

  // ─── شيل الـ client لما يقطع ───
  const cleanup = () => {
    guildClients.delete(client)
    if (guildClients.size === 0) {
      clients.delete(guildId)
    }
  }

  res.on("close", cleanup)
  res.on("error", cleanup)
  req?.on("close", cleanup)

  // ─── ابدأ heartbeat لو ما بدأ ───
  startHeartbeat()

  return cleanup
}

// ════════════════════════════════════════════════════════════
//  Broadcast — يبعث event لكل clients سيرفر معيّن
// ════════════════════════════════════════════════════════════

function broadcast(guildId, eventName, data = {}) {
  if (!guildId || !eventName) return 0

  const guildClients = clients.get(guildId)
  if (!guildClients || guildClients.size === 0) return 0

  const payload = `event: ${eventName}\ndata: ${JSON.stringify({
    ...data,
    _ts: Date.now(),
  })}\n\n`

  let sent = 0
  const dead = []

  for (const client of guildClients) {
    try {
      const ok = client.res.write(payload)
      if (ok) sent++
      else dead.push(client)
    } catch {
      dead.push(client)
    }
  }

  // تنظيف الموتى
  for (const d of dead) {
    guildClients.delete(d)
    try { d.res.end() } catch {}
  }

  return sent
}

// ════════════════════════════════════════════════════════════
//  Broadcast لمستخدم محدد (في سيرفر معيّن)
// ════════════════════════════════════════════════════════════

function broadcastToUser(guildId, userId, eventName, data = {}) {
  if (!guildId || !userId || !eventName) return 0

  const guildClients = clients.get(guildId)
  if (!guildClients) return 0

  const payload = `event: ${eventName}\ndata: ${JSON.stringify({
    ...data,
    _ts: Date.now(),
  })}\n\n`

  let sent = 0
  for (const client of guildClients) {
    if (client.userId !== userId) continue
    try {
      client.res.write(payload)
      sent++
    } catch {
      guildClients.delete(client)
    }
  }
  return sent
}

// ════════════════════════════════════════════════════════════
//  Heartbeat — يبعث keepalive كل 25 ثانية
// ════════════════════════════════════════════════════════════

function startHeartbeat() {
  if (heartbeatTimer) return

  heartbeatTimer = setInterval(() => {
    if (clients.size === 0) {
      stopHeartbeat()
      return
    }

    for (const [guildId, guildClients] of clients.entries()) {
      const dead = []
      for (const client of guildClients) {
        try {
          // SSE comment line — ما يطلع كـ event لكن يحافظ على الاتصال
          client.res.write(`:hb ${Date.now()}\n\n`)
        } catch {
          dead.push(client)
        }
      }
      for (const d of dead) {
        guildClients.delete(d)
        try { d.res.end() } catch {}
      }
      if (guildClients.size === 0) {
        clients.delete(guildId)
      }
    }
  }, HEARTBEAT_INTERVAL)

  // ما يمنع الـ process من الإغلاق
  if (heartbeatTimer.unref) heartbeatTimer.unref()
}

function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer)
    heartbeatTimer = null
  }
}

// ════════════════════════════════════════════════════════════
//  Stats (للـ diagnostics)
// ════════════════════════════════════════════════════════════

function getStats() {
  let totalClients = 0
  const byGuild = {}
  for (const [guildId, set] of clients.entries()) {
    byGuild[guildId] = set.size
    totalClients += set.size
  }
  return {
    totalClients,
    totalGuilds: clients.size,
    byGuild,
    heartbeatActive: heartbeatTimer !== null,
  }
}

// ════════════════════════════════════════════════════════════
//  Shutdown (للـ graceful shutdown في server.js)
// ════════════════════════════════════════════════════════════

function shutdown() {
  stopHeartbeat()
  for (const guildClients of clients.values()) {
    for (const client of guildClients) {
      try {
        client.res.write(`event: shutdown\ndata: {}\n\n`)
        client.res.end()
      } catch {}
    }
  }
  clients.clear()
}

// ════════════════════════════════════════════════════════════
//  Exports
// ════════════════════════════════════════════════════════════

module.exports = {
  subscribe,
  broadcast,
  broadcastToUser,
  getStats,
  shutdown,
}
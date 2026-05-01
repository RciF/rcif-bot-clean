/**
 * ═══════════════════════════════════════════════════════════
 *  Audit Log Middleware
 *  يسجل كل تعديل (PUT/POST/PATCH/DELETE) في dashboard_audit_log
 *
 *  الاستخدام:
 *    router.put('/welcome', requireAuth, requireGuildAdmin,
 *      auditLog('welcome.update'), handler)
 * ═══════════════════════════════════════════════════════════
 */

const { query } = require("../config/database")

/**
 * يسجل entry في الـ audit log
 *
 * @param {string} action - مثل 'welcome.update', 'protection.toggle'
 * @param {Object} options - { extractTarget?: req => string, extractOld?: req => any }
 */
function auditLog(action, options = {}) {
  return async (req, res, next) => {
    // خزن الـ old value لو فيه دالة لاستخراجها
    if (options.extractOld) {
      try {
        req._auditOldValue = await options.extractOld(req)
      } catch (err) {
        console.warn(`[AUDIT] Failed to extract old value for ${action}:`, err.message)
      }
    }

    // اعترض على الـ response عشان نسجل بعد النجاح
    const originalJson = res.json.bind(res)
    res.json = function (body) {
      // سجل فقط لو الطلب نجح (2xx)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        recordAudit({
          guild_id: req.params.guildId || req.body.guildId,
          user_id: req.user?.id,
          username: req.user?.username,
          action,
          target: options.extractTarget ? options.extractTarget(req, body) : null,
          old_value: req._auditOldValue,
          new_value: req.body,
          ip_address: getClientIp(req),
        }).catch((err) => {
          // فشل الـ audit ما يفشل الطلب
          console.error(`[AUDIT] Failed to record ${action}:`, err.message)
        })
      }

      return originalJson(body)
    }

    next()
  }
}

/**
 * يسجل entry مباشرة (بدون middleware)
 */
async function recordAudit(entry) {
  if (!entry.guild_id || !entry.user_id || !entry.action) {
    console.warn("[AUDIT] Missing required fields, skipping:", entry)
    return
  }

  try {
    await query(
      `INSERT INTO dashboard_audit_log
       (guild_id, user_id, username, action, target, old_value, new_value, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        entry.guild_id,
        entry.user_id,
        entry.username || null,
        entry.action,
        entry.target || null,
        entry.old_value ? JSON.stringify(entry.old_value) : null,
        entry.new_value ? JSON.stringify(entry.new_value) : null,
        entry.ip_address || null,
      ],
    )
  } catch (err) {
    console.error("[AUDIT] DB insert failed:", err.message)
  }
}

/**
 * يجلب آخر N سجل لسيرفر معين
 */
async function getAuditLogs(guildId, options = {}) {
  const { limit = 50, offset = 0, action, userId } = options

  let sql = `SELECT * FROM dashboard_audit_log WHERE guild_id = $1`
  const params = [guildId]

  if (action) {
    params.push(action)
    sql += ` AND action = $${params.length}`
  }

  if (userId) {
    params.push(userId)
    sql += ` AND user_id = $${params.length}`
  }

  sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`
  params.push(limit, offset)

  const r = await query(sql, params)
  return r.rows
}

/**
 * استخراج IP من الـ request (يدعم proxy)
 */
function getClientIp(req) {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.headers["x-real-ip"] ||
    req.socket?.remoteAddress ||
    null
  )
}

module.exports = {
  auditLog,
  recordAudit,
  getAuditLogs,
}

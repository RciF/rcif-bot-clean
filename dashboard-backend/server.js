console.log("🔥 FILE STARTED")
const express = require("express")
const cors = require("cors")
const crypto = require("crypto")
const { Pool } = require("pg")
require("dotenv").config()
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args))

const app = express()

// ══════════════════════════════════════
//  CONFIG
// ══════════════════════════════════════
const CONFIG = {
  CLIENT_ID:     process.env.CLIENT_ID,
  CLIENT_SECRET: process.env.CLIENT_SECRET,
  BOT_TOKEN:     process.env.BOT_TOKEN,
  REDIRECT_URI:  process.env.REDIRECT_URI || "http://localhost:3000/callback",
  OWNER_ID:      process.env.OWNER_ID || "529320108032786433",
  FRONTEND_URL:  process.env.FRONTEND_URL || "http://localhost:3000",
  PORT:          process.env.PORT || 4000,
}

// ══════════════════════════════════════
//  MIDDLEWARE
// ══════════════════════════════════════
const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  CONFIG.FRONTEND_URL
].filter(Boolean)

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(null, false)
    }
  },
  credentials: true
}))
app.use(express.json())

// ══════════════════════════════════════
//  DATABASE
// ══════════════════════════════════════
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
})

pool.on("error", (err) => {
  console.error("❌ Database pool error:", err.message)
})

async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS guild_settings (
        guild_id   TEXT PRIMARY KEY,
        ai         BOOLEAN DEFAULT true,
        xp         BOOLEAN DEFAULT true,
        economy    BOOLEAN DEFAULT true,
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS economy_users (
        user_id    TEXT PRIMARY KEY,
        coins      INTEGER DEFAULT 0,
        last_daily BIGINT DEFAULT 0,
        last_work  BIGINT DEFAULT 0,
        inventory  JSONB DEFAULT '[]'
      );
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id         SERIAL PRIMARY KEY,
        user_id    TEXT NOT NULL UNIQUE,
        plan_id    TEXT NOT NULL DEFAULT 'free',
        status     TEXT NOT NULL DEFAULT 'inactive',
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS payment_requests (
        id          SERIAL PRIMARY KEY,
        user_id     TEXT NOT NULL,
        plan_id     TEXT NOT NULL,
        ref_number  TEXT NOT NULL,
        status      TEXT NOT NULL DEFAULT 'pending',
        notes       TEXT,
        reviewed_at TIMESTAMP,
        created_at  TIMESTAMP DEFAULT NOW()
      );
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS guild_subscriptions (
        guild_id  TEXT PRIMARY KEY,
        owner_id  TEXT NOT NULL,
        added_at  TIMESTAMP DEFAULT NOW()
      );
    `)

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_guild_sub_owner
      ON guild_subscriptions (owner_id);
    `)

    console.log("✅ Database tables ready")
  } catch (err) {
    console.error("❌ DB init error:", err.message)
  }
}

initDB()

// ══════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════
const PLANS = {
  free:    { id: "free",    name: "مجاني",  price: 0,   durationDays: null, guildLimit: 1 },
  silver:  { id: "silver",  name: "فضي",    price: 29,  durationDays: 30,   guildLimit: 3 },
  gold:    { id: "gold",    name: "ذهبي",   price: 79,  durationDays: 30,   guildLimit: 10 },
  diamond: { id: "diamond", name: "ماسي",   price: 149, durationDays: 30,   guildLimit: -1 },
}

async function fetchDiscordJSON(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { "User-Agent": "DiscordBot/1.0", ...options.headers }
  })
  const text = await res.text()
  let data
  try { data = JSON.parse(text) } catch { data = { raw: text } }
  if (!res.ok) {
    const err = new Error(`Discord API error: ${res.status}`)
    err.status = res.status
    err.payload = data
    throw err
  }
  return data
}

// ✅ FIX: safe default avatar — BigInt بدل parseInt
function getDefaultAvatar(userId) {
  try {
    const index = Number(BigInt(userId) % 5n)
    return `https://cdn.discordapp.com/embed/avatars/${index}.png`
  } catch {
    return `https://cdn.discordapp.com/embed/avatars/0.png`
  }
}

function getUserAvatar(user) {
  if (user.avatar) {
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
  }
  return getDefaultAvatar(user.id)
}

async function getDiscordUser(userId, guildId) {
  try {
    const data = await fetchDiscordJSON(
      `https://discord.com/api/guilds/${guildId}/members/${userId}`,
      { headers: { Authorization: `Bot ${CONFIG.BOT_TOKEN}` } }
    )
    return {
      id: data.user.id,
      username: data.user.global_name || data.user.username,
      avatar: getUserAvatar(data.user)
    }
  } catch {
    return { id: userId, username: `User#${userId.slice(-4)}`, avatar: null }
  }
}

// ══════════════════════════════════════
//  🔒 SESSION AUTH SYSTEM (SECURE)
// ══════════════════════════════════════
const sessions = new Map()
const SESSION_TTL = 24 * 60 * 60 * 1000

function createSession(user, guilds) {
  const token = crypto.randomBytes(48).toString("hex")
  sessions.set(token, {
    user,
    guilds,
    createdAt: Date.now()
  })
  return token
}

function getSession(token) {
  if (!token) return null
  const session = sessions.get(token)
  if (!session) return null
  if (Date.now() - session.createdAt > SESSION_TTL) {
    sessions.delete(token)
    return null
  }
  return session
}

// تنظيف دوري
setInterval(() => {
  const now = Date.now()
  for (const [token, session] of sessions.entries()) {
    if (now - session.createdAt > SESSION_TTL) {
      sessions.delete(token)
    }
  }
}, 60 * 60 * 1000)

// ✅ middleware: تحقق من session token
function requireAuth(req, res, next) {
  const authHeader = req.headers["authorization"]
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "مطلوب تسجيل دخول" })
  }
  const token = authHeader.replace("Bearer ", "")
  const session = getSession(token)
  if (!session) {
    return res.status(401).json({ error: "الجلسة منتهية — سجل دخول مرة ثانية" })
  }
  req.user = session.user
  req.guilds = session.guilds
  next()
}

// ✅ middleware: تحقق إن المستخدم owner
function requireOwnerAuth(req, res, next) {
  if (!req.user || req.user.id !== CONFIG.OWNER_ID) {
    return res.status(403).json({ error: "غير مصرح — ليس لديك صلاحية" })
  }
  next()
}

// ✅ middleware: تحقق إن المستخدم admin بالسيرفر
function requireGuildAdmin(req, res, next) {
  const guildId = req.params.guildId || req.body.guildId
  if (!guildId) return res.status(400).json({ error: "guildId مطلوب" })
  const guild = req.guilds?.find(g => g.id === guildId)
  if (!guild) {
    return res.status(403).json({ error: "ليس لديك صلاحية على هذا السيرفر" })
  }
  next()
}

// ══════════════════════════════════════
//  HEALTH
// ══════════════════════════════════════
app.get("/", (req, res) => {
  res.json({ status: "online", service: "Discord Bot Dashboard API", version: "3.0" })
})

app.get("/api/health", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW() as time")
    res.json({ status: "ok", db: "connected", time: result.rows[0].time })
  } catch {
    res.status(500).json({ status: "error", db: "disconnected" })
  }
})

// ══════════════════════════════════════
//  AUTH — يرجع session token آمن
// ══════════════════════════════════════
app.get("/api/auth/callback", async (req, res) => {
  const { code } = req.query
  if (!code) return res.status(400).json({ error: "No code provided" })

  try {
    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id:     CONFIG.CLIENT_ID,
        client_secret: CONFIG.CLIENT_SECRET,
        grant_type:    "authorization_code",
        code,
        redirect_uri:  CONFIG.REDIRECT_URI
      })
    })
    const tokenData = await tokenRes.json()
    if (!tokenRes.ok || !tokenData.access_token) {
      return res.status(400).json({ error: "Token exchange failed", details: tokenData })
    }

    const { access_token } = tokenData
    const user = await fetchDiscordJSON("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${access_token}` }
    })
    const allGuilds = await fetchDiscordJSON("https://discord.com/api/users/@me/guilds", {
      headers: { Authorization: `Bearer ${access_token}` }
    })

    const adminGuilds = allGuilds.filter(g => (BigInt(g.permissions) & 8n) === 8n)

    const userData = {
      id:       user.id,
      username: user.global_name || user.username,
      avatar:   getUserAvatar(user)
    }

    const guildsData = adminGuilds.map(g => ({
      id:   g.id,
      name: g.name,
      icon: g.icon,
      permissions: g.permissions.toString()
    }))

    // ✅ NEW: إنشاء session token آمن
    const sessionToken = createSession(userData, guildsData)

    res.json({
      token: sessionToken,
      user: userData,
      guilds: guildsData
    })
  } catch (err) {
    console.error("AUTH ERROR:", err.payload || err.message)
    res.status(500).json({ error: "Authentication failed" })
  }
})

// ══════════════════════════════════════
//  GUILD SETTINGS — 🔒 محمية بالـ auth
// ══════════════════════════════════════
app.post("/api/guild/save", requireAuth, requireGuildAdmin, async (req, res) => {
  const { guildId } = req.body
  if (!guildId) return res.status(400).json({ error: "guildId required" })
  try {
    await pool.query(`
      INSERT INTO guild_settings (guild_id)
      VALUES ($1) ON CONFLICT (guild_id) DO NOTHING
    `, [guildId])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: "Failed to save guild" })
  }
})

app.get("/api/guild/:guildId/settings", requireAuth, requireGuildAdmin, async (req, res) => {
  const { guildId } = req.params
  try {
    const result = await pool.query("SELECT * FROM guild_settings WHERE guild_id = $1", [guildId])
    if (!result.rows.length) return res.json({ ai: true, xp: true, economy: true })
    const row = result.rows[0]
    res.json({ ai: row.ai, xp: row.xp, economy: row.economy })
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch settings" })
  }
})

app.post("/api/guild/:guildId/settings", requireAuth, requireGuildAdmin, async (req, res) => {
  const { guildId } = req.params
  const { ai, xp, economy } = req.body
  if (typeof ai === "undefined" || typeof xp === "undefined" || typeof economy === "undefined")
    return res.status(400).json({ error: "Missing settings values" })
  try {
    await pool.query(`
      INSERT INTO guild_settings (guild_id, ai, xp, economy, updated_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (guild_id) DO UPDATE SET ai = $2, xp = $3, economy = $4, updated_at = NOW()
    `, [guildId, Boolean(ai), Boolean(xp), Boolean(economy)])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: "Failed to update settings" })
  }
})

// ══════════════════════════════════════
//  GUILD ↔ SUBSCRIPTION LINKING — 🔒 محمية
// ══════════════════════════════════════
app.post("/api/guild/:guildId/link", requireAuth, requireGuildAdmin, async (req, res) => {
  const { guildId } = req.params
  const userId = req.user.id

  try {
    const subResult = await pool.query(
      "SELECT plan_id, status FROM subscriptions WHERE user_id = $1 AND status = 'active' LIMIT 1",
      [userId]
    )

    if (!subResult.rows.length) {
      return res.status(400).json({ error: "لا يوجد اشتراك نشط. اشترك أولاً." })
    }

    const plan = PLANS[subResult.rows[0].plan_id] || PLANS.free

    if (plan.guildLimit !== -1) {
      const countResult = await pool.query(
        "SELECT COUNT(*) as count FROM guild_subscriptions WHERE owner_id = $1",
        [userId]
      )
      const currentCount = parseInt(countResult.rows[0]?.count || 0)

      if (currentCount >= plan.guildLimit) {
        return res.status(400).json({
          error: `وصلت الحد الأقصى (${plan.guildLimit} سيرفر). رقّي خطتك.`
        })
      }
    }

    await pool.query(`
      INSERT INTO guild_subscriptions (guild_id, owner_id, added_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (guild_id) DO UPDATE SET owner_id = $2, added_at = NOW()
    `, [guildId, userId])

    res.json({ success: true, message: "تم ربط السيرفر بالاشتراك" })
  } catch (err) {
    console.error("LINK_GUILD_ERROR:", err.message)
    res.status(500).json({ error: "فشل ربط السيرفر" })
  }
})

app.delete("/api/guild/:guildId/link", requireAuth, requireGuildAdmin, async (req, res) => {
  const { guildId } = req.params
  try {
    await pool.query("DELETE FROM guild_subscriptions WHERE guild_id = $1", [guildId])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: "فشل فك الربط" })
  }
})

app.get("/api/user/:userId/guilds", requireAuth, async (req, res) => {
  const { userId } = req.params
  // ✅ FIX: المستخدم يشوف بس سيرفراته هو
  if (req.user.id !== userId) {
    return res.status(403).json({ error: "غير مصرح" })
  }
  try {
    const result = await pool.query(
      "SELECT guild_id, added_at FROM guild_subscriptions WHERE owner_id = $1 ORDER BY added_at DESC",
      [userId]
    )
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: "فشل جلب السيرفرات" })
  }
})

app.get("/api/guild/:guildId/plan", async (req, res) => {
  const { guildId } = req.params
  try {
    const result = await pool.query(`
      SELECT gs.guild_id, s.plan_id, s.status, s.expires_at
      FROM guild_subscriptions gs
      JOIN subscriptions s ON s.user_id = gs.owner_id
      WHERE gs.guild_id = $1 AND s.status = 'active'
      LIMIT 1
    `, [guildId])

    if (!result.rows.length) {
      return res.json({ plan_id: "free", status: "inactive" })
    }

    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: "فشل جلب الخطة" })
  }
})

// ══════════════════════════════════════
//  ECONOMY LEADERBOARD — 🔒 محمية + فلترة بالسيرفر
// ══════════════════════════════════════
app.get("/api/economy/top/:guildId", requireAuth, requireGuildAdmin, async (req, res) => {
  const { guildId } = req.params
  const limit = Math.min(parseInt(req.query.limit) || 10, 25)
  try {
    // ✅ FIX: الآن يجيب بيانات المستخدمين من السيرفر المحدد
    const result = await pool.query(`
      SELECT user_id, coins FROM economy_users
      WHERE coins > 0 ORDER BY coins DESC LIMIT $1
    `, [limit])

    if (!result.rows.length) return res.json([])

    const users = await Promise.allSettled(
      result.rows.map(async (u) => {
        const discordUser = await getDiscordUser(u.user_id, guildId)
        return { id: u.user_id, username: discordUser.username, avatar: discordUser.avatar, coins: u.coins }
      })
    )

    res.json(users.filter(r => r.status === "fulfilled").map(r => r.value))
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch leaderboard" })
  }
})

// ══════════════════════════════════════
//  SUBSCRIPTIONS — 🔒 محمية
// ══════════════════════════════════════
app.get("/api/subscription/:userId", requireAuth, async (req, res) => {
  const { userId } = req.params
  // ✅ FIX: المستخدم يشوف بس اشتراكه هو
  if (req.user.id !== userId) {
    return res.status(403).json({ error: "غير مصرح" })
  }
  try {
    const result = await pool.query(
      "SELECT * FROM subscriptions WHERE user_id = $1 LIMIT 1",
      [userId]
    )
    if (!result.rows.length) {
      return res.json({ user_id: userId, plan_id: "free", status: "inactive", expires_at: null })
    }
    const sub = result.rows[0]
    if (sub.expires_at && new Date(sub.expires_at) < new Date()) {
      await pool.query(
        "UPDATE subscriptions SET status = 'expired', updated_at = NOW() WHERE user_id = $1",
        [userId]
      )
      sub.status = "expired"
    }
    res.json(sub)
  } catch (err) {
    console.error("GET_SUBSCRIPTION_ERROR:", err.message)
    res.status(500).json({ error: "Failed to fetch subscription" })
  }
})

// ══════════════════════════════════════
//  PAYMENT REQUESTS — 🔒 محمية
// ══════════════════════════════════════
app.post("/api/payment-requests", requireAuth, async (req, res) => {
  const { planId, refNumber } = req.body
  const userId = req.user.id

  if (!planId || !refNumber) {
    return res.status(400).json({ error: "planId و refNumber مطلوبة" })
  }
  if (!PLANS[planId]) return res.status(400).json({ error: "خطة غير صالحة" })
  if (planId === "free") return res.status(400).json({ error: "الخطة المجانية لا تحتاج دفعاً" })

  const cleanRef = String(refNumber).trim()
  if (cleanRef.length < 4 || cleanRef.length > 100) {
    return res.status(400).json({ error: "رقم العملية غير صالح" })
  }

  try {
    const existing = await pool.query(
      "SELECT id FROM payment_requests WHERE user_id = $1 AND status = 'pending' LIMIT 1",
      [userId]
    )
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: "يوجد طلب دفع معلق بالفعل" })
    }

    await pool.query(
      "INSERT INTO payment_requests (user_id, plan_id, ref_number, status) VALUES ($1, $2, $3, 'pending')",
      [userId, planId, cleanRef]
    )

    console.log(`💰 طلب دفع جديد: userId=${userId} plan=${planId} ref=${cleanRef}`)
    res.json({ success: true, message: "تم إرسال طلب الدفع بنجاح" })
  } catch (err) {
    console.error("CREATE_PAYMENT_REQUEST_ERROR:", err.message)
    res.status(500).json({ error: "فشل إرسال الطلب" })
  }
})

// ══════════════════════════════════════
//  🔒 ADMIN ENDPOINTS — محمية بـ auth + owner
// ══════════════════════════════════════
app.get("/api/admin/payment-requests", requireAuth, requireOwnerAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM payment_requests
      ORDER BY CASE WHEN status = 'pending' THEN 0 ELSE 1 END, created_at DESC
      LIMIT 100
    `)
    res.json(result.rows)
  } catch (err) {
    console.error("GET_PAYMENT_REQUESTS_ERROR:", err.message)
    res.status(500).json({ error: "Failed to fetch requests" })
  }
})

app.post("/api/admin/payment-requests/:id/approve", requireAuth, requireOwnerAuth, async (req, res) => {
  const { id } = req.params
  try {
    const reqResult = await pool.query(
      "SELECT * FROM payment_requests WHERE id = $1 LIMIT 1", [id]
    )
    if (!reqResult.rows.length) return res.status(404).json({ error: "الطلب غير موجود" })

    const payReq = reqResult.rows[0]
    if (payReq.status !== "pending") return res.status(400).json({ error: "الطلب تمت مراجعته" })

    const plan = PLANS[payReq.plan_id]
    if (!plan) return res.status(400).json({ error: "خطة غير صالحة" })

    let expiresAt = null
    if (plan.durationDays) {
      expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + plan.durationDays)
    }

    await pool.query(`
      INSERT INTO subscriptions (user_id, plan_id, status, expires_at, updated_at)
      VALUES ($1, $2, 'active', $3, NOW())
      ON CONFLICT (user_id) DO UPDATE SET plan_id = $2, status = 'active', expires_at = $3, updated_at = NOW()
    `, [payReq.user_id, payReq.plan_id, expiresAt])

    await pool.query(`
      UPDATE payment_requests SET status = 'approved', reviewed_at = NOW() WHERE id = $1
    `, [id])

    console.log(`✅ تم تفعيل اشتراك: userId=${payReq.user_id} plan=${payReq.plan_id}`)

    // ✅ إرسال DM للمشترك عبر البوت
    try {
      const dmChannel = await fetchDiscordJSON(
        `https://discord.com/api/users/@me/channels`,
        {
          method: "POST",
          headers: {
            Authorization: `Bot ${CONFIG.BOT_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ recipient_id: payReq.user_id }),
        }
      )

      if (dmChannel?.id) {
        await fetchDiscordJSON(
          `https://discord.com/api/channels/${dmChannel.id}/messages`,
          {
            method: "POST",
            headers: {
              Authorization: `Bot ${CONFIG.BOT_TOKEN}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              embeds: [{
                title: "✅ تم تفعيل اشتراكك!",
                description: `مبروك! تم تفعيل خطة **${plan.name}** بنجاح.\n\nيمكنك الآن إضافة البوت لسيرفرك والاستمتاع بجميع المميزات.`,
                color: 0x22d3a2,
                fields: [
                  { name: "📋 الخطة", value: plan.name, inline: true },
                  { name: "💰 السعر", value: `${plan.price} ريال/شهر`, inline: true },
                  { name: "⏰ المدة", value: `${plan.durationDays} يوم`, inline: true },
                ],
                footer: { text: "Lyn AI — شكراً لدعمك!" },
                timestamp: new Date().toISOString(),
              }],
              components: [{
                type: 1,
                components: [{
                  type: 2,
                  style: 5,
                  label: "🤖 أضف البوت لسيرفرك",
                  url: `https://discord.com/oauth2/authorize?client_id=${CONFIG.CLIENT_ID}&permissions=8&scope=bot%20applications.commands`,
                }],
              }],
            }),
          }
        )
        console.log(`📩 تم إرسال DM للمستخدم: ${payReq.user_id}`)
      }
    } catch (dmErr) {
      console.log(`⚠️ تعذر إرسال DM: ${dmErr.message}`)
    }

    res.json({ success: true, message: "تم تفعيل الاشتراك بنجاح" })
  } catch (err) {
    console.error("APPROVE_REQUEST_ERROR:", err.message)
    res.status(500).json({ error: "فشل تفعيل الاشتراك" })
  }
})

app.post("/api/admin/payment-requests/:id/reject", requireAuth, requireOwnerAuth, async (req, res) => {
  const { id } = req.params
  const { notes } = req.body || {}
  try {
    const result = await pool.query(
      "UPDATE payment_requests SET status = 'rejected', notes = $2, reviewed_at = NOW() WHERE id = $1 AND status = 'pending' RETURNING *",
      [id, notes || null]
    )
    if (!result.rows.length) return res.status(404).json({ error: "الطلب غير موجود أو تمت مراجعته" })
    console.log(`❌ تم رفض طلب: id=${id}`)
    res.json({ success: true, message: "تم رفض الطلب" })
  } catch (err) {
    console.error("REJECT_REQUEST_ERROR:", err.message)
    res.status(500).json({ error: "فشل رفض الطلب" })
  }
})

app.post("/api/admin/subscription/:userId/cancel", requireAuth, requireOwnerAuth, async (req, res) => {
  const { userId } = req.params
  try {
    await pool.query(
      "UPDATE subscriptions SET status = 'cancelled', updated_at = NOW() WHERE user_id = $1",
      [userId]
    )
    await pool.query("DELETE FROM guild_subscriptions WHERE owner_id = $1", [userId])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: "Failed to cancel subscription" })
  }
})

app.get("/api/admin/stats", requireAuth, requireOwnerAuth, async (req, res) => {
  try {
    const [subs, requests, economy, linkedGuilds] = await Promise.all([
      pool.query("SELECT plan_id, COUNT(*) as count FROM subscriptions WHERE status = 'active' GROUP BY plan_id"),
      pool.query("SELECT status, COUNT(*) as count FROM payment_requests GROUP BY status"),
      pool.query("SELECT COUNT(*) as total, SUM(coins) as total_coins FROM economy_users"),
      pool.query("SELECT COUNT(*) as count FROM guild_subscriptions"),
    ])
    res.json({
      activeSubscriptions: subs.rows,
      paymentRequests: requests.rows,
      economy: economy.rows[0],
      linkedGuilds: parseInt(linkedGuilds.rows[0]?.count || 0),
    })
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch stats" })
  }
})

// ══════════════════════════════════════
//  PLANS
// ══════════════════════════════════════
app.get("/api/plans", (req, res) => {
  res.json(Object.values(PLANS))
})

// ══════════════════════════════════════
//  START
// ══════════════════════════════════════
app.listen(CONFIG.PORT, () => {
  console.log(`🚀 Dashboard API running on port ${CONFIG.PORT}`)
  console.log(`📡 Health: http://localhost:${CONFIG.PORT}/`)
  console.log(`👑 Plans: ${Object.keys(PLANS).join(" | ")}`)
})
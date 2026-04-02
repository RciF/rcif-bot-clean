const express = require("express")
const cors = require("cors")
const { Pool } = require("pg")
require("dotenv").config()

const app = express()
app.use(cors())
app.use(express.json())

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

// ✅ إنشاء الجدول تلقائيًا
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS guild_settings (
        guild_id TEXT PRIMARY KEY
      );
    `)
    console.log("✅ guild_settings table ready")
  } catch (err) {
    console.error("❌ DB init error:", err)
  }
}
initDB()

// ✅ helper: جلب بيانات المستخدم من السيرفر (مو users endpoint)
async function getUserData(userId, guildId) {
  try {
    const res = await fetch(
      `https://discord.com/api/guilds/${guildId}/members/${userId}`,
      {
        headers: {
          Authorization: `Bot ${process.env.BOT_TOKEN}`
        }
      }
    )

    const data = await res.json()

    if (!data.user) throw new Error("User not found")

    return {
      id: data.user.id,
      username: data.user.username,
      avatar: data.user.avatar
        ? `https://cdn.discordapp.com/avatars/${data.user.id}/${data.user.avatar}.png`
        : null
    }
  } catch (err) {
    return {
      id: userId,
      username: userId,
      avatar: null
    }
  }
}

// health
app.get("/", (req, res) => {
  res.json({ status: "API Connected" })
})

// ✅ leaderboard (مع أسماء وصور)
app.get("/api/economy/top", async (req, res) => {
  try {
    const guildId = "1377712091238109254" // ✅ ثابت

    const result = await pool.query(`
      SELECT user_id, coins
      FROM economy_users
      ORDER BY coins DESC
      LIMIT 10
    `)

    const users = await Promise.all(
      result.rows.map(async (u) => {
        const discordUser = await getUserData(u.user_id, guildId)

        return {
          id: u.user_id,
          username: discordUser.username,
          avatar: discordUser.avatar,
          coins: u.coins
        }
      })
    )

    res.json(users)

  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "Database error" })
  }
})

// 🔐 OAuth callback (بدون تغيير)
app.get("/api/auth/callback", async (req, res) => {
  try {

    const code = req.query.code
    if (!code) return res.status(400).json({ error: "No code" })

    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: process.env.REDIRECT_URI
      })
    })

    const tokenData = await tokenRes.json()
    const access_token = tokenData.access_token

    if (!access_token) {
      return res.status(400).json({ error: "Token failed", tokenData })
    }

    const userRes = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${access_token}` }
    })
    const user = await userRes.json()

    const guildRes = await fetch("https://discord.com/api/users/@me/guilds", {
      headers: { Authorization: `Bearer ${access_token}` }
    })
    const guilds = await guildRes.json()

    res.json({
      user: {
        id: user.id,
        username: user.username,
        avatar: user.avatar
          ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
          : null
      },
      guilds
    })

  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "OAuth error" })
  }
})

// 💾 حفظ السيرفر المختار (بدون تغيير)
app.post("/api/guild/save", async (req, res) => {
  try {

    const { guildId } = req.body

    if (!guildId) {
      return res.status(400).json({ error: "No guildId" })
    }

    await pool.query(`
      INSERT INTO guild_settings (guild_id)
      VALUES ($1)
      ON CONFLICT (guild_id) DO NOTHING
    `, [guildId])

    res.json({ success: true })

  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Save failed" })
  }
})

const PORT = 4000
app.listen(PORT, () => {
  console.log(`🚀 Dashboard API running on port ${PORT}`)
})
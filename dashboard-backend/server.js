console.log("🔥 FILE STARTED")
const express = require("express")
const cors    = require("cors")
const crypto  = require("crypto")
const { Pool }= require("pg")
require("dotenv").config()
const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args))

const app = express()

const CONFIG = {
  CLIENT_ID:    process.env.CLIENT_ID,
  CLIENT_SECRET:process.env.CLIENT_SECRET,
  BOT_TOKEN:    process.env.BOT_TOKEN,
  REDIRECT_URI: process.env.REDIRECT_URI  || "http://localhost:3000/callback",
  OWNER_ID:     process.env.OWNER_ID      || "529320108032786433",
  FRONTEND_URL: process.env.FRONTEND_URL  || "http://localhost:3000",
  PORT:         process.env.PORT          || 4000,
}

const allowedOrigins = ["http://localhost:3000","http://127.0.0.1:3000",CONFIG.FRONTEND_URL].filter(Boolean)
app.use(cors({
  origin:(origin,cb)=>(!origin||allowedOrigins.includes(origin))?cb(null,true):cb(null,false),
  credentials:true
}))
app.use(express.json())

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV==="production"?{rejectUnauthorized:false}:false
})
pool.on("error",(err)=>console.error("❌ DB pool error:",err.message))

async function initDB() {
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS guild_settings(
      guild_id TEXT PRIMARY KEY, ai BOOLEAN DEFAULT true,
      xp BOOLEAN DEFAULT true, economy BOOLEAN DEFAULT true, updated_at TIMESTAMP DEFAULT NOW()
    );`)
    await pool.query(`CREATE TABLE IF NOT EXISTS economy_users(
      user_id TEXT PRIMARY KEY, coins INTEGER DEFAULT 0,
      last_daily BIGINT DEFAULT 0, last_work BIGINT DEFAULT 0, inventory JSONB DEFAULT '[]'
    );`)
    await pool.query(`CREATE TABLE IF NOT EXISTS subscriptions(
      id SERIAL PRIMARY KEY, user_id TEXT NOT NULL UNIQUE,
      plan_id TEXT NOT NULL DEFAULT 'free', status TEXT NOT NULL DEFAULT 'inactive',
      expires_at TIMESTAMP, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
    );`)
    await pool.query(`CREATE TABLE IF NOT EXISTS payment_requests(
      id SERIAL PRIMARY KEY, user_id TEXT NOT NULL, plan_id TEXT NOT NULL,
      ref_number TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending',
      notes TEXT, reviewed_at TIMESTAMP, created_at TIMESTAMP DEFAULT NOW()
    );`)
    await pool.query(`CREATE TABLE IF NOT EXISTS guild_subscriptions(
      guild_id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, added_at TIMESTAMP DEFAULT NOW()
    );`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_guild_sub_owner ON guild_subscriptions(owner_id);`)
    await pool.query(`CREATE TABLE IF NOT EXISTS guild_command_settings(
      guild_id TEXT NOT NULL, command_name TEXT NOT NULL, custom_name TEXT,
      enabled BOOLEAN DEFAULT true, updated_at TIMESTAMP DEFAULT NOW(),
      PRIMARY KEY(guild_id,command_name)
    );`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_cmd_guild ON guild_command_settings(guild_id);`)
    await pool.query(`CREATE TABLE IF NOT EXISTS guild_prefix_settings(
      guild_id TEXT PRIMARY KEY, prefix TEXT NOT NULL DEFAULT '!', updated_at TIMESTAMP DEFAULT NOW()
    );`)
    await pool.query(`CREATE TABLE IF NOT EXISTS analytics(
      command TEXT PRIMARY KEY, count INTEGER DEFAULT 0
    );`)
    await pool.query(`CREATE TABLE IF NOT EXISTS guild_analytics(
      id SERIAL PRIMARY KEY, guild_id TEXT NOT NULL, command TEXT NOT NULL,
      used_at DATE DEFAULT CURRENT_DATE, count INTEGER DEFAULT 1,
      UNIQUE(guild_id,command,used_at)
    );`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_ga_guild ON guild_analytics(guild_id);`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_ga_date  ON guild_analytics(used_at);`)
    console.log("✅ Database tables ready")
  } catch(err) { console.error("❌ DB init error:",err.message) }
}
initDB()

// ══════════════════════════════════════
//  PLANS
// ══════════════════════════════════════
const PLANS = {
  free:   { id:"free",    name:"مجاني", price:0,   durationDays:null, guildLimit:1, ai_limit:0,
    features:["الإشراف الكامل","معلومات السيرفر","أوامر أساسية"] },
  silver: { id:"silver",  name:"فضي",   price:29,  durationDays:30,   guildLimit:1, ai_limit:0,
    features:["كل مميزات المجاني","نظام الترحيب والوداع","السجلات (لوق) كامل","Reaction Roles + لوحة الرتب","إحصائيات السيرفر","XP والمستويات كامل","تغيير أسماء الأوامر","بريفكس مخصص"] },
  gold:   { id:"gold",    name:"ذهبي",  price:79,  durationDays:30,   guildLimit:1, ai_limit:300,
    features:["كل مميزات الفضي","الاقتصاد الكامل","نظام التذاكر","الفعاليات","الحماية (Anti-Spam/Raid/Nuke)","ذكاء اصطناعي 300 رسالة/يوم"] },
  diamond:{ id:"diamond", name:"ماسي",  price:149, durationDays:30,   guildLimit:1, ai_limit:700,
    features:["جميع المميزات","ذكاء اصطناعي 700 رسالة/يوم","إحصائيات متقدمة في الداشبورد","أولوية دعم قصوى"] },
}

// ══════════════════════════════════════
//  ALL COMMANDS — 86 أمر كامل
//  كل subcommand = أمر مستقل قابل للتعطيل وتغيير الاسم
// ══════════════════════════════════════
const ALL_COMMANDS = [

  // ══ الإشراف — free (15 أمر) ══
  { name:"حظر",              category:"moderation", plan:"free",    description:"حظر عضو من السيرفر نهائياً" },
  { name:"طرد",              category:"moderation", plan:"free",    description:"طرد عضو من السيرفر" },
  { name:"تحذير",            category:"moderation", plan:"free",    description:"إعطاء تحذير لعضو مع مستوى خطورة" },
  { name:"التحذيرات",        category:"moderation", plan:"free",    description:"عرض تحذيرات عضو محدد أو كل الأعضاء المحذرين" },
  { name:"مسح_التحذيرات",    category:"moderation", plan:"free",    description:"مسح تحذير محدد أو جميع تحذيرات عضو" },
  { name:"اسكت",             category:"moderation", plan:"free",    description:"كتم عضو لمدة محددة (Timeout)" },
  { name:"فك_الكتم",         category:"moderation", plan:"free",    description:"فك الكتم (Timeout) لعضو مكتوم" },
  { name:"فك_الحظر",         category:"moderation", plan:"free",    description:"فك حظر عضو من السيرفر" },
  { name:"مسح",              category:"moderation", plan:"free",    description:"مسح رسائل من القناة مع فلاتر متقدمة" },
  { name:"لقب",              category:"moderation", plan:"free",    description:"تغيير أو إزالة لقب عضو" },
  { name:"بطيء",             category:"moderation", plan:"free",    description:"تفعيل أو تعطيل السلو مود في القناة" },
  { name:"قفل",              category:"moderation", plan:"free",    description:"قفل قناة ومنع الأعضاء من الكتابة" },
  { name:"فتح",              category:"moderation", plan:"free",    description:"فتح قناة مقفلة" },
  { name:"رتبة",             category:"moderation", plan:"free",    description:"إعطاء أو سحب رتبة من عضو أو مجموعة" },
  { name:"ضبط_لوق",          category:"moderation", plan:"free",    description:"تحديد قناة اللوق لأحداث الإشراف" },

  // ══ السجلات — silver (7 أوامر) ══
  { name:"لوق ضبط",          category:"logs",       plan:"silver",  description:"تحديد قناة لتسجيل حدث معين" },
  { name:"لوق تفعيل",        category:"logs",       plan:"silver",  description:"تفعيل نظام السجلات بالكامل" },
  { name:"لوق إيقاف",        category:"logs",       plan:"silver",  description:"إيقاف نظام السجلات بالكامل" },
  { name:"لوق حالة",         category:"logs",       plan:"silver",  description:"عرض حالة نظام السجلات" },
  { name:"لوق الكل",         category:"logs",       plan:"silver",  description:"إرسال جميع الأحداث في قناة واحدة" },
  { name:"لوق مسح",          category:"logs",       plan:"silver",  description:"مسح جميع إعدادات السجلات" },
  { name:"لوق إزالة",        category:"logs",       plan:"silver",  description:"إيقاف تسجيل حدث معين" },

  // ══ الحماية — gold (7 أوامر) ══
  { name:"حماية حالة",       category:"protection", plan:"gold",    description:"عرض إعدادات الحماية الحالية" },
  { name:"حماية سبام",       category:"protection", plan:"gold",    description:"إعداد نظام Anti-Spam" },
  { name:"حماية رايد",       category:"protection", plan:"gold",    description:"إعداد نظام Anti-Raid" },
  { name:"حماية نيوك",       category:"protection", plan:"gold",    description:"إعداد نظام Anti-Nuke" },
  { name:"حماية لوكداون",    category:"protection", plan:"gold",    description:"تفعيل أو إيقاف Lockdown يدوياً" },
  { name:"حماية لوق",        category:"protection", plan:"gold",    description:"تحديد قناة سجل الحماية" },
  { name:"حماية وايتلست",    category:"protection", plan:"gold",    description:"إضافة أو إزالة مستخدم/رتبة من القائمة البيضاء" },

  // ══ الترحيب — silver (5 أوامر) ══
  { name:"ترحيب ضبط",        category:"welcome",    plan:"silver",  description:"ضبط إعدادات الترحيب" },
  { name:"ترحيب تفعيل",      category:"welcome",    plan:"silver",  description:"تفعيل نظام الترحيب" },
  { name:"ترحيب إيقاف",      category:"welcome",    plan:"silver",  description:"إيقاف نظام الترحيب" },
  { name:"ترحيب حالة",       category:"welcome",    plan:"silver",  description:"عرض الإعدادات الحالية للترحيب" },
  { name:"ترحيب اختبار",     category:"welcome",    plan:"silver",  description:"اختبار رسالة الترحيب" },

  // ══ التذاكر — gold (3 أوامر) ══
  { name:"تذاكر إعداد",      category:"tickets",    plan:"gold",    description:"إعداد نظام التذاكر وإرسال رسالة فتح التذاكر" },
  { name:"تذاكر إعدادات",    category:"tickets",    plan:"gold",    description:"تعديل إعدادات نظام التذاكر" },
  { name:"تذاكر معلومات",    category:"tickets",    plan:"gold",    description:"عرض إعدادات وإحصائيات نظام التذاكر" },

  // ══ الرتب — silver (10 أوامر) ══
  { name:"reaction-role إعداد",  category:"roles",  plan:"silver",  description:"ربط إيموجي برتبة على رسالة معينة" },
  { name:"reaction-role حذف",    category:"roles",  plan:"silver",  description:"حذف ربط إيموجي من رسالة" },
  { name:"reaction-role عرض",    category:"roles",  plan:"silver",  description:"عرض كل Reaction Roles في السيرفر" },
  { name:"reaction-role مسح",    category:"roles",  plan:"silver",  description:"مسح كل Reaction Roles على رسالة معينة" },
  { name:"لوحة-رتب إنشاء",      category:"roles",  plan:"silver",  description:"إنشاء لوحة رتب جديدة بالأزرار" },
  { name:"لوحة-رتب إضافة",      category:"roles",  plan:"silver",  description:"إضافة زر رتبة للوحة" },
  { name:"لوحة-رتب تعديل",      category:"roles",  plan:"silver",  description:"تعديل لوحة رتب موجودة" },
  { name:"لوحة-رتب حذف-زر",     category:"roles",  plan:"silver",  description:"حذف زر رتبة من لوحة" },
  { name:"لوحة-رتب قائمة",      category:"roles",  plan:"silver",  description:"عرض كل لوحات الرتب" },
  { name:"لوحة-رتب مسح",        category:"roles",  plan:"silver",  description:"حذف لوحة رتب بالكامل" },

  // ══ XP والمستويات — silver (6 أوامر) ══
  { name:"مستوى",                category:"xp",     plan:"silver",  description:"عرض بطاقة XP ومستواك وتقدمك" },
  { name:"متصدرين_xp",           category:"xp",     plan:"silver",  description:"عرض أكثر الأعضاء نشاطاً في السيرفر" },
  { name:"تسطيل_xp اعدادات",     category:"xp",     plan:"silver",  description:"إعدادات XP العامة (تفعيل/إيقاف/كسب)" },
  { name:"تسطيل_xp حالة",        category:"xp",     plan:"silver",  description:"الحالة الحالية للسيرفر — عرض إعدادات XP" },
  { name:"تسطيل_xp قناة_الصعود", category:"xp",     plan:"silver",  description:"تحديد القناة التي تُرسل فيها رسائل الصعود للمستوى" },
  { name:"تسطيل_xp مضاعف",       category:"xp",     plan:"silver",  description:"ضبط مضاعف XP لجميع الأعضاء" },

  // ══ الاقتصاد — gold (9 أوامر) ══
  { name:"متجر",                 category:"economy", plan:"gold",   description:"تصفح المتجر وشراء العناصر والسيارات والعقارات" },
  { name:"شراء",                 category:"economy", plan:"gold",   description:"شراء عنصر من المتجر (سيارة، عقار، بنية تحتية)" },
  { name:"بيع",                  category:"economy", plan:"gold",   description:"بيع عنصر من ممتلكاتك بـ 60% من سعره" },
  { name:"رصيد",                 category:"economy", plan:"gold",   description:"عرض رصيدك وثروتك وممتلكاتك" },
  { name:"يومي",                 category:"economy", plan:"gold",   description:"استلام مكافأتك اليومية 500-750 كوين" },
  { name:"عمل",                  category:"economy", plan:"gold",   description:"اشتغل واكسب كوينز من 18 وظيفة عشوائية" },
  { name:"تحويل",                category:"economy", plan:"gold",   description:"تحويل كوينز لعضو آخر" },
  { name:"ممتلكاتي",             category:"economy", plan:"gold",   description:"عرض جميع ممتلكاتك (سيارات، عقارات، بنية تحتية)" },
  { name:"متصدرين",              category:"economy", plan:"gold",   description:"عرض المتصدرين (أغنى الأعضاء) 3 أنواع" },

  // ══ الفعاليات — gold (8 أوامر) ══
  { name:"فعالية إنشاء",         category:"events",  plan:"gold",   description:"إنشاء فعالية جديدة في السيرفر" },
  { name:"فعالية عرض",           category:"events",  plan:"gold",   description:"عرض فعالية محددة" },
  { name:"فعالية قائمة",         category:"events",  plan:"gold",   description:"عرض الفعاليات القادمة في السيرفر" },
  { name:"فعالية إلغاء",         category:"events",  plan:"gold",   description:"إلغاء فعالية (للمنشئ أو الأدمن)" },
  { name:"فعالية بدء",           category:"events",  plan:"gold",   description:"تفعيل الفعالية (جارية الآن)" },
  { name:"فعالية إنهاء",         category:"events",  plan:"gold",   description:"إنهاء فعالية جارية" },
  { name:"فعالية حضور",          category:"events",  plan:"gold",   description:"عرض قائمة المسجلين في فعالية" },
  { name:"فعالية تذكير",         category:"events",  plan:"gold",   description:"إرسال تذكير لجميع المسجلين في فعالية" },

  // ══ الإحصائيات — silver (6 أوامر) ══
  { name:"إحصائيات إضافة",       category:"stats",   plan:"silver", description:"إضافة قناة إحصائية واحدة" },
  { name:"إحصائيات تلقائي",      category:"stats",   plan:"silver", description:"إنشاء كل قنوات الإحصائيات تلقائياً في كاتيجوري جديدة" },
  { name:"إحصائيات حالة",        category:"stats",   plan:"silver", description:"عرض الإحصائيات الحالية للسيرفر" },
  { name:"إحصائيات حذف",         category:"stats",   plan:"silver", description:"حذف قناة إحصائية" },
  { name:"إحصائيات مسح",         category:"stats",   plan:"silver", description:"مسح كل قنوات الإحصائيات وحذفها" },
  { name:"إحصائيات تحديث",       category:"stats",   plan:"silver", description:"تحديث كل القنوات الآن يدوياً" },

  // ══ الذكاء الاصطناعي — gold/diamond (2 أمر) ══
  { name:"ذكاء",                 category:"ai",      plan:"gold",    description:"سؤال الذكاء الاصطناعي" },
  { name:"اعلان",                category:"ai",      plan:"diamond", description:"إغلاق الذاكرة الحالية" },

  // ══ المعلومات — free (4 أوامر) ══
  { name:"معلومات",              category:"info",    plan:"free",    description:"عرض معلومات تفصيلية عن عضو" },
  { name:"السيرفر",              category:"info",    plan:"free",    description:"عرض معلومات تفصيلية عن السيرفر" },
  { name:"بوت",                  category:"info",    plan:"free",    description:"عرض معلومات وإحصائيات البوت" },
  { name:"صورة",                 category:"info",    plan:"free",    description:"عرض صورة عضو بجودة عالية" },

  // ══ الإدارة — free (3 أوامر) ══
  { name:"config",               category:"admin",   plan:"free",    description:"تفعيل أو تعطيل أنظمة السيرفر" },
  { name:"settings",             category:"admin",   plan:"free",    description:"عرض إعدادات وحالة أنظمة السيرفر" },
  { name:"مطور",                 category:"admin",   plan:"free",    description:"لوحة تحكم المطور (خاصة بمالك البوت)" },
]

// تحقق: 15+7+7+5+3+10+6+9+8+6+2+4+3 = 85... نضيف السيرفر 86
// → المجموع: 86 أمر

const PLAN_HIERARCHY = { free:0, silver:1, gold:2, diamond:3 }
const canUsePlan = (gp, req) => (PLAN_HIERARCHY[gp]??0) >= (PLAN_HIERARCHY[req]??0)

// ══════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════
async function fetchDiscordJSON(url, options={}) {
  const res = await fetch(url, { ...options, headers:{"User-Agent":"DiscordBot/1.0",...options.headers} })
  const text = await res.text()
  let data; try { data=JSON.parse(text) } catch { data={raw:text} }
  if(!res.ok) { const e=new Error(`Discord API ${res.status}`); e.status=res.status; e.payload=data; throw e }
  return data
}
function getDefaultAvatar(userId) {
  try { return `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(userId)%5n)}.png` }
  catch { return "https://cdn.discordapp.com/embed/avatars/0.png" }
}
function getUserAvatar(user) {
  return user.avatar
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
    : getDefaultAvatar(user.id)
}
async function getDiscordUser(userId, guildId) {
  try {
    const d = await fetchDiscordJSON(
      `https://discord.com/api/guilds/${guildId}/members/${userId}`,
      { headers:{ Authorization:`Bot ${CONFIG.BOT_TOKEN}` } }
    )
    return { id:d.user.id, username:d.user.global_name||d.user.username, avatar:getUserAvatar(d.user) }
  } catch { return { id:userId, username:`User#${userId.slice(-4)}`, avatar:null } }
}
async function getGuildPlan(guildId) {
  try {
    const r = await pool.query(`
      SELECT s.plan_id, s.expires_at FROM guild_subscriptions gs
      JOIN subscriptions s ON s.user_id=gs.owner_id
      WHERE gs.guild_id=$1 AND s.status='active' LIMIT 1
    `, [guildId])
    if(!r.rows.length) return "free"
    const row = r.rows[0]
    if(row.expires_at && new Date(row.expires_at) < new Date()) return "free"
    return row.plan_id || "free"
  } catch { return "free" }
}

// ══════════════════════════════════════
//  SESSION AUTH
// ══════════════════════════════════════
const sessions = new Map()
const SESSION_TTL = 24*60*60*1000

function createSession(user, guilds) {
  const token = crypto.randomBytes(48).toString("hex")
  sessions.set(token, { user, guilds, createdAt:Date.now() })
  return token
}
function getSession(token) {
  if(!token) return null
  const s = sessions.get(token)
  if(!s) return null
  if(Date.now()-s.createdAt > SESSION_TTL) { sessions.delete(token); return null }
  return s
}
setInterval(() => {
  const now = Date.now()
  for(const [t,s] of sessions.entries())
    if(now-s.createdAt > SESSION_TTL) sessions.delete(t)
}, 60*60*1000)

function requireAuth(req, res, next) {
  const h = req.headers["authorization"]
  if(!h || !h.startsWith("Bearer ")) return res.status(401).json({ error:"مطلوب تسجيل دخول" })
  const s = getSession(h.replace("Bearer ",""))
  if(!s) return res.status(401).json({ error:"الجلسة منتهية — سجل دخول مرة ثانية" })
  req.user = s.user; req.guilds = s.guilds; next()
}
function requireOwnerAuth(req, res, next) {
  if(!req.user || req.user.id !== CONFIG.OWNER_ID) return res.status(403).json({ error:"غير مصرح" })
  next()
}
function requireGuildAdmin(req, res, next) {
  const gid = req.params.guildId || req.body.guildId
  if(!gid) return res.status(400).json({ error:"guildId مطلوب" })
  if(!req.guilds?.find(g => g.id === gid)) return res.status(403).json({ error:"ليس لديك صلاحية" })
  next()
}

// ══════════════════════════════════════
//  HEALTH
// ══════════════════════════════════════
app.get("/", (req,res) => res.json({ status:"online", service:"Lyn Dashboard API", version:"6.0", commands:ALL_COMMANDS.length }))
app.get("/api/health", async (req,res) => {
  try {
    const r = await pool.query("SELECT NOW() as time")
    res.json({ status:"ok", db:"connected", time:r.rows[0].time })
  } catch { res.status(500).json({ status:"error", db:"disconnected" }) }
})

// ══════════════════════════════════════
//  AUTH
// ══════════════════════════════════════
app.get("/api/auth/callback", async (req,res) => {
  const { code } = req.query
  if(!code) return res.status(400).json({ error:"No code" })
  try {
    const tr = await fetch("https://discord.com/api/oauth2/token", {
      method:"POST", headers:{ "Content-Type":"application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id:CONFIG.CLIENT_ID, client_secret:CONFIG.CLIENT_SECRET,
        grant_type:"authorization_code", code, redirect_uri:CONFIG.REDIRECT_URI
      })
    })
    const td = await tr.json()
    if(!tr.ok || !td.access_token) return res.status(400).json({ error:"Token exchange failed" })
    const [user, allGuilds] = await Promise.all([
      fetchDiscordJSON("https://discord.com/api/users/@me", { headers:{ Authorization:`Bearer ${td.access_token}` } }),
      fetchDiscordJSON("https://discord.com/api/users/@me/guilds", { headers:{ Authorization:`Bearer ${td.access_token}` } })
    ])
    const adminGuilds = allGuilds.filter(g => (BigInt(g.permissions) & 8n) === 8n)
    const userData = { id:user.id, username:user.global_name||user.username, avatar:getUserAvatar(user) }
    const guildsData = adminGuilds.map(g => ({ id:g.id, name:g.name, icon:g.icon, permissions:g.permissions.toString() }))
    res.json({ token:createSession(userData,guildsData), user:userData, guilds:guildsData })
  } catch(err) {
    console.error("AUTH ERROR:", err.payload||err.message)
    res.status(500).json({ error:"Authentication failed" })
  }
})

// ══════════════════════════════════════
//  GUILD SETTINGS
// ══════════════════════════════════════
app.post("/api/guild/save", requireAuth, requireGuildAdmin, async (req,res) => {
  const { guildId } = req.body
  if(!guildId) return res.status(400).json({ error:"guildId required" })
  try {
    await pool.query("INSERT INTO guild_settings(guild_id) VALUES($1) ON CONFLICT DO NOTHING", [guildId])
    const userId = req.user.id
    const sub = await pool.query("SELECT plan_id FROM subscriptions WHERE user_id=$1 AND status='active' LIMIT 1", [userId])
    if(sub.rows.length > 0) {
      const existing = await pool.query("SELECT guild_id FROM guild_subscriptions WHERE owner_id=$1", [userId])
      if(existing.rows.length === 0) {
        await pool.query("INSERT INTO guild_subscriptions(guild_id,owner_id) VALUES($1,$2) ON CONFLICT(guild_id) DO UPDATE SET owner_id=$2", [guildId,userId])
      }
    }
    res.json({ success:true })
  } catch(err) { res.status(500).json({ error:"Failed to save guild" }) }
})

app.get("/api/guild/:guildId/settings", requireAuth, requireGuildAdmin, async (req,res) => {
  try {
    const r = await pool.query("SELECT * FROM guild_settings WHERE guild_id=$1", [req.params.guildId])
    if(!r.rows.length) return res.json({ ai:true, xp:true, economy:true })
    res.json({ ai:r.rows[0].ai, xp:r.rows[0].xp, economy:r.rows[0].economy })
  } catch(err) { res.status(500).json({ error:"Failed to fetch settings" }) }
})

app.post("/api/guild/:guildId/settings", requireAuth, requireGuildAdmin, async (req,res) => {
  const { ai, xp, economy } = req.body
  try {
    await pool.query(`
      INSERT INTO guild_settings(guild_id,ai,xp,economy,updated_at) VALUES($1,$2,$3,$4,NOW())
      ON CONFLICT(guild_id) DO UPDATE SET ai=$2, xp=$3, economy=$4, updated_at=NOW()
    `, [req.params.guildId, !!ai, !!xp, !!economy])
    res.json({ success:true })
  } catch(err) { res.status(500).json({ error:"Failed to update settings" }) }
})

// ══════════════════════════════════════
//  COMMANDS API
// ══════════════════════════════════════
app.get("/api/guild/:guildId/commands", requireAuth, requireGuildAdmin, async (req,res) => {
  const { guildId } = req.params
  const { category } = req.query
  try {
    const guildPlan = await getGuildPlan(guildId)
    const r = await pool.query(
      "SELECT command_name, custom_name, enabled FROM guild_command_settings WHERE guild_id=$1", [guildId]
    )
    const map = {}
    for(const row of r.rows) map[row.command_name] = { custom_name:row.custom_name, enabled:row.enabled }

    let cmds = ALL_COMMANDS
    if(category && category !== "all") cmds = cmds.filter(c => c.category === category)

    const commands = cmds.map(cmd => {
      const saved   = map[cmd.name] || {}
      const allowed = canUsePlan(guildPlan, cmd.plan)
      return {
        name:        cmd.name,
        category:    cmd.category,
        plan:        cmd.plan,
        description: cmd.description,
        custom_name: saved.custom_name || null,
        enabled:     allowed ? (saved.enabled !== false) : false,
        plan_locked: !allowed
      }
    })
    res.json({ commands, guild_plan:guildPlan })
  } catch(err) {
    console.error("[COMMANDS_GET]", err.message)
    res.status(500).json({ error:"فشل جلب الأوامر" })
  }
})

app.patch("/api/guild/:guildId/commands/:commandName", requireAuth, requireGuildAdmin, async (req,res) => {
  const { guildId } = req.params
  // commandName قد يحتوي مسافات (مثل "لوق ضبط") — نفك encode
  const commandName = decodeURIComponent(req.params.commandName)
  const { enabled, custom_name } = req.body

  const cmdDef = ALL_COMMANDS.find(c => c.name === commandName)
  if(!cmdDef) return res.status(404).json({ error:"الأمر غير موجود" })

  try {
    const guildPlan = await getGuildPlan(guildId)
    if(custom_name !== undefined && !canUsePlan(guildPlan, "silver"))
      return res.status(403).json({ error:"🔒 تغيير الأسماء يحتاج فضي أو أعلى", required_plan:"silver" })
    if(enabled === true && !canUsePlan(guildPlan, cmdDef.plan))
      return res.status(403).json({ error:`🔒 يحتاج خطة ${cmdDef.plan} أو أعلى`, required_plan:cmdDef.plan })
    if(custom_name && String(custom_name).trim().length > 32)
      return res.status(400).json({ error:"الاسم المخصص لا يتجاوز 32 حرف" })
    // الاسم المخصص: حروف عربية أو إنجليزية أو أرقام أو مسافة
    if(custom_name && custom_name.trim() && !/^[\u0600-\u06FFa-zA-Z0-9 _-]+$/.test(custom_name.trim()))
      return res.status(400).json({ error:"الاسم: حروف عربية أو إنجليزية وأرقام فقط" })

    const finalName = custom_name === "" ? null : (custom_name?.trim() ?? null)
    await pool.query(`
      INSERT INTO guild_command_settings(guild_id,command_name,custom_name,enabled,updated_at)
      VALUES($1,$2,$3,$4,NOW())
      ON CONFLICT(guild_id,command_name) DO UPDATE SET
        custom_name = CASE WHEN $3::TEXT IS NOT NULL THEN $3 ELSE guild_command_settings.custom_name END,
        enabled     = CASE WHEN $4::BOOLEAN IS NOT NULL THEN $4 ELSE guild_command_settings.enabled END,
        updated_at  = NOW()
    `, [guildId, commandName, finalName, enabled !== undefined ? Boolean(enabled) : null])
    res.json({ success:true })
  } catch(err) {
    console.error("[CMD_PATCH]", err.message)
    res.status(500).json({ error:"فشل تحديث الأمر" })
  }
})

// Reset جميع أوامر السيرفر
app.delete("/api/guild/:guildId/commands/reset", requireAuth, requireGuildAdmin, async (req,res) => {
  try {
    await pool.query("DELETE FROM guild_command_settings WHERE guild_id=$1", [req.params.guildId])
    res.json({ success:true, message:"تم إعادة كل الأوامر للافتراضي" })
  } catch(err) { res.status(500).json({ error:"فشل إعادة الضبط" }) }
})

// ══════════════════════════════════════
//  PREFIX API
// ══════════════════════════════════════
app.get("/api/guild/:guildId/prefix", requireAuth, requireGuildAdmin, async (req,res) => {
  try {
    const r = await pool.query("SELECT prefix FROM guild_prefix_settings WHERE guild_id=$1", [req.params.guildId])
    res.json({ prefix: r.rows[0]?.prefix || "!" })
  } catch(err) { res.status(500).json({ error:"فشل جلب البريفكس" }) }
})

app.post("/api/guild/:guildId/prefix", requireAuth, requireGuildAdmin, async (req,res) => {
  const { guildId } = req.params
  const { prefix } = req.body
  if(!prefix || typeof prefix !== "string") return res.status(400).json({ error:"البريفكس مطلوب" })
  const trimmed = prefix.trim()
  if(trimmed.length === 0 || trimmed.length > 5) return res.status(400).json({ error:"البريفكس 1-5 أحرف فقط" })
  try {
    const guildPlan = await getGuildPlan(guildId)
    if(!canUsePlan(guildPlan, "silver"))
      return res.status(403).json({ error:"🔒 البريفكس المخصص يحتاج فضي أو أعلى", required_plan:"silver" })
    await pool.query(`
      INSERT INTO guild_prefix_settings(guild_id,prefix,updated_at) VALUES($1,$2,NOW())
      ON CONFLICT(guild_id) DO UPDATE SET prefix=$2, updated_at=NOW()
    `, [guildId, trimmed])
    res.json({ success:true, prefix:trimmed })
  } catch(err) { res.status(500).json({ error:"فشل تحديث البريفكس" }) }
})

// ══════════════════════════════════════
//  ANALYTICS
// ══════════════════════════════════════
app.get("/api/guild/:guildId/analytics", requireAuth, requireGuildAdmin, async (req,res) => {
  const { guildId } = req.params
  const days = Math.min(parseInt(req.query.days)||30, 90)
  try {
    const guildPlan  = await getGuildPlan(guildId)
    const isAdvanced = canUsePlan(guildPlan, "diamond")

    const [totalQ, dailyQ, topGuildQ] = await Promise.all([
      pool.query("SELECT SUM(count)::INTEGER as total FROM guild_analytics WHERE guild_id=$1", [guildId]),
      pool.query(`
        SELECT used_at::TEXT as date, SUM(count)::INTEGER as total
        FROM guild_analytics
        WHERE guild_id=$1 AND used_at >= CURRENT_DATE - INTERVAL '${days} days'
        GROUP BY used_at ORDER BY used_at ASC
      `, [guildId]),
      pool.query(`
        SELECT command, SUM(count)::INTEGER as total
        FROM guild_analytics WHERE guild_id=$1
        GROUP BY command ORDER BY total DESC LIMIT 10
      `, [guildId])
    ])

    // توزيع حسب الفئة
    const categories = [...new Set(ALL_COMMANDS.map(c => c.category))]
    const categoryStats = await Promise.all(categories.map(async cat => {
      const cmdNames = ALL_COMMANDS.filter(c => c.category === cat).map(c => c.name)
      const r = await pool.query(`
        SELECT COALESCE(SUM(count),0)::INTEGER as total
        FROM guild_analytics WHERE guild_id=$1 AND command=ANY($2)
      `, [guildId, cmdNames])
      return { category:cat, total:parseInt(r.rows[0]?.total||0) }
    }))

    let topGlobal = []
    if(isAdvanced) {
      const q = await pool.query("SELECT command, count FROM analytics ORDER BY count DESC LIMIT 10")
      topGlobal = q.rows
    }

    res.json({
      is_advanced:         isAdvanced,
      total_usage:         parseInt(totalQ.rows[0]?.total||0),
      daily_usage:         dailyQ.rows,
      top_commands_guild:  topGuildQ.rows,
      top_commands_global: topGlobal,
      category_stats:      categoryStats,
    })
  } catch(err) {
    console.error("[ANALYTICS_GET]", err.message)
    res.status(500).json({ error:"فشل جلب الإحصائيات" })
  }
})

app.post("/api/analytics/track", async (req,res) => {
  if(req.headers["x-bot-secret"] !== process.env.BOT_SECRET)
    return res.status(401).json({ error:"Unauthorized" })
  const { command, guildId } = req.body
  if(!command) return res.status(400).json({ error:"command required" })
  try {
    await pool.query(
      "INSERT INTO analytics(command,count) VALUES($1,1) ON CONFLICT(command) DO UPDATE SET count=analytics.count+1",
      [command]
    )
    if(guildId) {
      await pool.query(`
        INSERT INTO guild_analytics(guild_id,command,used_at,count) VALUES($1,$2,CURRENT_DATE,1)
        ON CONFLICT(guild_id,command,used_at) DO UPDATE SET count=guild_analytics.count+1
      `, [guildId, command])
    }
    res.json({ success:true })
  } catch(err) { res.status(500).json({ error:"Failed" }) }
})

// ══════════════════════════════════════
//  BOT INTERNAL API
// ══════════════════════════════════════
app.get("/api/bot/guild/:guildId/command-settings", async (req,res) => {
  if(req.headers["x-bot-secret"] !== process.env.BOT_SECRET)
    return res.status(401).json({ error:"Unauthorized" })
  const { guildId } = req.params
  try {
    const [cmds, pfx] = await Promise.all([
      pool.query("SELECT command_name, custom_name, enabled FROM guild_command_settings WHERE guild_id=$1", [guildId]),
      pool.query("SELECT prefix FROM guild_prefix_settings WHERE guild_id=$1", [guildId])
    ])
    const commandSettings = {}
    for(const row of cmds.rows)
      commandSettings[row.command_name] = { custom_name:row.custom_name, enabled:row.enabled }
    res.json({ prefix: pfx.rows[0]?.prefix || "!", commands:commandSettings })
  } catch(err) { res.status(500).json({ error:"Failed" }) }
})

// ══════════════════════════════════════
//  GUILD ↔ SUBSCRIPTION LINKING
// ══════════════════════════════════════
app.post("/api/guild/:guildId/link", requireAuth, requireGuildAdmin, async (req,res) => {
  const { guildId } = req.params; const userId = req.user.id
  try {
    const sub = await pool.query("SELECT plan_id FROM subscriptions WHERE user_id=$1 AND status='active' LIMIT 1", [userId])
    if(!sub.rows.length) return res.status(400).json({ error:"لا يوجد اشتراك نشط" })
    const ex = await pool.query("SELECT guild_id FROM guild_subscriptions WHERE owner_id=$1", [userId])
    if(ex.rows.length > 0 && ex.rows[0].guild_id !== guildId)
      return res.status(400).json({ error:"⚠️ اشتراكك مربوط بسيرفر آخر. فك الربط أولاً." })
    await pool.query(
      "INSERT INTO guild_subscriptions(guild_id,owner_id) VALUES($1,$2) ON CONFLICT(guild_id) DO UPDATE SET owner_id=$2",
      [guildId, userId]
    )
    res.json({ success:true })
  } catch(err) { res.status(500).json({ error:"فشل ربط السيرفر" }) }
})

app.delete("/api/guild/:guildId/link", requireAuth, requireGuildAdmin, async (req,res) => {
  try {
    await pool.query("DELETE FROM guild_subscriptions WHERE guild_id=$1", [req.params.guildId])
    res.json({ success:true })
  } catch(err) { res.status(500).json({ error:"فشل فك الربط" }) }
})

app.get("/api/guild/:guildId/plan", async (req,res) => {
  try {
    const r = await pool.query(`
      SELECT gs.guild_id, s.plan_id, s.status, s.expires_at
      FROM guild_subscriptions gs JOIN subscriptions s ON s.user_id=gs.owner_id
      WHERE gs.guild_id=$1 AND s.status='active' LIMIT 1
    `, [req.params.guildId])
    if(!r.rows.length) return res.json({ plan_id:"free", status:"inactive" })
    res.json(r.rows[0])
  } catch(err) { res.status(500).json({ error:"فشل جلب الخطة" }) }
})

app.get("/api/user/:userId/guilds", requireAuth, async (req,res) => {
  if(req.user.id !== req.params.userId) return res.status(403).json({ error:"غير مصرح" })
  try {
    const r = await pool.query(
      "SELECT guild_id, added_at FROM guild_subscriptions WHERE owner_id=$1 ORDER BY added_at DESC",
      [req.params.userId]
    )
    res.json(r.rows)
  } catch(err) { res.status(500).json({ error:"فشل" }) }
})

// ══════════════════════════════════════
//  ECONOMY LEADERBOARD
// ══════════════════════════════════════
app.get("/api/economy/top/:guildId", requireAuth, requireGuildAdmin, async (req,res) => {
  const limit = Math.min(parseInt(req.query.limit)||10, 25)
  try {
    const r = await pool.query(
      "SELECT user_id, coins FROM economy_users WHERE coins>0 ORDER BY coins DESC LIMIT $1", [limit]
    )
    if(!r.rows.length) return res.json([])
    const users = await Promise.allSettled(r.rows.map(async u => {
      const d = await getDiscordUser(u.user_id, req.params.guildId)
      return { id:u.user_id, username:d.username, avatar:d.avatar, coins:u.coins }
    }))
    res.json(users.filter(u => u.status==="fulfilled").map(u => u.value))
  } catch(err) { res.status(500).json({ error:"Failed" }) }
})

// ══════════════════════════════════════
//  SUBSCRIPTIONS
// ══════════════════════════════════════
app.get("/api/subscription/:userId", requireAuth, async (req,res) => {
  if(req.user.id !== req.params.userId) return res.status(403).json({ error:"غير مصرح" })
  try {
    const r = await pool.query("SELECT * FROM subscriptions WHERE user_id=$1 LIMIT 1", [req.params.userId])
    if(!r.rows.length)
      return res.json({ user_id:req.params.userId, plan_id:"free", status:"inactive", expires_at:null })
    const sub = r.rows[0]
    if(sub.expires_at && new Date(sub.expires_at) < new Date()) {
      await pool.query("UPDATE subscriptions SET status='expired', updated_at=NOW() WHERE user_id=$1", [req.params.userId])
      sub.status = "expired"
    }
    res.json(sub)
  } catch(err) { res.status(500).json({ error:"Failed" }) }
})

// ══════════════════════════════════════
//  PAYMENT REQUESTS
// ══════════════════════════════════════
app.post("/api/payment-requests", requireAuth, async (req,res) => {
  const { planId, refNumber } = req.body; const userId = req.user.id
  if(!planId || !refNumber) return res.status(400).json({ error:"planId و refNumber مطلوبة" })
  if(!PLANS[planId]) return res.status(400).json({ error:"خطة غير صالحة" })
  if(planId === "free") return res.status(400).json({ error:"الخطة المجانية لا تحتاج دفعاً" })
  const cleanRef = String(refNumber).trim()
  if(cleanRef.length < 4 || cleanRef.length > 100) return res.status(400).json({ error:"رقم العملية غير صالح" })
  try {
    const ex = await pool.query("SELECT id FROM payment_requests WHERE user_id=$1 AND status='pending' LIMIT 1", [userId])
    if(ex.rows.length > 0) return res.status(400).json({ error:"يوجد طلب معلق بالفعل" })
    await pool.query(
      "INSERT INTO payment_requests(user_id,plan_id,ref_number,status) VALUES($1,$2,$3,'pending')",
      [userId, planId, cleanRef]
    )
    res.json({ success:true, message:"تم إرسال طلب الدفع بنجاح" })
  } catch(err) { res.status(500).json({ error:"فشل إرسال الطلب" }) }
})

// ══════════════════════════════════════
//  ADMIN
// ══════════════════════════════════════
app.get("/api/admin/payment-requests", requireAuth, requireOwnerAuth, async (req,res) => {
  try {
    const r = await pool.query(`
      SELECT * FROM payment_requests
      ORDER BY CASE WHEN status='pending' THEN 0 ELSE 1 END, created_at DESC LIMIT 100
    `)
    res.json(r.rows)
  } catch(err) { res.status(500).json({ error:"Failed" }) }
})

app.post("/api/admin/payment-requests/:id/approve", requireAuth, requireOwnerAuth, async (req,res) => {
  const { id } = req.params
  try {
    const qr = await pool.query("SELECT * FROM payment_requests WHERE id=$1 LIMIT 1", [id])
    if(!qr.rows.length) return res.status(404).json({ error:"الطلب غير موجود" })
    const payReq = qr.rows[0]
    if(payReq.status !== "pending") return res.status(400).json({ error:"الطلب تمت مراجعته" })
    const plan = PLANS[payReq.plan_id]
    if(!plan) return res.status(400).json({ error:"خطة غير صالحة" })
    let expiresAt = null
    if(plan.durationDays) { expiresAt = new Date(); expiresAt.setDate(expiresAt.getDate()+plan.durationDays) }
    await pool.query(`
      INSERT INTO subscriptions(user_id,plan_id,status,expires_at,updated_at) VALUES($1,$2,'active',$3,NOW())
      ON CONFLICT(user_id) DO UPDATE SET plan_id=$2, status='active', expires_at=$3, updated_at=NOW()
    `, [payReq.user_id, payReq.plan_id, expiresAt])
    await pool.query("UPDATE payment_requests SET status='approved', reviewed_at=NOW() WHERE id=$1", [id])
    try {
      const dm = await fetchDiscordJSON("https://discord.com/api/users/@me/channels", {
        method:"POST", headers:{ Authorization:`Bot ${CONFIG.BOT_TOKEN}`, "Content-Type":"application/json" },
        body: JSON.stringify({ recipient_id:payReq.user_id })
      })
      if(dm?.id) {
        await fetchDiscordJSON(`https://discord.com/api/channels/${dm.id}/messages`, {
          method:"POST", headers:{ Authorization:`Bot ${CONFIG.BOT_TOKEN}`, "Content-Type":"application/json" },
          body: JSON.stringify({ embeds:[{
            title:"✅ تم تفعيل اشتراكك!",
            description:`مبروك! تم تفعيل خطة **${plan.name}** بنجاح.`,
            color:0x22d3a2,
            fields:[
              { name:"📋 الخطة", value:plan.name, inline:true },
              { name:"💰 السعر", value:`${plan.price} ريال/شهر`, inline:true },
              { name:"⏰ المدة", value:`${plan.durationDays} يوم`, inline:true },
            ],
            footer:{ text:"Lyn AI — شكراً لدعمك! 💙" },
            timestamp: new Date().toISOString()
          }] })
        })
      }
    } catch(dmErr) { console.log("⚠️ DM failed:", dmErr.message) }
    res.json({ success:true })
  } catch(err) { res.status(500).json({ error:"فشل تفعيل الاشتراك" }) }
})

app.post("/api/admin/payment-requests/:id/reject", requireAuth, requireOwnerAuth, async (req,res) => {
  const { id } = req.params; const { notes } = req.body || {}
  try {
    const r = await pool.query(
      "UPDATE payment_requests SET status='rejected', notes=$2, reviewed_at=NOW() WHERE id=$1 AND status='pending' RETURNING *",
      [id, notes||null]
    )
    if(!r.rows.length) return res.status(404).json({ error:"الطلب غير موجود أو تمت مراجعته" })
    res.json({ success:true })
  } catch(err) { res.status(500).json({ error:"فشل رفض الطلب" }) }
})

app.post("/api/admin/subscription/:userId/cancel", requireAuth, requireOwnerAuth, async (req,res) => {
  try {
    await pool.query("UPDATE subscriptions SET status='cancelled', updated_at=NOW() WHERE user_id=$1", [req.params.userId])
    await pool.query("DELETE FROM guild_subscriptions WHERE owner_id=$1", [req.params.userId])
    res.json({ success:true })
  } catch(err) { res.status(500).json({ error:"Failed" }) }
})

app.get("/api/admin/stats", requireAuth, requireOwnerAuth, async (req,res) => {
  try {
    const [subs, reqs, eco, linked, topCmds] = await Promise.all([
      pool.query("SELECT plan_id, COUNT(*) as count FROM subscriptions WHERE status='active' GROUP BY plan_id"),
      pool.query("SELECT status, COUNT(*) as count FROM payment_requests GROUP BY status"),
      pool.query("SELECT COUNT(*) as total, SUM(coins) as total_coins FROM economy_users"),
      pool.query("SELECT COUNT(*) as count FROM guild_subscriptions"),
      pool.query("SELECT command, count FROM analytics ORDER BY count DESC LIMIT 5"),
    ])
    res.json({
      activeSubscriptions: subs.rows, paymentRequests: reqs.rows,
      economy: eco.rows[0], linkedGuilds: parseInt(linked.rows[0]?.count||0),
      topCommands: topCmds.rows
    })
  } catch(err) { res.status(500).json({ error:"Failed" }) }
})

app.get("/api/plans", (req,res) => res.json(Object.values(PLANS)))

app.get("/terms", (req,res) => res.send(`<html><head><title>Terms - Lyn AI</title><style>body{font-family:Arial;max-width:800px;margin:50px auto;padding:20px;background:#1a1a2e;color:#fff}</style></head><body><h1>Terms of Service</h1><p>Last updated: April 2026</p><h2>1. Usage</h2><p>By adding Lyn AI, you agree to use it responsibly per Discord's Terms of Service.</p><h2>2. Data Collection</h2><p>We collect server IDs, user IDs, and message interactions.</p><h2>3. Prohibited Use</h2><p>No spam, harassment, or illegal activities.</p><h2>4. Contact</h2><p><a href="https://rcif-dashboard.onrender.com" style="color:#7289da">Dashboard</a></p></body></html>`))

app.get("/privacy", (req,res) => res.send(`<html><head><title>Privacy - Lyn AI</title><style>body{font-family:Arial;max-width:800px;margin:50px auto;padding:20px;background:#1a1a2e;color:#fff}</style></head><body><h1>Privacy Policy</h1><p>Last updated: April 2026</p><h2>1. Data We Collect</h2><p>User IDs, Server IDs, message content for AI, economy data, XP data.</p><h2>2. How We Use Data</h2><p>Solely to provide bot features. Never sold to third parties.</p><h2>3. Data Deletion</h2><p><a href="https://rcif-dashboard.onrender.com" style="color:#7289da">Dashboard</a></p></body></html>`))

app.listen(CONFIG.PORT, () => {
  console.log(`🚀 Lyn Dashboard API v6.0 — port ${CONFIG.PORT}`)
  console.log(`👑 Plans: ${Object.keys(PLANS).join(" | ")}`)
  console.log(`⚡ Commands: ${ALL_COMMANDS.length} total`)
})
// ══════════════════════════════════════════════════════════════════
//  Lyn Dashboard — Full Health Audit
//  المسار: audits/dashboard_full_audit.js
//
//  الاستخدام:
//    node audits/dashboard_full_audit.js
//
//  يفحص 6 طبقات:
//   1. كل GET endpoints (40+ مسار) — بالأسماء الصحيحة
//   2. أداء كل endpoint (latency)
//   3. صحة الـ Response (JSON valid + size + structure)
//   4. اختبارات الكتابة (PUT/POST تجريبية آمنة)
//   5. فحص قاعدة البيانات (جداول + أعمدة)
//   6. صفحات الفرونت (24+ صفحة React)
//
//  الإخراج:
//   - تقرير ملوّن في الكونسول
//   - ملف dashboard_health_report.txt (تفاصيل كاملة)
//   - ملف dashboard_health_report.json (للقراءة الآلية)
// ══════════════════════════════════════════════════════════════════

require("dotenv").config()
const fs = require("fs")
const path = require("path")

// ──────────────────────────────────────────────────────────────────
//  CONFIG
// ──────────────────────────────────────────────────────────────────

const API_URL = process.env.AUDIT_API_URL || "https://lyn-api.onrender.com"
const FRONTEND_URL = process.env.AUDIT_FRONTEND_URL || "https://rcif-dashboard.onrender.com"
const GUILD_ID = process.env.AUDIT_GUILD_ID || "1490775708291694684"
const TOKEN = process.env.DASHBOARD_TOKEN

const REPORT_TXT = path.join(__dirname, "dashboard_health_report.txt")
const REPORT_JSON = path.join(__dirname, "dashboard_health_report.json")

const SLOW_THRESHOLD_MS = 2000
const CRITICAL_THRESHOLD_MS = 5000
const REQUEST_TIMEOUT_MS = 20000

if (!TOKEN) {
  console.error("❌ DASHBOARD_TOKEN missing in .env")
  console.error("   احصل عليه: افتح الداش → F12 → Application → Local Storage → 'lyn-auth-token'")
  process.exit(1)
}

// ──────────────────────────────────────────────────────────────────
//  ENDPOINTS — بالأسماء الصحيحة من dashboard-backend/routes/
// ──────────────────────────────────────────────────────────────────

const GET_ENDPOINTS = [
  // Guild Resources (routes/guild.js)
  { path: "/info",       category: "Guild",      critical: true  },
  { path: "/channels",   category: "Guild",      critical: true  },
  { path: "/roles",      category: "Guild",      critical: true  },
  { path: "/members",    category: "Guild",      critical: false },
  { path: "/emojis",     category: "Guild",      critical: false },
  { path: "/plan",       category: "Guild",      critical: true  },

  // Settings (routes/settings.js)
  { path: "/overview",         category: "Settings",   critical: true  },
  { path: "/welcome",          category: "Settings",   critical: true  },
  { path: "/protection",       category: "Settings",   critical: true  },
  { path: "/logs",             category: "Settings",   critical: true  },
  { path: "/xp",               category: "Settings",   critical: true  },
  { path: "/economy",          category: "Settings",   critical: true  },
  { path: "/tickets",          category: "Settings",   critical: true  },
  { path: "/tickets/active",   category: "Settings",   critical: false },
  { path: "/audit",            category: "Settings",   critical: false },

  // Reaction Roles (role-panels)
  { path: "/role-panels",      category: "Roles",      critical: true  },

  // Moderation
  { path: "/moderation/warnings", category: "Moderation", critical: false },
  { path: "/moderation/bans",     category: "Moderation", critical: false },
  { path: "/moderation/mutes",    category: "Moderation", critical: false },

  // Events & Scheduler
  { path: "/events",     category: "Events",     critical: false },
  { path: "/scheduler",  category: "Events",     critical: false },

  // Embed Builder
  { path: "/embeds/templates", category: "Embed", critical: false },

  // AI
  { path: "/ai",         category: "AI",         critical: true  },
  { path: "/ai/usage",   category: "AI",         critical: false },

  // Auto-Role (routes/autoRole.js)
  { path: "/auto-role",  category: "AutoRole",   critical: true  },

  // Automod (routes/automod.js)
  { path: "/automod",    category: "Automod",    critical: true  },

  // Giveaway (routes/giveaway.js)
  { path: "/giveaway",   category: "Giveaway",   critical: false },

  // XP & Economy extras
  { path: "/xp/leaderboard",      category: "XP",       critical: false },
  { path: "/economy/shop",        category: "Economy",  critical: false },
  { path: "/economy/leaderboard", category: "Economy",  critical: false },

  // Commands & Prefix
  { path: "/commands",   category: "Commands",   critical: true  },
  { path: "/prefix",     category: "Commands",   critical: false },
]

// ── Health check endpoints (بدون auth) ──
const PUBLIC_ENDPOINTS = [
  { url: `${API_URL}/`,            name: "API Root"         },
  { url: `${API_URL}/api/health`,  name: "API Health Check" },
  { url: `${FRONTEND_URL}/`,       name: "Frontend Root"    },
]

// ── Frontend pages للفحص ──
const FRONTEND_PAGES = [
  "/",
  "/login",
  "/dashboard",
  "/dashboard/servers",
  "/dashboard/stats",
  "/dashboard/members",
  "/dashboard/audit",
  "/dashboard/templates",
  "/dashboard/commands",
  "/dashboard/subscription",
  "/dashboard/events",
  "/dashboard/scheduler",
  "/dashboard/ai",
  "/dashboard/protection",
  "/dashboard/levels",
  "/dashboard/economy",
  "/dashboard/tickets",
  "/dashboard/welcome",
  "/dashboard/auto-role",
  "/dashboard/logs",
  "/dashboard/moderation",
  "/dashboard/reaction-roles",
  "/dashboard/embed",
  "/dashboard/settings",
  "/dashboard/giveaway",
  "/dashboard/automod",
]

// ──────────────────────────────────────────────────────────────────
//  RESULTS
// ──────────────────────────────────────────────────────────────────

const results = {
  startTime: new Date().toISOString(),
  config: { API_URL, FRONTEND_URL, GUILD_ID },
  publicChecks: [],
  endpoints: {
    ok: [],
    slow: [],
    failed: [],
    auth_issues: [],
  },
  writeTests: [],
  database: { tables: [], missing: [], error: null },
  frontend: { ok: [], failed: [] },
  performance: {
    total: 0,
    average: 0,
    fastest: null,
    slowest: null,
  },
  warnings: [],
  critical: [],
}

const reportLines = []

function log(text = "") {
  console.log(text)
  reportLines.push(text)
}

function header(title) {
  log("")
  log("═".repeat(70))
  log("  " + title)
  log("═".repeat(70))
}

function section(title) {
  log("")
  log("─".repeat(70))
  log("  " + title)
  log("─".repeat(70))
}

// ──────────────────────────────────────────────────────────────────
//  LAYER 1: Public health checks (بدون auth)
// ──────────────────────────────────────────────────────────────────

async function checkPublicHealth() {
  section("Layer 1: Public Health Checks")

  for (const ep of PUBLIC_ENDPOINTS) {
    const start = Date.now()
    try {
      const res = await fetch(ep.url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) })
      const ms = Date.now() - start
      const ok = res.status >= 200 && res.status < 400

      results.publicChecks.push({ ...ep, status: res.status, ms, ok })
      log(`${ok ? "✅" : "❌"} ${ep.name.padEnd(25)} ${res.status}  ${ms}ms`)

      if (!ok) {
        results.critical.push(`${ep.name} returned ${res.status}`)
      }
    } catch (err) {
      results.publicChecks.push({ ...ep, error: err.message, ok: false })
      log(`💥 ${ep.name.padEnd(25)} ${err.message}`)
      results.critical.push(`${ep.name} unreachable: ${err.message}`)
    }
  }
}

// ──────────────────────────────────────────────────────────────────
//  LAYER 2 + 3: GET Endpoints + Response Validation
// ──────────────────────────────────────────────────────────────────

async function testEndpoint(endpoint) {
  const url = `${API_URL}/api/guild/${GUILD_ID}${endpoint.path}`
  const start = Date.now()

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${TOKEN}` },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    const ms = Date.now() - start
    const responseText = await res.text()
    const sizeBytes = Buffer.byteLength(responseText, "utf8")

    // ── Parse JSON ──
    let jsonValid = false
    let body = null
    try {
      body = JSON.parse(responseText)
      jsonValid = true
    } catch {
      jsonValid = false
    }

    const result = {
      ...endpoint,
      status: res.status,
      ms,
      sizeBytes,
      jsonValid,
      body: body && typeof body === "object" ? Object.keys(body).slice(0, 10) : null,
    }

    // ── Categorize ──
    if (res.status === 401 || res.status === 403) {
      results.endpoints.auth_issues.push(result)
      log(`🔐 ${endpoint.path.padEnd(28)} ${res.status}  ${ms}ms  [AUTH]`)
    } else if (res.status >= 500) {
      result.errorBody = responseText.slice(0, 300)
      results.endpoints.failed.push(result)
      log(`❌ ${endpoint.path.padEnd(28)} ${res.status}  ${ms}ms  [SERVER ERROR]`)
      if (endpoint.critical) {
        results.critical.push(`CRITICAL: ${endpoint.path} returned ${res.status}`)
      }
    } else if (res.status === 404) {
      result.errorBody = responseText.slice(0, 200)
      results.endpoints.failed.push(result)
      log(`⚠️  ${endpoint.path.padEnd(28)} ${res.status}  ${ms}ms  [NOT FOUND]`)
      if (endpoint.critical) {
        results.critical.push(`CRITICAL: ${endpoint.path} not found (404)`)
      } else {
        results.warnings.push(`${endpoint.path} returned 404 (optional)`)
      }
    } else if (res.status >= 400) {
      results.endpoints.failed.push(result)
      log(`⚠️  ${endpoint.path.padEnd(28)} ${res.status}  ${ms}ms  [CLIENT ERROR]`)
    } else if (!jsonValid) {
      results.endpoints.failed.push(result)
      log(`📄 ${endpoint.path.padEnd(28)} ${res.status}  ${ms}ms  [INVALID JSON]`)
      results.warnings.push(`${endpoint.path} returned invalid JSON`)
    } else if (ms > CRITICAL_THRESHOLD_MS) {
      results.endpoints.slow.push(result)
      log(`🐢 ${endpoint.path.padEnd(28)} ${res.status}  ${ms}ms  [CRITICAL SLOW]`)
      results.critical.push(`${endpoint.path} extremely slow: ${ms}ms`)
    } else if (ms > SLOW_THRESHOLD_MS) {
      results.endpoints.slow.push(result)
      log(`🐌 ${endpoint.path.padEnd(28)} ${res.status}  ${ms}ms  [SLOW]`)
      results.warnings.push(`${endpoint.path} slow: ${ms}ms`)
    } else {
      results.endpoints.ok.push(result)
      const sizeStr = sizeBytes > 1024 ? `${(sizeBytes / 1024).toFixed(1)}KB` : `${sizeBytes}B`
      log(`✅ ${endpoint.path.padEnd(28)} ${res.status}  ${ms}ms  ${sizeStr}`)
    }

    return ms
  } catch (err) {
    const ms = Date.now() - start
    results.endpoints.failed.push({ ...endpoint, error: err.message, ms })
    log(`💥 ${endpoint.path.padEnd(28)} ${err.message}`)
    results.critical.push(`${endpoint.path} crashed: ${err.message}`)
    return ms
  }
}

async function checkAllEndpoints() {
  section(`Layer 2 + 3: GET Endpoints (${GET_ENDPOINTS.length}) + Response Validation`)

  // ── Group by category ──
  const categories = {}
  for (const ep of GET_ENDPOINTS) {
    if (!categories[ep.category]) categories[ep.category] = []
    categories[ep.category].push(ep)
  }

  const allMs = []
  for (const [cat, endpoints] of Object.entries(categories)) {
    log("")
    log(`📁 ${cat}`)
    for (const ep of endpoints) {
      const ms = await testEndpoint(ep)
      allMs.push(ms)
    }
  }

  // ── Performance summary ──
  if (allMs.length) {
    const validMs = allMs.filter((m) => typeof m === "number" && m > 0)
    results.performance.total = validMs.length
    results.performance.average = Math.round(
      validMs.reduce((a, b) => a + b, 0) / validMs.length,
    )
    results.performance.fastest = Math.min(...validMs)
    results.performance.slowest = Math.max(...validMs)
  }
}

// ──────────────────────────────────────────────────────────────────
//  LAYER 4: Write Tests (آمنة — idempotent)
// ──────────────────────────────────────────────────────────────────

async function testWrite(name, method, path, body, validator) {
  const url = `${API_URL}/api/guild/${GUILD_ID}${path}`
  const start = Date.now()

  try {
    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    const ms = Date.now() - start
    const responseText = await res.text()

    let respBody = null
    try {
      respBody = JSON.parse(responseText)
    } catch {}

    const ok = res.status >= 200 && res.status < 300
    const validatorOk = validator ? validator(respBody) : true

    results.writeTests.push({
      name,
      method,
      path,
      status: res.status,
      ms,
      ok: ok && validatorOk,
      response: respBody,
    })

    if (ok && validatorOk) {
      log(`✅ ${name.padEnd(40)} ${method} ${res.status}  ${ms}ms`)
    } else {
      log(`❌ ${name.padEnd(40)} ${method} ${res.status}  ${ms}ms`)
      if (responseText) log(`   → ${responseText.slice(0, 200)}`)
      results.warnings.push(`Write test failed: ${name}`)
    }
  } catch (err) {
    results.writeTests.push({ name, method, path, error: err.message, ok: false })
    log(`💥 ${name.padEnd(40)} ${method} ${err.message}`)
  }
}

async function runWriteTests() {
  section("Layer 4: Write Tests (Read → Modify → Restore)")

  // ── Strategy: نقرأ القيمة الأصلية → نعدّل → نرجعها ──

  // 1. Welcome — toggle enabled و رجّعها
  try {
    const getRes = await fetch(`${API_URL}/api/guild/${GUILD_ID}/welcome`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    })
    const original = await getRes.json()
    if (original && typeof original === "object") {
      const testValue = { ...original }
      await testWrite("Welcome — save same data", "PUT", "/welcome", testValue, (r) => r?.success !== false)
    }
  } catch (err) {
    log(`💥 Welcome write test setup failed: ${err.message}`)
  }

  // 2. Protection
  try {
    const getRes = await fetch(`${API_URL}/api/guild/${GUILD_ID}/protection`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    })
    const original = await getRes.json()
    if (original && typeof original === "object") {
      await testWrite("Protection — save same data", "PUT", "/protection", original, (r) => r?.success !== false)
    }
  } catch (err) {
    log(`💥 Protection write test setup failed: ${err.message}`)
  }

  // 3. Logs
  try {
    const getRes = await fetch(`${API_URL}/api/guild/${GUILD_ID}/logs`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    })
    const original = await getRes.json()
    if (original && typeof original === "object") {
      await testWrite("Logs — save same data", "PUT", "/logs", original, (r) => r?.success !== false)
    }
  } catch (err) {
    log(`💥 Logs write test setup failed: ${err.message}`)
  }

  // 4. AI Settings
  try {
    const getRes = await fetch(`${API_URL}/api/guild/${GUILD_ID}/ai`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    })
    const original = await getRes.json()
    if (original && typeof original === "object") {
      await testWrite("AI — save same data", "PUT", "/ai", original, (r) => r?.success !== false)
    }
  } catch (err) {
    log(`💥 AI write test setup failed: ${err.message}`)
  }

  // 5. XP
  try {
    const getRes = await fetch(`${API_URL}/api/guild/${GUILD_ID}/xp`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    })
    const original = await getRes.json()
    if (original && typeof original === "object") {
      await testWrite("XP — save same data", "PUT", "/xp", original, (r) => r?.success !== false)
    }
  } catch (err) {
    log(`💥 XP write test setup failed: ${err.message}`)
  }

  // 6. Economy
  try {
    const getRes = await fetch(`${API_URL}/api/guild/${GUILD_ID}/economy`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    })
    const original = await getRes.json()
    if (original && typeof original === "object") {
      await testWrite("Economy — save same data", "PUT", "/economy", original, (r) => r?.success !== false)
    }
  } catch (err) {
    log(`💥 Economy write test setup failed: ${err.message}`)
  }
}

// ──────────────────────────────────────────────────────────────────
//  LAYER 5: Database check (local — يستدعي db_audit إن وُجد)
// ──────────────────────────────────────────────────────────────────

async function checkDatabase() {
  section("Layer 5: Database Check (Local)")

  if (!process.env.DATABASE_URL) {
    log("⚠️  DATABASE_URL غير موجود — تخطي فحص قاعدة البيانات")
    results.database.error = "DATABASE_URL not set in .env"
    return
  }

  try {
    const { Client } = require("pg")
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    })

    await client.connect()
    log("✅ متصل بقاعدة البيانات")

    const tablesRes = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `)
    const tables = tablesRes.rows.map((r) => r.table_name)
    results.database.tables = tables
    log(`📊 عدد الجداول: ${tables.length}`)

    // ── الجداول المتوقعة (من db_audit.js) ──
    const expected = [
      "users", "guilds", "xp", "xp_settings", "analytics", "inventory",
      "log_settings", "tickets", "ticket_settings", "welcome_settings",
      "protection_settings", "button_role_panels", "button_roles",
      "guild_events", "event_attendees", "card_customization", "user_premium",
      "auto_role_settings", "auto_role_assignments", "auto_role_history",
      "giveaways", "giveaway_entries", "automod_settings", "automod_words",
      "automod_violations", "bulk_actions", "schema_migrations",
      "economy_users", "ai_conversations", "ai_settings", "ai_usage_log",
      "warnings", "moderation_bans", "moderation_mutes", "scheduled_tasks",
      "embed_templates", "stats_snapshots", "stats_hourly",
      "guild_command_settings", "guild_prefix_settings", "guild_command_aliases",
      "guild_command_restrictions", "guild_command_defaults",
      "subscriptions", "payment_requests", "guild_subscriptions",
      "dashboard_audit_log",
    ]

    const missing = expected.filter((t) => !tables.includes(t))
    results.database.missing = missing

    if (missing.length === 0) {
      log("✅ كل الجداول المتوقعة موجودة")
    } else {
      log(`⚠️  ${missing.length} جدول مفقود:`)
      missing.forEach((t) => {
        log(`   - ${t}`)
        results.warnings.push(`Missing DB table: ${t}`)
      })
    }

    // ── عدد الصفوف في الجداول الرئيسية ──
    log("\n📈 إحصائيات الجداول الرئيسية:")
    const mainTables = ["users", "guilds", "subscriptions", "guild_subscriptions"]
    for (const t of mainTables) {
      if (tables.includes(t)) {
        try {
          const r = await client.query(`SELECT COUNT(*)::int AS c FROM ${t}`)
          log(`   ${t.padEnd(25)} ${r.rows[0].c} صف`)
        } catch {}
      }
    }

    await client.end()
  } catch (err) {
    log(`💥 فشل فحص قاعدة البيانات: ${err.message}`)
    results.database.error = err.message
  }
}

// ──────────────────────────────────────────────────────────────────
//  LAYER 6: Frontend pages
// ──────────────────────────────────────────────────────────────────

async function checkFrontendPages() {
  section(`Layer 6: Frontend Pages (${FRONTEND_PAGES.length})`)

  // ملاحظة: الفرونت SPA — كل page يرجع نفس index.html
  // الفحص يتأكد فقط إن الفرونت يرد ويُحمَّل بنجاح
  for (const page of FRONTEND_PAGES) {
    const url = `${FRONTEND_URL}${page}`
    const start = Date.now()

    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        redirect: "follow",
      })
      const ms = Date.now() - start
      const ok = res.status >= 200 && res.status < 400

      if (ok) {
        results.frontend.ok.push({ page, status: res.status, ms })
        log(`✅ ${page.padEnd(35)} ${res.status}  ${ms}ms`)
      } else {
        results.frontend.failed.push({ page, status: res.status, ms })
        log(`❌ ${page.padEnd(35)} ${res.status}  ${ms}ms`)
        results.warnings.push(`Frontend page ${page} returned ${res.status}`)
      }
    } catch (err) {
      results.frontend.failed.push({ page, error: err.message })
      log(`💥 ${page.padEnd(35)} ${err.message}`)
    }
  }
}

// ──────────────────────────────────────────────────────────────────
//  FINAL REPORT
// ──────────────────────────────────────────────────────────────────

function printFinalReport() {
  header("📋 التقرير النهائي")

  // ── Endpoints ──
  const totalEndpoints = GET_ENDPOINTS.length
  const okCount = results.endpoints.ok.length
  const slowCount = results.endpoints.slow.length
  const failedCount = results.endpoints.failed.length
  const authCount = results.endpoints.auth_issues.length

  log("")
  log(`📊 Endpoints  (${totalEndpoints} إجمالي):`)
  log(`   ✅ شغّالة:        ${okCount}/${totalEndpoints}`)
  log(`   🐌 بطيئة:         ${slowCount}`)
  log(`   ❌ فاشلة:         ${failedCount}`)
  log(`   🔐 مشاكل auth:    ${authCount}`)

  // ── Performance ──
  log("")
  log(`⚡ الأداء:`)
  log(`   متوسط:    ${results.performance.average}ms`)
  log(`   أسرع:     ${results.performance.fastest}ms`)
  log(`   أبطأ:     ${results.performance.slowest}ms`)

  // ── Write tests ──
  const writeOk = results.writeTests.filter((t) => t.ok).length
  log("")
  log(`💾 اختبارات الكتابة: ${writeOk}/${results.writeTests.length}`)

  // ── Database ──
  log("")
  if (results.database.error) {
    log(`💾 قاعدة البيانات:  ❌ ${results.database.error}`)
  } else {
    log(`💾 قاعدة البيانات:  ${results.database.tables.length} جدول`)
    if (results.database.missing.length) {
      log(`   ⚠️  ${results.database.missing.length} جدول مفقود`)
    }
  }

  // ── Frontend ──
  log("")
  log(`🎨 الفرونت إند: ${results.frontend.ok.length}/${FRONTEND_PAGES.length} صفحة`)

  // ── Critical issues ──
  if (results.critical.length) {
    log("")
    log("🚨 مشاكل حرجة:")
    results.critical.forEach((c) => log(`   ❌ ${c}`))
  }

  // ── Warnings ──
  if (results.warnings.length) {
    log("")
    log(`⚠️  تحذيرات (${results.warnings.length}):`)
    results.warnings.slice(0, 20).forEach((w) => log(`   - ${w}`))
    if (results.warnings.length > 20) {
      log(`   ... وَ ${results.warnings.length - 20} تحذير آخر (شوف الملف الكامل)`)
    }
  }

  // ── Final verdict ──
  log("")
  log("═".repeat(70))

  if (results.critical.length === 0 && failedCount === 0) {
    log("  🎉 الداش بورد سليم — كل شيء يشتغل!")
  } else if (results.critical.length === 0) {
    log("  ✅ الداش بورد يشتغل، لكن في تحذيرات يمكن إصلاحها")
  } else {
    log(`  ⚠️  في ${results.critical.length} مشكلة حرجة تحتاج إصلاح فوري`)
  }
  log("═".repeat(70))
  log("")
  log(`📄 التقرير الكامل: ${REPORT_TXT}`)
  log(`📄 التقرير JSON:   ${REPORT_JSON}`)
}

// ──────────────────────────────────────────────────────────────────
//  MAIN
// ──────────────────────────────────────────────────────────────────

async function main() {
  header("🔍 Lyn Dashboard — Full Health Audit")
  log(`API:      ${API_URL}`)
  log(`Frontend: ${FRONTEND_URL}`)
  log(`Guild:    ${GUILD_ID}`)
  log(`Time:     ${new Date().toLocaleString("ar-SA")}`)

  await checkPublicHealth()
  await checkAllEndpoints()
  await runWriteTests()
  await checkDatabase()
  await checkFrontendPages()

  printFinalReport()

  // ── Save reports ──
  results.endTime = new Date().toISOString()
  fs.writeFileSync(REPORT_TXT, reportLines.join("\n"), "utf8")
  fs.writeFileSync(REPORT_JSON, JSON.stringify(results, null, 2), "utf8")
}

main().catch((err) => {
  console.error("💥 السكربت فشل:", err)
  process.exit(1)
})

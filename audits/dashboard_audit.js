// ══════════════════════════════════════════════════════════════════
//  Dashboard Audit — يفحص كل endpoints الداش بشكل آلي
//
//  الاستخدام:
//    node audits/dashboard_audit.js
//
//  ينتج تقرير كامل:
//   ✅ endpoints شغّالة
//   ❌ endpoints ترجع 500
//   ⚠️ endpoints بطيئة (+2s)
// ══════════════════════════════════════════════════════════════════

require("dotenv").config()

const API_URL = "https://lyn-api.onrender.com"
const GUILD_ID = "1490775708291694684" // Lyn Support
const TOKEN = process.env.DASHBOARD_TOKEN // من localStorage أو cookies في المتصفح

if (!TOKEN) {
  console.error("❌ DASHBOARD_TOKEN missing in .env")
  console.error("   احصل عليه: افتح الداش → F12 → Application → Local Storage → 'token'")
  process.exit(1)
}

// ─── كل GET endpoints المتاحة للسيرفر ───
const ENDPOINTS = [
  "/overview",
  "/protection",
  "/automod",
  "/welcome",
  "/logs",
  "/xp",
  "/economy",
  "/tickets",
  "/auto-role",
  "/reaction-roles",
  "/scheduler",
  "/embed",
  "/ai",
  "/events",
  "/giveaway",
  "/members",
  "/stats",
  "/audit",
  "/commands",
  "/settings",
]

const results = { ok: [], slow: [], failed: [] }

async function testEndpoint(path) {
  const url = `${API_URL}/api/guild/${GUILD_ID}${path}`
  const start = Date.now()

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${TOKEN}` },
      signal: AbortSignal.timeout(15000),
    })
    const ms = Date.now() - start

    if (res.status >= 500) {
      const body = await res.text().catch(() => "")
      results.failed.push({ path, status: res.status, ms, body: body.slice(0, 200) })
      console.log(`❌ ${path.padEnd(20)} ${res.status}  ${ms}ms`)
    } else if (res.status >= 400 && res.status !== 401 && res.status !== 403) {
      results.failed.push({ path, status: res.status, ms })
      console.log(`⚠️  ${path.padEnd(20)} ${res.status}  ${ms}ms`)
    } else if (ms > 2000) {
      results.slow.push({ path, status: res.status, ms })
      console.log(`🐌 ${path.padEnd(20)} ${res.status}  ${ms}ms (slow)`)
    } else {
      results.ok.push({ path, status: res.status, ms })
      console.log(`✅ ${path.padEnd(20)} ${res.status}  ${ms}ms`)
    }
  } catch (err) {
    results.failed.push({ path, error: err.message })
    console.log(`💥 ${path.padEnd(20)} ${err.message}`)
  }
}

async function main() {
  console.log(`\n🔍 فحص ${ENDPOINTS.length} endpoint للسيرفر ${GUILD_ID}\n`)

  for (const path of ENDPOINTS) {
    await testEndpoint(path)
  }

  console.log(`\n${"═".repeat(60)}`)
  console.log(`✅ شغّالة: ${results.ok.length}`)
  console.log(`🐌 بطيئة: ${results.slow.length}`)
  console.log(`❌ فشلت: ${results.failed.length}`)
  console.log(`${"═".repeat(60)}\n`)

  if (results.failed.length) {
    console.log("📋 تفاصيل الفشل:\n")
    for (const f of results.failed) {
      console.log(`  ${f.path}:`)
      console.log(`    Status: ${f.status || "N/A"}`)
      if (f.body) console.log(`    Body: ${f.body}`)
      if (f.error) console.log(`    Error: ${f.error}`)
      console.log()
    }
  }
}

main()
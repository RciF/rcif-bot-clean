// ══════════════════════════════════════════════════════════════════
//  Integration Audit — Lyn Bot
//  المسار: integration_audit.js
//
//  يفحص كل endpoints الحياة:
//   1. Bot API (rcif-bot-clean) — Health, Status, Diagnostics
//   2. Backend API (Lyn-api) — Health
//   3. Frontend (rcif-dashboard) — يصل
//   4. Bot ↔ Backend secret authentication
//   5. CORS — frontend → backend
//
//  Usage: node integration_audit.js
// ══════════════════════════════════════════════════════════════════

require("dotenv").config()

const ENDPOINTS = {
  bot: "https://rcif-bot-clean.onrender.com",
  backend: "https://lyn-api.onrender.com",
  frontend: "https://rcif-dashboard.onrender.com",
}

const BOT_SECRET = process.env.BOT_SECRET

const results = []

function log(category, status, message) {
  const icon = status === "ok" ? "✅" : status === "warn" ? "⚠️ " : "❌"
  const line = `${icon} [${category}] ${message}`
  console.log(line)
  results.push({ category, status, message })
}

async function checkBot() {
  console.log("\n" + "═".repeat(70))
  console.log("  1. BOT (rcif-bot-clean)")
  console.log("═".repeat(70))

  // Health
  try {
    const r = await fetch(`${ENDPOINTS.bot}/health`, {
      signal: AbortSignal.timeout(10000),
    })
    if (r.ok) {
      const data = await r.json()
      log("BOT", "ok", `/health → ${r.status} (system=${data.system?.status || "?"})`)
    } else {
      log("BOT", "fail", `/health → ${r.status}`)
    }
  } catch (err) {
    log("BOT", "fail", `/health → ${err.message}`)
  }

  // Status
  try {
    const r = await fetch(`${ENDPOINTS.bot}/status`, {
      signal: AbortSignal.timeout(10000),
    })
    if (r.ok) {
      const data = await r.json()
      log("BOT", "ok", `/status → ${r.status} (guilds=${data.guilds || "?"})`)
    } else {
      log("BOT", "fail", `/status → ${r.status}`)
    }
  } catch (err) {
    log("BOT", "fail", `/status → ${err.message}`)
  }

  // Diagnostics
  try {
    const r = await fetch(`${ENDPOINTS.bot}/diagnostics`, {
      signal: AbortSignal.timeout(10000),
    })
    if (r.ok) {
      const data = await r.json()
      log(
        "BOT",
        "ok",
        `/diagnostics → guilds=${data.guilds} users=${data.users} db=${data.database?.healthy ? "ok" : "fail"}`,
      )
    } else {
      log("BOT", "fail", `/diagnostics → ${r.status}`)
    }
  } catch (err) {
    log("BOT", "fail", `/diagnostics → ${err.message}`)
  }
}

async function checkBackend() {
  console.log("\n" + "═".repeat(70))
  console.log("  2. BACKEND (Lyn-api)")
  console.log("═".repeat(70))

  // Root
  try {
    const r = await fetch(`${ENDPOINTS.backend}/`, {
      signal: AbortSignal.timeout(10000),
    })
    if (r.ok) {
      log("BACKEND", "ok", `/ → ${r.status}`)
    } else {
      log("BACKEND", "warn", `/ → ${r.status}`)
    }
  } catch (err) {
    log("BACKEND", "fail", `/ → ${err.message}`)
  }

  // Health
  try {
    const r = await fetch(`${ENDPOINTS.backend}/api/health`, {
      signal: AbortSignal.timeout(10000),
    })
    log("BACKEND", r.ok ? "ok" : "warn", `/api/health → ${r.status}`)
  } catch (err) {
    log("BACKEND", "warn", `/api/health → ${err.message} (may not exist)`)
  }
}

async function checkFrontend() {
  console.log("\n" + "═".repeat(70))
  console.log("  3. FRONTEND (rcif-dashboard)")
  console.log("═".repeat(70))

  try {
    const r = await fetch(ENDPOINTS.frontend, {
      signal: AbortSignal.timeout(10000),
    })
    if (r.ok) {
      const html = await r.text()
      const hasReact = html.includes("root") || html.includes("vite")
      log("FRONTEND", "ok", `/ → ${r.status} ${hasReact ? "(SPA detected)" : ""}`)
    } else {
      log("FRONTEND", "fail", `/ → ${r.status}`)
    }
  } catch (err) {
    log("FRONTEND", "fail", `/ → ${err.message}`)
  }
}

async function checkBotSecret() {
  console.log("\n" + "═".repeat(70))
  console.log("  4. BOT SECRET AUTHENTICATION")
  console.log("═".repeat(70))

  if (!BOT_SECRET) {
    log("AUTH", "warn", "BOT_SECRET not in .env — skipping internal endpoint tests")
    return
  }

  // Without secret → expect 401
  try {
    const r = await fetch(`${ENDPOINTS.bot}/api/sync-subscription-role`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "test", planId: "free", status: "active" }),
      signal: AbortSignal.timeout(10000),
    })
    if (r.status === 401) {
      log("AUTH", "ok", "Bot rejects request without secret (401)")
    } else {
      log("AUTH", "fail", `Bot did NOT reject unauthorized request (${r.status})`)
    }
  } catch (err) {
    log("AUTH", "fail", `Auth test failed: ${err.message}`)
  }

  // With wrong secret → expect 401
  try {
    const r = await fetch(`${ENDPOINTS.bot}/api/sync-subscription-role`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-bot-secret": "wrong-secret-test-12345",
      },
      body: JSON.stringify({ userId: "test", planId: "free", status: "active" }),
      signal: AbortSignal.timeout(10000),
    })
    if (r.status === 401) {
      log("AUTH", "ok", "Bot rejects request with wrong secret (401)")
    } else {
      log("AUTH", "fail", `Bot did NOT reject wrong secret (${r.status})`)
    }
  } catch (err) {
    log("AUTH", "fail", `Wrong secret test failed: ${err.message}`)
  }

  // With correct secret → expect non-401
  try {
    const r = await fetch(`${ENDPOINTS.bot}/api/sync-subscription-role`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-bot-secret": BOT_SECRET,
      },
      body: JSON.stringify({ userId: "529320108032786433", planId: "free", status: "inactive" }),
      signal: AbortSignal.timeout(10000),
    })
    if (r.status !== 401) {
      log("AUTH", "ok", `Bot accepts correct secret (${r.status})`)
    } else {
      log("AUTH", "fail", "Bot rejects correct secret (401) — env mismatch?")
    }
  } catch (err) {
    log("AUTH", "fail", `Correct secret test failed: ${err.message}`)
  }
}

async function checkCORS() {
  console.log("\n" + "═".repeat(70))
  console.log("  5. CORS — Frontend → Backend")
  console.log("═".repeat(70))

  try {
    const r = await fetch(`${ENDPOINTS.backend}/api/health`, {
      method: "OPTIONS",
      headers: {
        Origin: ENDPOINTS.frontend,
        "Access-Control-Request-Method": "GET",
      },
      signal: AbortSignal.timeout(10000),
    })
    const allowOrigin = r.headers.get("access-control-allow-origin")
    if (allowOrigin) {
      log("CORS", "ok", `Backend allows origin: ${allowOrigin}`)
    } else {
      log("CORS", "warn", "Backend did not return Access-Control-Allow-Origin")
    }
  } catch (err) {
    log("CORS", "warn", `CORS preflight: ${err.message}`)
  }
}

async function main() {
  console.log("")
  console.log("═".repeat(70))
  console.log("  INTEGRATION AUDIT — Lyn Bot")
  console.log("═".repeat(70))
  console.log(`  Bot:      ${ENDPOINTS.bot}`)
  console.log(`  Backend:  ${ENDPOINTS.backend}`)
  console.log(`  Frontend: ${ENDPOINTS.frontend}`)

  await checkBot()
  await checkBackend()
  await checkFrontend()
  await checkBotSecret()
  await checkCORS()

  // Summary
  console.log("\n" + "═".repeat(70))
  console.log("  SUMMARY")
  console.log("═".repeat(70))

  const ok = results.filter((r) => r.status === "ok").length
  const warn = results.filter((r) => r.status === "warn").length
  const fail = results.filter((r) => r.status === "fail").length

  console.log(`  ✅ Passed:  ${ok}`)
  console.log(`  ⚠️  Warnings: ${warn}`)
  console.log(`  ❌ Failed:  ${fail}`)
  console.log("")

  if (fail === 0) {
    console.log("  🎉 الترابط نظيف!")
  } else {
    console.log("  ⚠️  فيه مشاكل تحتاج مراجعة")
  }
  console.log("")
}

main().catch((err) => {
  console.error("❌ Unexpected error:", err)
  process.exit(1)
})
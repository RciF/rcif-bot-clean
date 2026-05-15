// ══════════════════════════════════════════════════════════════════
//  Production Readiness Audit — Lyn Bot
//  المسار: production_audit.js
//
//  يفحص:
//   1. متغيرات .env الإلزامية
//   2. ملف .gitignore (يحمي .env)
//   3. وجود ملفات حساسة في git
//   4. الـ migrations مرتبة
//   5. حجم ملفات الكود
// ══════════════════════════════════════════════════════════════════

require("dotenv").config()

const fs = require("fs")
const path = require("path")
const { execSync } = require("child_process")

const results = { ok: 0, warn: 0, fail: 0 }

function log(category, status, message) {
  const icon = status === "ok" ? "✅" : status === "warn" ? "⚠️ " : "❌"
  console.log(`${icon} [${category}] ${message}`)
  results[status]++
}

// ─────────────────────────────────────────
//  1. ENV VARIABLES
// ─────────────────────────────────────────
console.log("\n" + "═".repeat(70))
console.log("  1. ENV VARIABLES")
console.log("═".repeat(70))

const REQUIRED_ENV = [
  "DISCORD_TOKEN",
  "DATABASE_URL",
  "OPENAI_API_KEY",
  "BOT_SECRET",
  "DASHBOARD_URL",
]

for (const key of REQUIRED_ENV) {
  if (process.env[key]) {
    const masked =
      key.includes("TOKEN") || key.includes("KEY") || key.includes("SECRET") || key.includes("PASSWORD")
        ? `set (${process.env[key].slice(0, 4)}***)`
        : `set (${process.env[key].slice(0, 30)})`
    log("ENV", "ok", `${key} → ${masked}`)
  } else {
    log("ENV", "fail", `${key} → MISSING`)
  }
}

// ─────────────────────────────────────────
//  2. .gitignore PROTECTION
// ─────────────────────────────────────────
console.log("\n" + "═".repeat(70))
console.log("  2. .gitignore PROTECTION")
console.log("═".repeat(70))

const gitignorePath = path.join(__dirname, ".gitignore")
if (fs.existsSync(gitignorePath)) {
  const content = fs.readFileSync(gitignorePath, "utf8")
  const required = [".env", "node_modules"]
  for (const item of required) {
    if (content.includes(item)) {
      log("GITIGNORE", "ok", `${item} → protected`)
    } else {
      log("GITIGNORE", "fail", `${item} → NOT in .gitignore!`)
    }
  }
} else {
  log("GITIGNORE", "fail", ".gitignore missing!")
}

// ─────────────────────────────────────────
//  3. CHECK SECRETS IN GIT
// ─────────────────────────────────────────
console.log("\n" + "═".repeat(70))
console.log("  3. SECRETS IN GIT")
console.log("═".repeat(70))

try {
  const tracked = execSync("git ls-files", { encoding: "utf8" })
  if (tracked.includes(".env\n") || tracked.includes(".env\r")) {
    log("SECRETS", "fail", ".env is TRACKED in git! ⚠️ Remove immediately")
  } else {
    log("SECRETS", "ok", ".env not tracked")
  }

  if (tracked.includes("node_modules")) {
    log("SECRETS", "fail", "node_modules tracked in git")
  } else {
    log("SECRETS", "ok", "node_modules not tracked")
  }
} catch (err) {
  log("SECRETS", "warn", `Git check failed: ${err.message}`)
}

// ─────────────────────────────────────────
//  4. MIGRATIONS ORDER
// ─────────────────────────────────────────
console.log("\n" + "═".repeat(70))
console.log("  4. MIGRATIONS")
console.log("═".repeat(70))

const migDir = path.join(__dirname, "systems", "migrations")
if (fs.existsSync(migDir)) {
  const files = fs
    .readdirSync(migDir)
    .filter((f) => f.endsWith(".js") && !f.startsWith("_"))
    .sort()

  log("MIGRATIONS", "ok", `Found ${files.length} migrations`)

  // فحص الترتيب
  let expectedNum = 1
  let gaps = []
  for (const f of files) {
    const match = f.match(/^(\d+)_/)
    if (match) {
      const num = parseInt(match[1])
      if (num !== expectedNum) {
        gaps.push(`Expected ${String(expectedNum).padStart(3, "0")}, got ${String(num).padStart(3, "0")}`)
      }
      expectedNum = num + 1
    }
  }

  if (gaps.length === 0) {
    log("MIGRATIONS", "ok", "Numbers sequential (1, 2, 3, ...)")
  } else {
    for (const g of gaps) {
      log("MIGRATIONS", "warn", g)
    }
  }
} else {
  log("MIGRATIONS", "fail", "migrations directory missing")
}

// ─────────────────────────────────────────
//  5. PACKAGE.JSON
// ─────────────────────────────────────────
console.log("\n" + "═".repeat(70))
console.log("  5. PACKAGE.JSON")
console.log("═".repeat(70))

const pkgPath = path.join(__dirname, "package.json")
if (fs.existsSync(pkgPath)) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"))

  if (pkg.scripts?.start) {
    log("PACKAGE", "ok", `start script: ${pkg.scripts.start}`)
  } else {
    log("PACKAGE", "fail", "no start script")
  }

  if (pkg.engines?.node) {
    log("PACKAGE", "ok", `Node version: ${pkg.engines.node}`)
  } else {
    log("PACKAGE", "warn", "no Node engine specified")
  }

  const deps = Object.keys(pkg.dependencies || {})
  log("PACKAGE", "ok", `${deps.length} dependencies`)

  const requiredDeps = ["discord.js", "openai", "pg", "express", "dotenv"]
  for (const d of requiredDeps) {
    if (deps.includes(d)) {
      log("PACKAGE", "ok", `${d} → ${pkg.dependencies[d]}`)
    } else {
      log("PACKAGE", "fail", `${d} → MISSING`)
    }
  }
} else {
  log("PACKAGE", "fail", "package.json missing")
}

// ─────────────────────────────────────────
//  6. FILE SIZES (catch bloat)
// ─────────────────────────────────────────
console.log("\n" + "═".repeat(70))
console.log("  6. LARGE FILES")
console.log("═".repeat(70))

function findLargeFiles(dir, depth = 0) {
  if (depth > 3) return
  const items = fs.readdirSync(dir, { withFileTypes: true })
  for (const item of items) {
    if (item.name === "node_modules" || item.name === ".git" || item.name.startsWith(".")) continue
    const full = path.join(dir, item.name)
    if (item.isDirectory()) {
      findLargeFiles(full, depth + 1)
    } else if (item.isFile()) {
      const size = fs.statSync(full).size
      if (size > 100 * 1024) {
        // > 100KB
        const rel = path.relative(__dirname, full)
        log("SIZE", "warn", `${rel} → ${(size / 1024).toFixed(1)} KB`)
      }
    }
  }
}

findLargeFiles(__dirname)
if (results.warn === 0) {
  log("SIZE", "ok", "No files > 100KB")
}

// ─────────────────────────────────────────
//  SUMMARY
// ─────────────────────────────────────────
console.log("\n" + "═".repeat(70))
console.log("  SUMMARY")
console.log("═".repeat(70))
console.log(`  ✅ Passed:    ${results.ok}`)
console.log(`  ⚠️  Warnings: ${results.warn}`)
console.log(`  ❌ Failed:    ${results.fail}`)
console.log("")

if (results.fail === 0) {
  console.log("  🎉 جاهز للإنتاج!")
} else {
  console.log("  ⚠️  فيه مشاكل تحتاج إصلاح قبل الإنتاج")
}
console.log("")
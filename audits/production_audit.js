// ══════════════════════════════════════════════════════════════════
//  Production Readiness Audit — Lyn Bot (UPDATED)
//  المسار: audits/production_audit.js
//
//  يفحص:
//   1. متغيرات .env الإلزامية
//   2. ملف .gitignore (يحمي .env)
//   3. وجود ملفات حساسة في git
//   4. الـ migrations مرتبة (المسار الصحيح)
//   5. حجم ملفات الكود
//   6. package.json
//
//  ✅ FIXED:
//   - يفحص المسار الصحيح: systems/migrations/migrations/
//   - يفرّق بين REQUIRED و OPTIONAL env vars
//   - يفحص migrationSystem.js و _runner.js موجودين
// ══════════════════════════════════════════════════════════════════

require("dotenv").config()

const fs = require("fs")
const path = require("path")
const { execSync } = require("child_process")

const ROOT_DIR = path.join(__dirname, "..")
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

// متغيرات إلزامية — البوت ما يشتغل بدونها
const REQUIRED_ENV = [
  "DISCORD_TOKEN",
  "DATABASE_URL",
  "OPENAI_API_KEY",
  "CLIENT_ID",
]

// متغيرات اختيارية — لكن مهمة في الإنتاج
const OPTIONAL_ENV = [
  "BOT_SECRET",      // للتواصل بين البوت والداش-باك
  "DASHBOARD_URL",   // للـ usage tracking
  "CLIENT_SECRET",   // للـ OAuth
  "OWNER_ID",        // للأوامر السرية
  "FRONTEND_URL",    // للـ CORS
  "REDIRECT_URI",    // للـ OAuth callback
]

for (const key of REQUIRED_ENV) {
  if (process.env[key]) {
    const masked =
      key.includes("TOKEN") || key.includes("KEY") || key.includes("SECRET") || key.includes("PASSWORD") || key.includes("URL")
        ? `set (${process.env[key].slice(0, 4)}***)`
        : `set (${process.env[key].slice(0, 30)})`
    log("ENV-REQUIRED", "ok", `${key} → ${masked}`)
  } else {
    log("ENV-REQUIRED", "fail", `${key} → MISSING (إلزامي!)`)
  }
}

console.log("")

for (const key of OPTIONAL_ENV) {
  if (process.env[key]) {
    const masked =
      key.includes("TOKEN") || key.includes("KEY") || key.includes("SECRET")
        ? `set (${process.env[key].slice(0, 4)}***)`
        : `set (${process.env[key].slice(0, 50)})`
    log("ENV-OPTIONAL", "ok", `${key} → ${masked}`)
  } else {
    log("ENV-OPTIONAL", "warn", `${key} → MISSING (موصى به للإنتاج)`)
  }
}

// ─────────────────────────────────────────
//  2. .gitignore PROTECTION
// ─────────────────────────────────────────
console.log("\n" + "═".repeat(70))
console.log("  2. .gitignore PROTECTION")
console.log("═".repeat(70))

const gitignorePath = path.join(ROOT_DIR, ".gitignore")
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
  const tracked = execSync("git ls-files", { encoding: "utf8", cwd: ROOT_DIR })
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
//  4. MIGRATIONS (المسار الصحيح)
// ─────────────────────────────────────────
console.log("\n" + "═".repeat(70))
console.log("  4. MIGRATIONS")
console.log("═".repeat(70))

// المسار الصحيح الذي يقرأه _runner.js
const migDir = path.join(ROOT_DIR, "systems", "migrations", "migrations")
const oldMigDir = path.join(ROOT_DIR, "systems", "migrations")
const runnerPath = path.join(migDir, "_runner.js")
const migrationSystemPath = path.join(ROOT_DIR, "systems", "migrationSystem.js")

if (!fs.existsSync(migDir)) {
  log("MIGRATIONS", "fail", "systems/migrations/migrations/ directory missing")
} else {
  if (!fs.existsSync(runnerPath)) {
    log("MIGRATIONS", "fail", "_runner.js missing inside migrations/")
  } else {
    log("MIGRATIONS", "ok", "_runner.js exists")
  }

  if (!fs.existsSync(migrationSystemPath)) {
    log("MIGRATIONS", "fail", "systems/migrationSystem.js missing")
  } else {
    log("MIGRATIONS", "ok", "migrationSystem.js exists (entry point)")
  }

  const files = fs
    .readdirSync(migDir)
    .filter((f) => f.endsWith(".js") && !f.startsWith("_"))
    .sort()

  log("MIGRATIONS", "ok", `Found ${files.length} migrations في المسار الصحيح`)

  // فحص الترتيب
  const numbers = []
  for (const f of files) {
    const match = f.match(/^(\d+)_/)
    if (match) numbers.push({ file: f, num: parseInt(match[1]) })
  }

  // التحقق من عدم وجود أرقام مكررة
  const seenNums = new Set()
  const duplicates = []
  for (const { file, num } of numbers) {
    if (seenNums.has(num)) {
      duplicates.push({ file, num })
    } else {
      seenNums.add(num)
    }
  }

  if (duplicates.length > 0) {
    for (const d of duplicates) {
      log("MIGRATIONS", "fail", `Duplicate number ${String(d.num).padStart(3, "0")}: ${d.file}`)
    }
  } else {
    log("MIGRATIONS", "ok", "No duplicate migration numbers")
  }

  // فحص: هل فيه ملفات مكررة في المسار الأعلى (systems/migrations/*.js)؟
  if (fs.existsSync(oldMigDir)) {
    const oldFiles = fs
      .readdirSync(oldMigDir)
      .filter((f) => f.endsWith(".js") && !f.startsWith("_") && f !== "migrationSystem.js")

    if (oldFiles.length > 0) {
      log("MIGRATIONS", "warn", `${oldFiles.length} ملف migration قديم في المسار الأعلى (systems/migrations/) — مش بيشتغل!`)
      for (const f of oldFiles.slice(0, 5)) {
        log("MIGRATIONS", "warn", `  → ${f} (يجب حذفه)`)
      }
      if (oldFiles.length > 5) {
        log("MIGRATIONS", "warn", `  + ${oldFiles.length - 5} ملف آخر`)
      }
    } else {
      log("MIGRATIONS", "ok", "لا توجد ملفات migration قديمة في المسار الأعلى")
    }
  }
}

// ─────────────────────────────────────────
//  5. PACKAGE.JSON
// ─────────────────────────────────────────
console.log("\n" + "═".repeat(70))
console.log("  5. PACKAGE.JSON")
console.log("═".repeat(70))

const pkgPath = path.join(ROOT_DIR, "package.json")
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

let largeFilesFound = 0

function findLargeFiles(dir, depth = 0) {
  if (depth > 3) return
  let items
  try {
    items = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const item of items) {
    if (item.name === "node_modules" || item.name === ".git" || item.name.startsWith(".")) continue
    if (item.name === "dashboard-frontend" || item.name === "package-lock.json") continue
    const full = path.join(dir, item.name)
    if (item.isDirectory()) {
      findLargeFiles(full, depth + 1)
    } else if (item.isFile()) {
      const size = fs.statSync(full).size
      if (size > 100 * 1024) {
        // > 100KB
        const rel = path.relative(ROOT_DIR, full)
        log("SIZE", "warn", `${rel} → ${(size / 1024).toFixed(1)} KB`)
        largeFilesFound++
      }
    }
  }
}

findLargeFiles(ROOT_DIR)
if (largeFilesFound === 0) {
  log("SIZE", "ok", "No files > 100KB في كود البوت")
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

if (results.fail === 0 && results.warn === 0) {
  console.log("  🎉 جاهز للإنتاج 100%!")
} else if (results.fail === 0) {
  console.log("  ✅ جاهز للإنتاج (مع ملاحظات اختيارية)")
} else {
  console.log("  ⚠️  فيه مشاكل تحتاج إصلاح قبل الإنتاج")
}
console.log("")
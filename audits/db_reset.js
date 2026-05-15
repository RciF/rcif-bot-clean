// ══════════════════════════════════════════════════════════════════
//  Database Reset Script — Lyn Bot
//  المسار: db_reset.js
//
//  الاستخدام:
//    node db_reset.js
//
//  ⚠️ تحذير: هذا السكريبت يحذف كل البيانات!
//     استخدمه فقط بعد:
//     1. أخذ نسخة احتياطية من Render
//     2. تأكيد إنك لا تحتاج البيانات الحالية
//
//  ما يفعله:
//   1. يطلب تأكيد من المستخدم
//   2. يحذف كل الجداول في الـ public schema
//   3. ينتظر — بعدها تشغّل البوت ليُنشئ الجداول من migrations
// ══════════════════════════════════════════════════════════════════

require("dotenv").config()
const { Client } = require("pg")
const readline = require("readline")

const dbUrl = process.env.DATABASE_URL

if (!dbUrl) {
  console.error("❌ DATABASE_URL غير موجود في .env")
  process.exit(1)
}

function ask(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

async function main() {
  console.log("")
  console.log("═".repeat(70))
  console.log("  ⚠️  DATABASE RESET — هذا يحذف كل شي!")
  console.log("═".repeat(70))
  console.log("")
  console.log("  هذا السكريبت سيحذف:")
  console.log("  • كل الجداول")
  console.log("  • كل البيانات")
  console.log("  • كل الـ indexes والـ sequences")
  console.log("")
  console.log("  بعدها لازم تشغّل البوت ليُعيد إنشاء الجداول من migrations.")
  console.log("")

  const confirm1 = await ask("اكتب RESET للتأكيد: ")
  if (confirm1 !== "RESET") {
    console.log("❌ تم الإلغاء")
    process.exit(0)
  }

  const confirm2 = await ask("هل أخذت نسخة احتياطية من Render؟ (yes/no): ")
  if (confirm2.toLowerCase() !== "yes") {
    console.log("❌ تم الإلغاء — خذ نسخة احتياطية أولاً")
    process.exit(0)
  }

  console.log("")
  console.log("🔌 جاري الاتصال...")

  const client = new Client({
    connectionString: dbUrl,
    ssl: dbUrl.includes("render.com") ? { rejectUnauthorized: false } : false,
  })

  try {
    await client.connect()
  } catch (err) {
    console.error("❌ فشل الاتصال:", err.message)
    process.exit(1)
  }

  console.log("✅ متصل")
  console.log("")
  console.log("🗑️  جاري حذف كل الجداول...")

  try {
    // ─── حذف وإعادة إنشاء الـ public schema ───
    // هذا أسرع وأنظف من DROP TABLE لكل جدول
    await client.query("DROP SCHEMA public CASCADE;")
    await client.query("CREATE SCHEMA public;")
    await client.query("GRANT ALL ON SCHEMA public TO public;")

    console.log("✅ تم حذف كل الجداول")
    console.log("")
    console.log("═".repeat(70))
    console.log("  ✅ DATABASE RESET COMPLETE")
    console.log("═".repeat(70))
    console.log("")
    console.log("  الخطوة التالية:")
    console.log("  1. ادفع التحديثات (migrations الجديدة + _runner.js)")
    console.log("  2. أعد deploy البوت في Render")
    console.log("  3. البوت راح يشغّل كل الـ migrations عند الإقلاع")
    console.log("  4. شغّل db_audit.js للتحقق")
    console.log("")
  } catch (err) {
    console.error("❌ خطأ:", err.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}

main().catch((err) => {
  console.error("❌ خطأ غير متوقع:", err)
  process.exit(1)
})
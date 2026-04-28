const database = require("./databaseSystem")
const { ALL_ITEMS } = require("../config/economyConfig")
const logger = require("./loggerSystem")

const SALE_COUNT = 3
const MIN_DISCOUNT = 10
const MAX_DISCOUNT = 40

// ✅ تحقق هل اليوم جمعة
function isFriday() {
  return new Date().getDay() === 5
}

// ✅ جلب عروض الجمعة الحالية
async function getSales() {
  try {
    const rows = await database.queryMany("SELECT * FROM friday_sales")
    return rows || []
  } catch {
    return []
  }
}

// ✅ توليد عروض جديدة عشوائية
async function generateSales() {
  try {
    const items = Object.values(ALL_ITEMS)
    const shuffled = items.sort(() => Math.random() - 0.5).slice(0, SALE_COUNT)

    await database.execute("DELETE FROM friday_sales")

    const now = Date.now()

    for (const item of shuffled) {
      const discount = Math.floor(Math.random() * (MAX_DISCOUNT - MIN_DISCOUNT + 1)) + MIN_DISCOUNT
      await database.execute(
        "INSERT INTO friday_sales (item_id, discount, created_at) VALUES ($1, $2, $3)",
        [item.id, discount, now]
      )
    }

    logger.info("FRIDAY_SALES_GENERATED", { count: SALE_COUNT })

  } catch (error) {
    logger.error("FRIDAY_SALES_GENERATE_FAILED", { error: error.message })
  }
}

// ✅ جلب خصم عنصر معين (يرجع 0 لو ما فيه خصم)
async function getItemDiscount(itemId) {
  if (!isFriday()) return 0

  try {
    const row = await database.queryOne(
      "SELECT discount FROM friday_sales WHERE item_id = $1",
      [itemId]
    )
    return row?.discount || 0
  } catch {
    return 0
  }
}

// ✅ حساب السعر بعد الخصم
function applyDiscount(price, discount) {
  if (!discount) return price
  return Math.floor(price * (1 - discount / 100))
}

// ✅ تشغيل الـ scheduler
function startScheduler() {
  // كل ساعة نتحقق
  setInterval(async () => {
    const now = new Date()
    const day = now.getDay()
    const hour = now.getHours()
    const minute = now.getMinutes()

    // الجمعة الساعة 00:00 → نولّد عروض جديدة
    if (day === 5 && hour === 0 && minute === 0) {
      logger.info("FRIDAY_SALES_GENERATING")
      await generateSales()
    }

    // السبت الساعة 00:00 → نحذف العروض
    if (day === 6 && hour === 0 && minute === 0) {
      await database.execute("DELETE FROM friday_sales")
      logger.info("FRIDAY_SALES_CLEARED")
    }

  }, 60 * 1000) // كل دقيقة

  logger.info("FRIDAY_SALE_SCHEDULER_STARTED")
}

module.exports = {
  isFriday,
  getSales,
  generateSales,
  getItemDiscount,
  applyDiscount,
  startScheduler
}

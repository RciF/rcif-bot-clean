// ═══════════════════════════════════════════════════════════
//  ECONOMY CONFIG — نظام الاقتصاد والتقدم الكامل
//  سيارة → بيت → شارع → حي → قرية → مدينة →
//  محافظة → منطقة → دولة → قارة → العالم
// ═══════════════════════════════════════════════════════════

// ─── الثوابت ───
const DAILY_REWARD = 500
const DAILY_COOLDOWN = 24 * 60 * 60 * 1000
const WORK_COOLDOWN = 60 * 60 * 1000
const WORK_MIN = 50
const WORK_MAX = 300
const HOUSE_CAR_LIMIT = 5
const PALACE_CAR_LIMIT = 20
const WORLD_CONTINENTS_REQUIRED = 7

// ─── فئات العناصر ───
const CATEGORIES = {
  car_economy: { name: "🚗 سيارات اقتصادية", emoji: "🚗", order: 1 },
  car_mid: { name: "🚗 سيارات متوسطة", emoji: "🚗", order: 2 },
  car_luxury: { name: "🚘 سيارات فاخرة", emoji: "🚘", order: 3 },
  car_super: { name: "🏎️ سيارات فائقة الفخامة", emoji: "🏎️", order: 4 },
  house: { name: "🏠 عقارات", emoji: "🏠", order: 5 },
  infrastructure: { name: "🛣️ بنية تحتية", emoji: "🛣️", order: 6 },
}

// ═══════════════════════════════════════════════════════════
//  🚗 السيارات
// ═══════════════════════════════════════════════════════════

const CARS = {

  // ── اقتصادية (ما تحتاج شيء) ──
  daihatsu: {
    id: "daihatsu",
    name: "دايهاتسو",
    emoji: "🚗",
    price: 800,
    category: "car_economy",
    requires: null,
    requiresText: "بدون شروط",
    description: "سيارة اقتصادية صغيرة — بداية الرحلة"
  },
  corolla: {
    id: "corolla",
    name: "تويوتا كورولا",
    emoji: "🚗",
    price: 2000,
    category: "car_economy",
    requires: null,
    requiresText: "بدون شروط",
    description: "سيارة عملية وموثوقة"
  },
  accent: {
    id: "accent",
    name: "هيونداي اكسنت",
    emoji: "🚗",
    price: 1500,
    category: "car_economy",
    requires: null,
    requiresText: "بدون شروط",
    description: "سيارة اقتصادية كورية"
  },
  rio: {
    id: "rio",
    name: "كيا ريو",
    emoji: "🚗",
    price: 1800,
    category: "car_economy",
    requires: null,
    requiresText: "بدون شروط",
    description: "سيارة صغيرة وعملية"
  },

  // ── متوسطة (تحتاج بيت) ──
  camry: {
    id: "camry",
    name: "تويوتا كامري",
    emoji: "🚗",
    price: 8000,
    category: "car_mid",
    requires: "house",
    requiresText: "يتطلب امتلاك بيت",
    description: "سيارة عائلية مريحة"
  },
  accord: {
    id: "accord",
    name: "هوندا أكورد",
    emoji: "🚗",
    price: 9500,
    category: "car_mid",
    requires: "house",
    requiresText: "يتطلب امتلاك بيت",
    description: "سيارة يابانية أنيقة"
  },
  mazda6: {
    id: "mazda6",
    name: "مازدا 6",
    emoji: "🚗",
    price: 10000,
    category: "car_mid",
    requires: "house",
    requiresText: "يتطلب امتلاك بيت",
    description: "سيارة رياضية أنيقة"
  },

  // ── فاخرة (تحتاج بيت) ──
  mercedes_c: {
    id: "mercedes_c",
    name: "مرسيدس C200",
    emoji: "🚘",
    price: 40000,
    category: "car_luxury",
    requires: "house",
    requiresText: "يتطلب امتلاك بيت",
    description: "فخامة ألمانية"
  },
  bmw_5: {
    id: "bmw_5",
    name: "BMW 520",
    emoji: "🚘",
    price: 45000,
    category: "car_luxury",
    requires: "house",
    requiresText: "يتطلب امتلاك بيت",
    description: "أداء وفخامة"
  },
  audi_a6: {
    id: "audi_a6",
    name: "أودي A6",
    emoji: "🚘",
    price: 42000,
    category: "car_luxury",
    requires: "house",
    requiresText: "يتطلب امتلاك بيت",
    description: "تقنية ألمانية متقدمة"
  },
  lexus_es: {
    id: "lexus_es",
    name: "لكزس ES",
    emoji: "🚘",
    price: 38000,
    category: "car_luxury",
    requires: "house",
    requiresText: "يتطلب امتلاك بيت",
    description: "فخامة يابانية هادئة"
  },

  // ── فائقة الفخامة (تحتاج قصر) ──
  lamborghini: {
    id: "lamborghini",
    name: "لمبورغيني",
    emoji: "🏎️",
    price: 500000,
    category: "car_super",
    requires: "palace",
    requiresText: "يتطلب امتلاك قصر",
    description: "وحش إيطالي خارق"
  },
  ferrari: {
    id: "ferrari",
    name: "فيراري",
    emoji: "🏎️",
    price: 480000,
    category: "car_super",
    requires: "palace",
    requiresText: "يتطلب امتلاك قصر",
    description: "أسطورة السرعة الإيطالية"
  },
  bugatti: {
    id: "bugatti",
    name: "بوغاتي",
    emoji: "🏎️",
    price: 2000000,
    category: "car_super",
    requires: "palace",
    requiresText: "يتطلب امتلاك قصر",
    description: "أغلى وأسرع سيارة في العالم"
  },
  rolls_royce: {
    id: "rolls_royce",
    name: "رولز رويس",
    emoji: "🏎️",
    price: 800000,
    category: "car_super",
    requires: "palace",
    requiresText: "يتطلب امتلاك قصر",
    description: "قمة الفخامة البريطانية"
  },
}

// ═══════════════════════════════════════════════════════════
//  🏠 العقارات
// ═══════════════════════════════════════════════════════════

const PROPERTIES = {
  small_house: {
    id: "small_house",
    name: "بيت صغير",
    emoji: "🏠",
    price: 15000,
    category: "house",
    requires: null,
    requiresText: "بدون شروط",
    carCapacity: HOUSE_CAR_LIMIT,
    description: "بيت بسيط يتسع لـ 5 سيارات"
  },
  medium_house: {
    id: "medium_house",
    name: "بيت متوسط",
    emoji: "🏡",
    price: 35000,
    category: "house",
    requires: null,
    requiresText: "بدون شروط",
    carCapacity: HOUSE_CAR_LIMIT,
    description: "بيت عائلي مريح يتسع لـ 5 سيارات"
  },
  villa: {
    id: "villa",
    name: "فيلا",
    emoji: "🏘️",
    price: 120000,
    category: "house",
    requires: "street",
    requiresText: "يتطلب امتلاك شارع",
    carCapacity: HOUSE_CAR_LIMIT,
    description: "فيلا فاخرة"
  },
  palace: {
    id: "palace",
    name: "قصر",
    emoji: "🏰",
    price: 1000000,
    category: "house",
    requires: "city",
    requiresText: "يتطلب امتلاك مدينة",
    carCapacity: PALACE_CAR_LIMIT,
    description: "قصر ملكي يتسع لـ 20 سيارة ويفتح السيارات الفائقة"
  },
}

// ═══════════════════════════════════════════════════════════
//  🛣️ البنية التحتية
// ═══════════════════════════════════════════════════════════

const INFRASTRUCTURE = {
  street: {
    id: "street",
    name: "شارع",
    emoji: "🛣️",
    price: 80000,
    category: "infrastructure",
    requires: { type: "full_houses", count: 2 },
    requiresText: "يتطلب بيتين ممتلئين بالسيارات",
    description: "شارع خاص فيك"
  },
  neighborhood: {
    id: "neighborhood",
    name: "حي",
    emoji: "🏘️",
    price: 300000,
    category: "infrastructure",
    requires: { type: "item", item: "street", count: 3 },
    requiresText: "يتطلب 3 شوارع",
    description: "حي كامل تحت إدارتك"
  },
  village: {
    id: "village",
    name: "قرية",
    emoji: "🏕️",
    price: 900000,
    category: "infrastructure",
    requires: { type: "item", item: "neighborhood", count: 2 },
    requiresText: "يتطلب حيين",
    description: "قرية صغيرة"
  },
  city: {
    id: "city",
    name: "مدينة",
    emoji: "🌆",
    price: 5000000,
    category: "infrastructure",
    requires: { type: "item", item: "village", count: 3 },
    requiresText: "يتطلب 3 قرى",
    description: "مدينة كاملة تحت حكمك"
  },
  province: {
    id: "province",
    name: "محافظة",
    emoji: "🏛️",
    price: 20000000,
    category: "infrastructure",
    requires: { type: "item", item: "city", count: 2 },
    requiresText: "يتطلب مدينتين",
    description: "محافظة بكل مرافقها"
  },
  region: {
    id: "region",
    name: "منطقة",
    emoji: "🗺️",
    price: 80000000,
    category: "infrastructure",
    requires: { type: "item", item: "province", count: 3 },
    requiresText: "يتطلب 3 محافظات",
    description: "منطقة إدارية ضخمة"
  },
  country: {
    id: "country",
    name: "دولة",
    emoji: "🏳️",
    price: 500000000,
    category: "infrastructure",
    requires: { type: "item", item: "region", count: 2 },
    requiresText: "يتطلب منطقتين",
    description: "دولة بعلمها وحدودها"
  },
  continent: {
    id: "continent",
    name: "قارة",
    emoji: "🌍",
    price: 3000000000,
    category: "infrastructure",
    requires: { type: "item", item: "country", count: 3 },
    requiresText: "يتطلب 3 دول",
    description: "قارة كاملة تحت سيطرتك"
  },
}

// ═══════════════════════════════════════════════════════════
//  كل العناصر مجمعة
// ═══════════════════════════════════════════════════════════

const ALL_ITEMS = {
  ...CARS,
  ...PROPERTIES,
  ...INFRASTRUCTURE,
}

// ═══════════════════════════════════════════════════════════
//  أنواع العقارات السكنية (للتحقق من شرط "بيت")
// ═══════════════════════════════════════════════════════════

const HOUSE_TYPES = ["small_house", "medium_house", "villa", "palace"]
const CAR_CATEGORIES = ["car_economy", "car_mid", "car_luxury", "car_super"]

// ═══════════════════════════════════════════════════════════
//  دالة التحقق من الشروط
// ═══════════════════════════════════════════════════════════

function checkRequirement(item, playerAssets) {
  const req = item.requires

  // ما فيه شرط
  if (!req) return { allowed: true, message: null }

  // ─── شرط نصي بسيط (مثل "house", "palace", "street", "city") ───
  if (typeof req === "string") {
    let hasIt = false

    if (req === "house") {
      hasIt = playerAssets.some(a => HOUSE_TYPES.includes(a.item_id) && a.quantity > 0)
      if (!hasIt) return { allowed: false, message: "❌ لازم تملك **بيت** أولاً عشان تشتري هذا العنصر" }
    }
    else if (req === "palace") {
      hasIt = playerAssets.some(a => a.item_id === "palace" && a.quantity > 0)
      if (!hasIt) return { allowed: false, message: "❌ لازم تملك **قصر** أولاً عشان تشتري السيارات الفائقة" }
    }
    else if (req === "street") {
      hasIt = playerAssets.some(a => a.item_id === "street" && a.quantity > 0)
      if (!hasIt) return { allowed: false, message: "❌ لازم تملك **شارع** أولاً" }
    }
    else if (req === "city") {
      hasIt = playerAssets.some(a => a.item_id === "city" && a.quantity > 0)
      if (!hasIt) return { allowed: false, message: "❌ لازم تملك **مدينة** أولاً عشان تشتري القصر" }
    }
    else {
      hasIt = playerAssets.some(a => a.item_id === req && a.quantity > 0)
      if (!hasIt) return { allowed: false, message: `❌ لازم تملك **${ALL_ITEMS[req]?.name || req}** أولاً` }
    }

    return { allowed: true, message: null }
  }

  // ─── شرط مركب (object) ───
  if (typeof req === "object") {

    // بيوت ممتلئة بالسيارات
    if (req.type === "full_houses") {
      const houses = playerAssets.filter(a => HOUSE_TYPES.includes(a.item_id))
      const totalHouses = houses.reduce((sum, h) => sum + (h.quantity || 0), 0)

      const totalCars = playerAssets
        .filter(a => {
          const def = ALL_ITEMS[a.item_id]
          return def && CAR_CATEGORIES.includes(def.category)
        })
        .reduce((sum, c) => sum + (c.quantity || 0), 0)

      const fullHouses = Math.min(totalHouses, Math.floor(totalCars / HOUSE_CAR_LIMIT))

      if (fullHouses < req.count) {
        return {
          allowed: false,
          message: `❌ لازم تملك **${req.count} بيوت ممتلئة بالسيارات** (عندك ${fullHouses} بيت ممتلئ)\nكل بيت يتسع لـ ${HOUSE_CAR_LIMIT} سيارات`
        }
      }
      return { allowed: true, message: null }
    }

    // عدد معين من عنصر محدد
    if (req.type === "item") {
      const owned = playerAssets.find(a => a.item_id === req.item)
      const qty = owned?.quantity || 0

      if (qty < req.count) {
        const itemName = ALL_ITEMS[req.item]?.name || req.item
        return {
          allowed: false,
          message: `❌ لازم تملك **${req.count} ${itemName}** (عندك ${qty})`
        }
      }
      return { allowed: true, message: null }
    }
  }

  return { allowed: true, message: null }
}

// ═══════════════════════════════════════════════════════════
//  دالة التحقق من سعة السيارات
// ═══════════════════════════════════════════════════════════

function checkCarCapacity(playerAssets) {
  // عدد السيارات الحالية
  const totalCars = playerAssets
    .filter(a => {
      const def = ALL_ITEMS[a.item_id]
      return def && CAR_CATEGORIES.includes(def.category)
    })
    .reduce((sum, c) => sum + (c.quantity || 0), 0)

  // السيارة الأولى مسموحة بدون بيت
  if (totalCars === 0) return { allowed: true, message: null, capacity: 1 }

  // حساب السعة الإجمالية
  let totalCapacity = 0

  for (const asset of playerAssets) {
    const def = ALL_ITEMS[asset.item_id]
    if (def && def.carCapacity) {
      totalCapacity += def.carCapacity * (asset.quantity || 0)
    }
  }

  // لو ما عنده بيت بس عنده سيارة وحدة — ما يقدر يشتري ثانية
  if (totalCapacity === 0 && totalCars >= 1) {
    return {
      allowed: false,
      message: "❌ لازم تشتري **بيت** أولاً عشان تقدر تشتري سيارة ثانية\n🏠 كل بيت يتسع لـ 5 سيارات",
      capacity: 0
    }
  }

  if (totalCars >= totalCapacity) {
    return {
      allowed: false,
      message: `❌ كل بيوتك ممتلئة بالسيارات! (${totalCars}/${totalCapacity})\n🏠 اشترِ بيت جديد عشان تقدر تضيف سيارات`,
      capacity: totalCapacity
    }
  }

  return { allowed: true, message: null, capacity: totalCapacity }
}

// ═══════════════════════════════════════════════════════════
//  دالة التحقق من السيطرة على العالم
// ═══════════════════════════════════════════════════════════

function checkWorldDomination(playerAssets) {
  const continents = playerAssets.find(a => a.item_id === "continent")
  const qty = continents?.quantity || 0

  return {
    dominated: qty >= WORLD_CONTINENTS_REQUIRED,
    continents: qty,
    required: WORLD_CONTINENTS_REQUIRED
  }
}

// ═══════════════════════════════════════════════════════════
//  دالة تنسيق السعر
// ═══════════════════════════════════════════════════════════

function formatPrice(price) {
  if (price >= 1000000000) return `${(price / 1000000000).toFixed(1)} مليار`
  if (price >= 1000000) return `${(price / 1000000).toFixed(1)} مليون`
  if (price >= 1000) return `${(price / 1000).toFixed(1)} ألف`
  return `${price}`
}

function formatPriceExact(price) {
  return price.toLocaleString("ar-SA")
}

// ═══════════════════════════════════════════════════════════
//  دالة حساب صافي ثروة اللاعب
// ═══════════════════════════════════════════════════════════

function calculateNetWorth(coins, playerAssets) {
  let total = coins || 0

  for (const asset of playerAssets) {
    const def = ALL_ITEMS[asset.item_id]
    if (def) {
      total += def.price * (asset.quantity || 0)
    }
  }

  return total
}

// ═══════════════════════════════════════════════════════════
//  دالة حساب مرحلة التقدم
// ═══════════════════════════════════════════════════════════

function getProgressStage(playerAssets) {
  const has = (id) => {
    const a = playerAssets.find(a => a.item_id === id)
    return (a?.quantity || 0) > 0
  }

  if (has("continent")) return { stage: "🌍 مستعمر قارات", level: 11, emoji: "🌍" }
  if (has("country")) return { stage: "🏳️ صاحب دولة", level: 10, emoji: "🏳️" }
  if (has("region")) return { stage: "🗺️ حاكم منطقة", level: 9, emoji: "🗺️" }
  if (has("province")) return { stage: "🏛️ والي محافظة", level: 8, emoji: "🏛️" }
  if (has("city")) return { stage: "🌆 عمدة مدينة", level: 7, emoji: "🌆" }
  if (has("village")) return { stage: "🏕️ شيخ قرية", level: 6, emoji: "🏕️" }
  if (has("neighborhood")) return { stage: "🏘️ مالك حي", level: 5, emoji: "🏘️" }
  if (has("street")) return { stage: "🛣️ صاحب شارع", level: 4, emoji: "🛣️" }
  if (has("palace")) return { stage: "🏰 صاحب قصر", level: 3, emoji: "🏰" }
  if (playerAssets.some(a => HOUSE_TYPES.includes(a.item_id))) return { stage: "🏠 مالك عقار", level: 2, emoji: "🏠" }
  if (playerAssets.some(a => CAR_CATEGORIES.includes(ALL_ITEMS[a.item_id]?.category))) return { stage: "🚗 سائق", level: 1, emoji: "🚗" }

  return { stage: "🆕 مبتدئ", level: 0, emoji: "🆕" }
}

// ═══════════════════════════════════════════════════════════
//  تصدير
// ═══════════════════════════════════════════════════════════

module.exports = {
  // الثوابت
  DAILY_REWARD,
  DAILY_COOLDOWN,
  WORK_COOLDOWN,
  WORK_MIN,
  WORK_MAX,
  HOUSE_CAR_LIMIT,
  PALACE_CAR_LIMIT,
  WORLD_CONTINENTS_REQUIRED,

  // البيانات
  CATEGORIES,
  CARS,
  PROPERTIES,
  INFRASTRUCTURE,
  ALL_ITEMS,
  HOUSE_TYPES,
  CAR_CATEGORIES,

  // الدوال
  checkRequirement,
  checkCarCapacity,
  checkWorldDomination,
  formatPrice,
  formatPriceExact,
  calculateNetWorth,
  getProgressStage,
}
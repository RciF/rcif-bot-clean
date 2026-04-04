module.exports = {

  botName: "Discord Bot V2",

  owners: [
    process.env.OWNER_ID || "529320108032786433"
  ],

  economy: {
    dailyReward: 100,
    workMin: 10,
    workMax: 50,
    workCooldown: 60 * 60 * 1000,
    dailyCooldown: 24 * 60 * 60 * 1000
  },

  ai: {
    memoryLimit: 10,
    maxReplyLength: 1900
  },

  moderation: {
    maxWarnings: 3
  },

  // ✅ NEW: متجر موحد — مصدر واحد للعناصر
  shopItems: {
    fishing_rod: { id: "fishing_rod", name: "🎣 صنارة", price: 300, description: "تستخدم للصيد.", aliases: ["fishing_rod", "صنارة", "صناره", "سنارة"] },
    laptop: { id: "laptop", name: "💻 لابتوب", price: 800, description: "جهاز عمل قوي.", aliases: ["laptop", "لابتوب", "كمبيوتر", "حاسوب"] },
    car: { id: "car", name: "🚗 سيارة", price: 5000, description: "وسيلة تنقل فاخرة.", aliases: ["car", "سيارة", "سياره"] },
    potion: { id: "potion", name: "🧪 جرعة", price: 50, description: "جرعة شفاء بسيطة.", aliases: ["potion", "جرعة", "جرعه"] },
    sword: { id: "sword", name: "⚔️ سيف", price: 150, description: "سلاح قوي.", aliases: ["sword", "سيف"] },
    shield: { id: "shield", name: "🛡️ درع", price: 120, description: "يحميك من الهجمات.", aliases: ["shield", "درع"] }
  }

}
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js")
const database = require("../../systems/databaseSystem")
const {
  WORK_COOLDOWN,
  WORK_LEVELS,
  WORK_JOBS,
  formatPriceExact
} = require("../../config/economyConfig")
const economySettings = require("../../utils/economySettingsHelper")

function getWorkLevel(xp) {
  let level = 1
  for (const [lvl, data] of Object.entries(WORK_LEVELS)) {
    if (xp >= data.xpRequired) level = parseInt(lvl)
  }
  return level
}

function getNextLevelXp(level) {
  const next = WORK_LEVELS[level + 1]
  return next ? next.xpRequired : null
}

function getRandomJob(level) {
  const jobs = WORK_JOBS[level] || WORK_JOBS[1]
  return jobs[Math.floor(Math.random() * jobs.length)]
}

// ══════════════════════════════════════════════════════════
//  حساب نطاق المكافأة:
//  - لو الداش حدد work_reward.min/max → نطبق scale حسب المستوى الوظيفي
//    بحيث: المستوى 1 = الـ min الأساسي، المستوى 5 = الـ max الأساسي
//  - وإلا → نستخدم levelData.minPay/maxPay من economyConfig
// ══════════════════════════════════════════════════════════

function computePayRange(workReward, levelData, currentLevel) {
  // defaults: level data
  let minPay = levelData.minPay
  let maxPay = levelData.maxPay

  // لو الداش حدد work_reward — نطبقه كأساس مع modifier حسب المستوى
  if (workReward && typeof workReward.min === "number" && typeof workReward.max === "number") {
    const baseMin = workReward.min
    const baseMax = workReward.max
    const range = baseMax - baseMin

    // multiplier حسب المستوى (1.0x للمبتدئ → 3.0x للـ CEO)
    const levelMultipliers = { 1: 1.0, 2: 1.4, 3: 1.9, 4: 2.4, 5: 3.0 }
    const mult = levelMultipliers[currentLevel] || 1.0

    minPay = Math.floor(baseMin * mult)
    maxPay = Math.floor((baseMin + range) * mult)
  }

  return { minPay, maxPay }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("عمل")
    .setDescription("اشتغل واكسب كوينز")
    .setDMPermission(false),

  helpMeta: {
    category: "economy",
    aliases: ["work", "job", "عمل"],
    description: "اشتغل واكسب كوينز مع نظام ترقية وظيفية",
    cooldown: 43200,
    relatedCommands: ["يومي", "رصيد"],
    examples: ["/عمل"],
    notes: [
      "كل عمل يعطيك +1 خبرة",
      "كلما ترقيت، راتبك أعلى",
      "5 مستويات: مبتدئ ← متدرب ← محترف ← خبير ← CEO",
      "10% فرصة مضاعفة المكافأة",
      "صاحب السيرفر يقدر يغير المكافأة والكولداون من الداش"
    ]
  },

  async execute(interaction) {
    try {
      if (!interaction.guild) {
        return interaction.reply({ content: "❌ هذا الأمر داخل السيرفر فقط", ephemeral: true })
      }

      const userId = interaction.user.id
      const guildId = interaction.guild.id
      const now = Date.now()

      // ✅ إعدادات الداش
      const settings = await economySettings.getSettings(guildId)

      if (!settings.enabled) {
        return interaction.reply({
          content: "❌ نظام الاقتصاد معطّل في هذا السيرفر.",
          ephemeral: true
        })
      }

      const symbol = settings.currency_symbol
      const currencyName = settings.currency_name

      // ✅ الكولداون: يفضّل work_reward.cooldown ثم work_cooldown_ms ثم WORK_COOLDOWN الافتراضي
      let cooldownMs = WORK_COOLDOWN
      if (settings.work_reward?.cooldown && settings.work_reward.cooldown > 0) {
        cooldownMs = settings.work_reward.cooldown * 1000
      } else if (settings.work_cooldown_ms && settings.work_cooldown_ms > 0) {
        cooldownMs = settings.work_cooldown_ms
      }

      // ✅ إنشاء المستخدم لو ما موجود — يحترم starting_balance
      await database.query(
        `INSERT INTO economy_users (user_id, coins, last_daily, last_work, inventory, work_xp, work_level)
         VALUES ($1, $2, 0, 0, '[]', 0, 1)
         ON CONFLICT (user_id) DO NOTHING`,
        [userId, settings.starting_balance || 0]
      )

      const user = await database.queryOne(
        "SELECT * FROM economy_users WHERE user_id = $1",
        [userId]
      )

      // ✅ الكولداون
      const timeSinceLast = now - (Number(user.last_work) || 0)

      if (timeSinceLast < cooldownMs) {
        const remaining = cooldownMs - timeSinceLast
        const hours = Math.floor(remaining / (60 * 60 * 1000))
        const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000))

        const embed = new EmbedBuilder()
          .setColor(0xef4444)
          .setTitle("⏳ أنت تعبان!")
          .setDescription("لازم ترتاح قبل ما تشتغل مرة ثانية.")
          .addFields(
            { name: "⏰ الوقت المتبقي", value: `**${hours}** ساعة و **${minutes}** دقيقة`, inline: false }
          )
          .setFooter({ text: `رصيدك: ${formatPriceExact(user.coins)} ${currencyName}` })
          .setTimestamp()

        return interaction.reply({ embeds: [embed], ephemeral: true })
      }

      // ✅ المستوى الحالي + الوظيفة
      const currentXp = user.work_xp || 0
      const currentLevel = getWorkLevel(currentXp)
      const levelData = WORK_LEVELS[currentLevel]
      const job = getRandomJob(currentLevel)

      // ✅ المكافأة — تطبّق work_reward من الداش لو موجود
      const { minPay, maxPay } = computePayRange(
        settings.work_reward,
        levelData,
        currentLevel
      )

      let reward = Math.floor(Math.random() * (maxPay - minPay + 1)) + minPay
      let bonusText = ""

      if (Math.random() < 0.10) {
        reward = reward * 2
        bonusText = "\n🎰 **حظ مضاعف!** المكافأة تضاعفت!"
      }

      // ✅ تحديث البيانات
      const newXp = currentXp + 1
      const newLevel = getWorkLevel(newXp)

      const result = await database.queryOne(
        `UPDATE economy_users
         SET coins = coins + $1, last_work = $2, work_xp = $3, work_level = $4
         WHERE user_id = $5
         RETURNING coins`,
        [reward, now, newXp, newLevel, userId]
      )

      const newBalance = result?.coins || 0
      const leveledUp = newLevel > currentLevel

      // ✅ XP Bar
      const nextLevelXp = getNextLevelXp(newLevel)
      let xpBar = ""
      if (nextLevelXp) {
        const progress = Math.floor((newXp / nextLevelXp) * 10)
        xpBar = "█".repeat(progress) + "░".repeat(10 - progress)
      }

      // ✅ نطاق راتب المستوى الجديد (للترقية)
      const newLevelData = WORK_LEVELS[newLevel]
      const newRange = computePayRange(settings.work_reward, newLevelData, newLevel)

      // ✅ Embed
      const embed = new EmbedBuilder()
        .setColor(leveledUp ? 0xf59e0b : 0x3b82f6)
        .setTitle(leveledUp ? `🎉 ترقية وظيفية! ${newLevelData.emoji} ${newLevelData.title}` : job.title)
        .setDescription(
          leveledUp
            ? `تهانينا! ترقيت من **${levelData.title}** إلى **${newLevelData.title}**!\nراتبك الجديد: **${formatPriceExact(newRange.minPay)} - ${formatPriceExact(newRange.maxPay)}** ${currencyName}${bonusText}`
            : `${job.desc} وكسبت فلوس!${bonusText}`
        )
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true, size: 128 }))
        .addFields(
          { name: `${symbol} الأجر`, value: `**+${formatPriceExact(reward)}** ${currencyName}`, inline: true },
          { name: "💳 رصيدك", value: `**${formatPriceExact(newBalance)}** ${currencyName}`, inline: true },
          { name: "📊 المستوى الوظيفي", value: `${newLevelData.emoji} **${newLevelData.title}** (Lv.${newLevel})`, inline: false },
        )

      if (nextLevelXp) {
        embed.addFields({
          name: "⚡ الخبرة",
          value: `\`${xpBar}\` ${newXp}/${nextLevelXp} XP`,
          inline: false
        })
      } else {
        embed.addFields({
          name: "⚡ الخبرة",
          value: `👑 **وصلت للمستوى الأعلى!** ${newXp} XP`,
          inline: false
        })
      }

      // ✅ Footer ديناميكي حسب الكولداون
      const cooldownHours = Math.floor(cooldownMs / (60 * 60 * 1000))
      embed
        .setFooter({ text: `تقدر تشتغل كل ${cooldownHours} ساعة` })
        .setTimestamp()

      return interaction.reply({ embeds: [embed] })

    } catch (err) {
      console.error("[WORK ERROR]", err)
      if (interaction.replied || interaction.deferred) {
        return interaction.followUp({ content: "❌ حدث خطأ أثناء العمل.", ephemeral: true })
      }
      return interaction.reply({ content: "❌ حدث خطأ أثناء العمل.", ephemeral: true })
    }
  },
}
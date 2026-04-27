const { SlashCommandBuilder, EmbedBuilder } = require("discord.js")
const database = require("../../systems/databaseSystem")
const {
  WORK_COOLDOWN,
  WORK_LEVELS,
  WORK_JOBS,
  formatPriceExact
} = require("../../config/economyConfig")

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

module.exports = {
  data: new SlashCommandBuilder()
    .setName("عمل")
    .setDescription("اشتغل واكسب كوينز — كل 12 ساعة")
    .setDMPermission(false),

  helpMeta: {
    category: "economy",
    aliases: ["work", "job", "عمل"],
    description: "اشتغل واكسب كوينز مع نظام ترقية وظيفية",
    cooldown: 43200,
    relatedCommands: ["يومي", "رصيد"],
    examples: ["/عمل"],
    notes: [
      "تقدر تشتغل مرة كل 12 ساعة",
      "كل عمل يعطيك +1 خبرة",
      "كلما ترقيت، راتبك أعلى",
      "5 مستويات: مبتدئ ← متدرب ← محترف ← خبير ← CEO",
      "10% فرصة مضاعفة المكافأة"
    ]
  },

  async execute(interaction) {
    try {
      if (!interaction.guild) {
        return interaction.reply({ content: "❌ هذا الأمر داخل السيرفر فقط", ephemeral: true })
      }

      const userId = interaction.user.id
      const now = Date.now()

      // ✅ إنشاء المستخدم إذا ما موجود
      await database.query(
        `INSERT INTO economy_users (user_id, coins, last_daily, last_work, inventory, work_xp, work_level)
         VALUES ($1, 0, 0, 0, '[]', 0, 1)
         ON CONFLICT (user_id) DO NOTHING`,
        [userId]
      )

      const user = await database.queryOne(
        "SELECT * FROM economy_users WHERE user_id = $1",
        [userId]
      )

      // ✅ تحقق من الكولداون
      const timeSinceLast = now - (Number(user.last_work) || 0)

      if (timeSinceLast < WORK_COOLDOWN) {
        const remaining = WORK_COOLDOWN - timeSinceLast
        const hours = Math.floor(remaining / (60 * 60 * 1000))
        const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000))

        const embed = new EmbedBuilder()
          .setColor(0xef4444)
          .setTitle("⏳ أنت تعبان!")
          .setDescription("لازم ترتاح قبل ما تشتغل مرة ثانية.")
          .addFields(
            { name: "⏰ الوقت المتبقي", value: `**${hours}** ساعة و **${minutes}** دقيقة`, inline: false }
          )
          .setFooter({ text: `رصيدك: ${formatPriceExact(user.coins)} كوين` })
          .setTimestamp()

        return interaction.reply({ embeds: [embed], ephemeral: true })
      }

      // ✅ حساب المستوى الحالي
      const currentXp = user.work_xp || 0
      const currentLevel = getWorkLevel(currentXp)
      const levelData = WORK_LEVELS[currentLevel]
      const job = getRandomJob(currentLevel)

      // ✅ المكافأة حسب المستوى
      let reward = Math.floor(Math.random() * (levelData.maxPay - levelData.minPay + 1)) + levelData.minPay
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

      // ✅ Embed
      const embed = new EmbedBuilder()
        .setColor(leveledUp ? 0xf59e0b : 0x3b82f6)
        .setTitle(leveledUp ? `🎉 ترقية وظيفية! ${WORK_LEVELS[newLevel].emoji} ${WORK_LEVELS[newLevel].title}` : job.title)
        .setDescription(
          leveledUp
            ? `تهانينا! ترقيت من **${levelData.title}** إلى **${WORK_LEVELS[newLevel].title}**!\nراتبك الجديد: **${formatPriceExact(WORK_LEVELS[newLevel].minPay)} - ${formatPriceExact(WORK_LEVELS[newLevel].maxPay)}** كوين${bonusText}`
            : `${job.desc} وكسبت فلوس!${bonusText}`
        )
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true, size: 128 }))
        .addFields(
          { name: "💰 الأجر", value: `**+${formatPriceExact(reward)}** كوين`, inline: true },
          { name: "💳 رصيدك", value: `**${formatPriceExact(newBalance)}** كوين`, inline: true },
          { name: "📊 المستوى الوظيفي", value: `${WORK_LEVELS[newLevel].emoji} **${WORK_LEVELS[newLevel].title}** (Lv.${newLevel})`, inline: false },
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

      embed
        .setFooter({ text: "تقدر تشتغل كل 12 ساعة" })
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
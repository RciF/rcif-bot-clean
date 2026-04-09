const { SlashCommandBuilder, EmbedBuilder } = require("discord.js")
const database = require("../../systems/databaseSystem")
const { WORK_COOLDOWN, WORK_MIN, WORK_MAX, formatPriceExact } = require("../../config/economyConfig")

// وظائف عشوائية للتنوع
const JOBS = [
  { title: "🔧 ميكانيكي", desc: "صلّحت سيارة عميل" },
  { title: "🍕 توصيل طلبات", desc: "وصّلت طلبات للعملاء" },
  { title: "💻 مبرمج", desc: "برمجت موقع لعميل" },
  { title: "🏗️ بنّاء", desc: "بنيت جدار لمشروع" },
  { title: "🎨 مصمم", desc: "صممت شعار لشركة" },
  { title: "📦 عامل مستودع", desc: "رتّبت البضائع في المستودع" },
  { title: "🚕 سائق تاكسي", desc: "وصّلت ركاب لوجهتهم" },
  { title: "👨‍🍳 طبّاخ", desc: "طبخت وجبات في المطعم" },
  { title: "📸 مصوّر", desc: "صوّرت حفلة زواج" },
  { title: "🛒 بائع", desc: "بعت منتجات في المتجر" },
  { title: "✂️ حلّاق", desc: "قصّيت شعر عدة زبائن" },
  { title: "🎤 مذيع", desc: "قدّمت برنامج إذاعي" },
  { title: "🧹 عامل نظافة", desc: "نظّفت مبنى كامل" },
  { title: "⚡ كهربائي", desc: "ركّبت أسلاك كهربائية" },
  { title: "🔒 حارس أمن", desc: "حرست مبنى لمدة وردية كاملة" },
  { title: "📚 مدرّس", desc: "درّست طلاب في المدرسة" },
  { title: "🏥 ممرض", desc: "ساعدت مرضى في المستشفى" },
  { title: "🎮 مختبر ألعاب", desc: "اختبرت لعبة جديدة قبل إطلاقها" },
]

function getRandomJob() {
  return JOBS[Math.floor(Math.random() * JOBS.length)]
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("عمل")
    .setDescription("اشتغل واكسب كوينز")
    .setDMPermission(false),

  async execute(interaction) {
    try {
      if (!interaction.guild) {
        return interaction.reply({ content: "❌ هذا الأمر داخل السيرفر فقط", ephemeral: true })
      }

      const userId = interaction.user.id
      const now = Date.now()

      // ✅ جلب أو إنشاء المستخدم
      await database.query(
        `INSERT INTO economy_users (user_id, coins, last_daily, last_work, inventory)
         VALUES ($1, 0, 0, 0, '[]')
         ON CONFLICT (user_id) DO NOTHING`,
        [userId]
      )

      const userResult = await database.query(
        "SELECT * FROM economy_users WHERE user_id = $1",
        [userId]
      )
      const user = userResult.rows[0]

      // ✅ تحقق: الكولداون
      const timeSinceLast = now - (Number(user.last_work) || 0)

      if (timeSinceLast < WORK_COOLDOWN) {
        const remaining = WORK_COOLDOWN - timeSinceLast
        const minutes = Math.floor(remaining / (60 * 1000))
        const seconds = Math.floor((remaining % (60 * 1000)) / 1000)

        const embed = new EmbedBuilder()
          .setColor(0xef4444)
          .setTitle("⏳ أنت تعبان!")
          .setDescription("لازم ترتاح شوي قبل ما تشتغل مرة ثانية.")
          .addFields(
            { name: "⏰ الوقت المتبقي", value: `**${minutes}** دقيقة و **${seconds}** ثانية`, inline: false }
          )
          .setFooter({ text: `رصيدك الحالي: ${formatPriceExact(user.coins)} كوين` })
          .setTimestamp()

        return interaction.reply({ embeds: [embed], ephemeral: true })
      }

      // ✅ مكافأة عشوائية
      const reward = Math.floor(Math.random() * (WORK_MAX - WORK_MIN + 1)) + WORK_MIN
      const job = getRandomJob()

      // ✅ نسبة بونص عشوائي (10% فرصة لمضاعفة)
      let finalReward = reward
      let bonusText = ""
      if (Math.random() < 0.10) {
        finalReward = reward * 2
        bonusText = "\n🎰 **حظ مضاعف!** المكافأة تضاعفت!"
      }

      // ✅ تحديث الرصيد
      const result = await database.query(
        `UPDATE economy_users SET coins = coins + $1, last_work = $2
         WHERE user_id = $3 RETURNING coins`,
        [finalReward, now, userId]
      )

      const newBalance = result.rows[0]?.coins || 0

      // ✅ Embed النجاح
      const embed = new EmbedBuilder()
        .setColor(0x3b82f6)
        .setTitle(job.title)
        .setDescription(`${job.desc} وكسبت فلوس!${bonusText}`)
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true, size: 128 }))
        .addFields(
          { name: "💰 الأجر", value: `**+${formatPriceExact(finalReward)}** كوين`, inline: true },
          { name: "💳 رصيدك الجديد", value: `**${formatPriceExact(newBalance)}** كوين`, inline: true }
        )
        .setFooter({ text: "تقدر تشتغل كل ساعة" })
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
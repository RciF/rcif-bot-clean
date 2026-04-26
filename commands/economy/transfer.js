const { SlashCommandBuilder, EmbedBuilder } = require("discord.js")
const database = require("../../systems/databaseSystem")
const databaseManager = require("../../utils/databaseManager")
const { formatPriceExact } = require("../../config/economyConfig")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("تحويل")
    .setDescription("تحويل كوينز لعضو آخر")
    .setDMPermission(false)
    .addUserOption(option =>
      option
        .setName("العضو")
        .setDescription("العضو المراد التحويل له")
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName("المبلغ")
        .setDescription("عدد الكوينز المراد تحويلها")
        .setRequired(true)
        .setMinValue(1)
    ),

  helpMeta: {
    category: "economy",
    aliases: ["transfer", "pay", "send", "تحويل"],
    description: "تحويل كوينز من رصيدك إلى عضو آخر",
    options: [
      { name: "العضو", description: "العضو المراد التحويل له", required: true },
      { name: "المبلغ", description: "عدد الكوينز المراد تحويلها (1 أو أكثر)", required: true }
    ],
    requirements: {
      botRoleHierarchy: false,
      userPermissions: [],
      subscriptionTier: "silver"
    },
    cooldown: 0,
    relatedCommands: ["رصيد", "يومي", "عمل"],
    examples: [
      "/تحويل العضو:@أحمد المبلغ:1000",
      "/تحويل العضو:@محمد المبلغ:50000"
    ],
    notes: [
      "ما تقدر تحول لنفسك أو لبوت",
      "العملية tx-safe — لو فشل أي جزء، يرجع كل شي",
      "لازم رصيدك يكفي للمبلغ المطلوب"
    ]
  },

  async execute(interaction) {
    try {
      if (!interaction.guild) {
        return interaction.reply({ content: "❌ هذا الأمر داخل السيرفر فقط", ephemeral: true })
      }

      const senderId = interaction.user.id
      const targetUser = interaction.options.getUser("العضو")
      const amount = interaction.options.getInteger("المبلغ")

      // ✅ لا تحول لنفسك
      if (targetUser.id === senderId) {
        return interaction.reply({ content: "❌ ما تقدر تحول لنفسك!", ephemeral: true })
      }

      // ✅ لا تحول لبوت
      if (targetUser.bot) {
        return interaction.reply({ content: "❌ ما تقدر تحول لبوت!", ephemeral: true })
      }

      // ✅ FIX: إزالة التعريف المكرر لـ databaseManager (كان يُعرَّف مرتين في نفس الدالة)
      const client = await databaseManager.getClient()

      try {
        await client.query("BEGIN")

        // ✅ جلب المرسل
        await client.query(
          `INSERT INTO economy_users (user_id, coins, last_daily, last_work, inventory)
           VALUES ($1, 0, 0, 0, '[]') ON CONFLICT (user_id) DO NOTHING`,
          [senderId]
        )

        const senderResult = await client.query(
          "SELECT coins FROM economy_users WHERE user_id = $1 FOR UPDATE",
          [senderId]
        )
        const senderCoins = senderResult.rows[0]?.coins || 0

        // ✅ تحقق: الرصيد كافي
        if (senderCoins < amount) {
          await client.query("ROLLBACK")
          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(0xef4444)
                .setTitle("❌ رصيد غير كافي")
                .addFields(
                  { name: "💰 رصيدك", value: `**${formatPriceExact(senderCoins)}** كوين`, inline: true },
                  { name: "💸 المطلوب", value: `**${formatPriceExact(amount)}** كوين`, inline: true },
                  { name: "📉 ينقصك", value: `**${formatPriceExact(amount - senderCoins)}** كوين`, inline: true }
                )
            ],
            ephemeral: true
          })
        }

        // ✅ خصم من المرسل
        await client.query(
          "UPDATE economy_users SET coins = coins - $1 WHERE user_id = $2",
          [amount, senderId]
        )

        // ✅ إضافة للمستلم
        await client.query(
          `INSERT INTO economy_users (user_id, coins, last_daily, last_work, inventory)
           VALUES ($1, $2, 0, 0, '[]')
           ON CONFLICT (user_id) DO UPDATE SET coins = economy_users.coins + $2`,
          [targetUser.id, amount]
        )

        // ✅ جلب الأرصدة الجديدة
        const newSender = await client.query("SELECT coins FROM economy_users WHERE user_id = $1", [senderId])
        const newReceiver = await client.query("SELECT coins FROM economy_users WHERE user_id = $1", [targetUser.id])

        await client.query("COMMIT")

        const senderNewBalance = newSender.rows[0]?.coins || 0
        const receiverNewBalance = newReceiver.rows[0]?.coins || 0

        // ✅ Embed النجاح
        const embed = new EmbedBuilder()
          .setColor(0x22c55e)
          .setTitle("💸 تم التحويل بنجاح")
          .addFields(
            { name: "📤 المرسل", value: `${interaction.user} (\`${interaction.user.username}\`)`, inline: true },
            { name: "📥 المستلم", value: `${targetUser} (\`${targetUser.username}\`)`, inline: true },
            { name: "💰 المبلغ", value: `**${formatPriceExact(amount)}** كوين`, inline: true },
            { name: "💳 رصيدك بعد التحويل", value: `**${formatPriceExact(senderNewBalance)}** كوين`, inline: true },
            { name: "💳 رصيد المستلم", value: `**${formatPriceExact(receiverNewBalance)}** كوين`, inline: true }
          )
          .setTimestamp()

        return interaction.reply({ embeds: [embed] })

      } catch (err) {
        await client.query("ROLLBACK")
        throw err
      } finally {
        client.release()
      }

    } catch (err) {
      console.error("[TRANSFER ERROR]", err)

      if (interaction.replied || interaction.deferred) {
        return interaction.followUp({ content: "❌ حدث خطأ في التحويل.", ephemeral: true })
      }
      return interaction.reply({ content: "❌ حدث خطأ في التحويل.", ephemeral: true })
    }
  },
}
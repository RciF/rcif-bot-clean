const { SlashCommandBuilder, EmbedBuilder } = require("discord.js")
const database = require("../../systems/databaseSystem")
const { ALL_ITEMS, calculateNetWorth, getProgressStage, formatPriceExact, formatPrice } = require("../../config/economyConfig")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("متصدرين")
    .setDescription("عرض المتصدرين (أغنى الأعضاء)")
    .setDMPermission(false)
    .addStringOption(option =>
      option
        .setName("النوع")
        .setDescription("نوع الترتيب")
        .setRequired(false)
        .addChoices(
          { name: "💵 أعلى رصيد (كوينز)", value: "coins" },
          { name: "💎 أعلى ثروة (رصيد + ممتلكات)", value: "networth" },
          { name: "📦 أكثر ممتلكات", value: "items" }
        )
    ),

  helpMeta: {
    category: "economy",
    aliases: ["leaderboard", "top", "rich", "متصدرين"],
    description: "عرض أغنى الأعضاء — 3 أنواع ترتيب",
    options: [
      { name: "النوع", description: "ترتيب: أعلى رصيد / أعلى ثروة / أكثر ممتلكات", required: false }
    ],
    requirements: {
      botRoleHierarchy: false,
      userPermissions: [],
      subscriptionTier: "gold"
    },
    cooldown: 0,
    relatedCommands: ["رصيد", "ممتلكاتي"],
    examples: [
      "/متصدرين",
      "/متصدرين النوع:💎 أعلى ثروة (رصيد + ممتلكات)",
      "/متصدرين النوع:📦 أكثر ممتلكات"
    ],
    notes: [
      "الترتيب عالمي (الاقتصاد عالمي، مو لكل سيرفر)",
      "Top 50 لاعب",
      "يعرض ترتيبك حتى لو ما طلعت في القائمة"
    ]
  },

  async execute(interaction) {
    try {
      if (!interaction.guild) {
        return interaction.reply({ content: "❌ هذا الأمر داخل السيرفر فقط", ephemeral: true })
      }

      const type = interaction.options.getString("النوع") || "coins"

      await interaction.deferReply()

      // ✅ جلب كل المستخدمين اللي عندهم كوينز
      const usersResult = await database.query(
        "SELECT user_id, coins FROM economy_users WHERE coins > 0 ORDER BY coins DESC LIMIT 50"
      )
      const users = usersResult.rows || []

      if (users.length === 0) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0x64748b)
              .setTitle("🏆 المتصدرين")
              .setDescription("🏜️ ما فيه بيانات بعد. استخدموا `/يومي` و `/عمل` عشان تبدأون!")
          ]
        })
      }

      // ═══════════════════════════════════════════════════════
      //  ✅ FIX: N+1 query problem
      //  بدل ما نسوي 50 query منفصلة لجلب inventory كل مستخدم،
      //  نسوي query واحد بـ WHERE user_id = ANY($1)
      // ═══════════════════════════════════════════════════════
      const userIds = users.map(u => u.user_id)

      const inventoryResult = await database.query(
        "SELECT user_id, item_id, quantity FROM inventory WHERE user_id = ANY($1) AND quantity > 0",
        [userIds]
      )
      const allInventoryRows = inventoryResult.rows || []

      // تجميع inventory حسب user_id
      const inventoryByUser = new Map()
      for (const row of allInventoryRows) {
        if (!inventoryByUser.has(row.user_id)) {
          inventoryByUser.set(row.user_id, [])
        }
        inventoryByUser.get(row.user_id).push({
          item_id: row.item_id,
          quantity: row.quantity
        })
      }

      // ═══════════════════════════════════════════════════════
      //  ✅ FIX: members.fetch بـ Promise.allSettled (parallel)
      //  بدل sequential await داخل for loop
      // ═══════════════════════════════════════════════════════
      const memberFetchResults = await Promise.allSettled(
        users.map(u =>
          interaction.guild.members.fetch(u.user_id).catch(() => null)
        )
      )

      // بناء enrichedUsers
      const enrichedUsers = users.map((user, index) => {
        const assets = inventoryByUser.get(user.user_id) || []
        const netWorth = calculateNetWorth(user.coins, assets)
        const totalItems = assets.reduce((sum, a) => sum + (a.quantity || 0), 0)
        const stage = getProgressStage(assets)

        const memberResult = memberFetchResults[index]
        let username = "مجهول"
        if (memberResult.status === "fulfilled" && memberResult.value) {
          username = memberResult.value.user.username
        }

        return {
          userId: user.user_id,
          username,
          coins: user.coins,
          netWorth,
          totalItems,
          stage
        }
      })

      // ✅ ترتيب حسب النوع
      let sorted, title, description, valueKey

      if (type === "networth") {
        sorted = enrichedUsers.sort((a, b) => b.netWorth - a.netWorth).slice(0, 10)
        title = "💎 أعلى ثروة"
        description = "ترتيب حسب صافي الثروة (رصيد + قيمة الممتلكات)"
        valueKey = "netWorth"
      } else if (type === "items") {
        sorted = enrichedUsers.sort((a, b) => b.totalItems - a.totalItems).slice(0, 10)
        title = "📦 أكثر ممتلكات"
        description = "ترتيب حسب عدد الممتلكات"
        valueKey = "totalItems"
      } else {
        sorted = enrichedUsers.sort((a, b) => b.coins - a.coins).slice(0, 10)
        title = "💵 أعلى رصيد"
        description = "ترتيب حسب الكوينز النقدية"
        valueKey = "coins"
      }

      // ✅ ميداليات
      const medals = ["🥇", "🥈", "🥉"]

      // ✅ بناء النص
      let leaderboardText = ""

      for (let i = 0; i < sorted.length; i++) {
        const u = sorted[i]
        const rank = i < 3 ? medals[i] : `\`#${i + 1}\``
        const value = valueKey === "totalItems"
          ? `**${u[valueKey]}** عنصر`
          : `**${formatPrice(u[valueKey])}** كوين`

        leaderboardText += `${rank} **${u.username}** — ${value}\n`
        leaderboardText += `    ${u.stage.emoji} ${u.stage.stage}\n\n`
      }

      // ✅ ترتيب المستخدم الحالي
      const myRank = sorted.findIndex(u => u.userId === interaction.user.id)
      let myRankText = "غير مصنّف"
      if (myRank !== -1) {
        myRankText = `#${myRank + 1} من ${sorted.length}`
      } else {
        // نشوف ترتيبه في القائمة الكاملة
        const fullSorted = type === "networth"
          ? enrichedUsers.sort((a, b) => b.netWorth - a.netWorth)
          : type === "items"
            ? enrichedUsers.sort((a, b) => b.totalItems - a.totalItems)
            : enrichedUsers.sort((a, b) => b.coins - a.coins)

        const fullRank = fullSorted.findIndex(u => u.userId === interaction.user.id)
        if (fullRank !== -1) myRankText = `#${fullRank + 1} من ${fullSorted.length}`
      }

      // ✅ Embed
      const embed = new EmbedBuilder()
        .setColor(0xfbbf24)
        .setTitle(`🏆 ${title}`)
        .setDescription(description)
        .addFields(
          { name: "📊 الترتيب", value: leaderboardText || "لا يوجد بيانات", inline: false },
          { name: "📍 ترتيبك", value: myRankText, inline: true },
          { name: "👥 إجمالي المشاركين", value: `${enrichedUsers.length}`, inline: true }
        )
        .setFooter({ text: `${interaction.guild.name}`, iconURL: interaction.guild.iconURL({ dynamic: true }) })
        .setTimestamp()

      return interaction.editReply({ embeds: [embed] })

    } catch (err) {
      console.error("[LEADERBOARD ERROR]", err)

      if (interaction.deferred) {
        return interaction.editReply({ content: "❌ حدث خطأ في عرض المتصدرين." })
      }
      if (!interaction.replied) {
        return interaction.reply({ content: "❌ حدث خطأ في عرض المتصدرين.", ephemeral: true })
      }
    }
  },
}
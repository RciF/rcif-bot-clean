const { SlashCommandBuilder, EmbedBuilder } = require("discord.js")
const database = require("../../systems/databaseSystem")
const { DAILY_REWARD, DAILY_COOLDOWN, formatPriceExact } = require("../../config/economyConfig")

// ══════════════════════════════════════════════════════════════════
//  STREAK CONFIG
// ══════════════════════════════════════════════════════════════════

const STREAK_WINDOW = 48 * 60 * 60 * 1000  // 48 ساعة — لو ما استلم خلالها ينكسر الـ streak
const STREAK_BONUS_PER_DAY = 0.10           // +10% لكل يوم

const STREAK_MILESTONES = {
    7:  { multiplier: 2.0,  label: "🎉 أسبوع كامل!",   color: 0xf59e0b },
    14: { multiplier: 2.5,  label: "🔥 أسبوعين!",      color: 0xef4444 },
    30: { multiplier: 3.0,  label: "👑 شهر كامل!",     color: 0xa855f7 },
    60: { multiplier: 4.0,  label: "💎 شهرين!",        color: 0x06b6d4 },
    100:{ multiplier: 5.0,  label: "🌟 100 يوم!",      color: 0xffd700 },
}

// ══════════════════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════════════════

function getStreakMultiplier(streak) {
    // تحقق من الـ milestones أولاً (من الأعلى للأدنى)
    const milestoneKeys = Object.keys(STREAK_MILESTONES)
        .map(Number)
        .sort((a, b) => b - a)

    for (const key of milestoneKeys) {
        if (streak >= key) {
            return STREAK_MILESTONES[key].multiplier
        }
    }

    // بونص تراكمي +10% لكل يوم (حد أقصى 90% قبل الـ milestones)
    const bonus = Math.min(streak * STREAK_BONUS_PER_DAY, 0.9)
    return 1 + bonus
}

function getMilestoneInfo(streak) {
    const milestoneKeys = Object.keys(STREAK_MILESTONES)
        .map(Number)
        .sort((a, b) => b - a)

    for (const key of milestoneKeys) {
        if (streak === key) {
            return STREAK_MILESTONES[key]
        }
    }
    return null
}

function getNextMilestone(streak) {
    const milestoneKeys = Object.keys(STREAK_MILESTONES)
        .map(Number)
        .sort((a, b) => a - b)

    for (const key of milestoneKeys) {
        if (streak < key) {
            return { days: key, remaining: key - streak }
        }
    }
    return null
}

function getStreakEmoji(streak) {
    if (streak >= 100) return "🌟"
    if (streak >= 60)  return "💎"
    if (streak >= 30)  return "👑"
    if (streak >= 14)  return "🔥"
    if (streak >= 7)   return "🎉"
    if (streak >= 3)   return "⚡"
    return "📅"
}

// ══════════════════════════════════════════════════════════════════
//  COMMAND
// ══════════════════════════════════════════════════════════════════

module.exports = {
    data: new SlashCommandBuilder()
        .setName("يومي")
        .setDescription("استلم مكافأتك اليومية")
        .setDMPermission(false),

    helpMeta: {
        category: "economy",
        aliases: ["daily", "يومي"],
        description: "استلم مكافأتك اليومية من الكوينز مع نظام Streak للمكافآت المتزايدة",
        options: [],
        requirements: {
            botRoleHierarchy: false,
            userPermissions: [],
            subscriptionTier: "silver"
        },
        cooldown: 86400,
        relatedCommands: ["رصيد", "عمل", "متجر"],
        examples: ["/يومي"],
        notes: [
            "المكافأة الأساسية + بونص عشوائي حتى +50%",
            "كل يوم متتالي يزيد المكافأة +10%",
            "يوم 7 = x2 | يوم 14 = x2.5 | يوم 30 = x3 | يوم 60 = x4 | يوم 100 = x5",
            "لو ما استلمت خلال 48 ساعة ينكسر الـ Streak",
            "كولداون 24 ساعة من آخر استلام"
        ]
    },

    async execute(interaction) {
        try {
            if (!interaction.guild) {
                return interaction.reply({ content: "❌ هذا الأمر داخل السيرفر فقط", ephemeral: true })
            }

            const userId = interaction.user.id
            const now = Date.now()

            // ✅ جلب أو إنشاء المستخدم (مع دعم أعمدة الـ streak)
            await database.query(
                `INSERT INTO economy_users (user_id, coins, last_daily, last_work, inventory, streak, streak_last_day)
                 VALUES ($1, 0, 0, 0, '[]', 0, 0)
                 ON CONFLICT (user_id) DO NOTHING`,
                [userId]
            )

            const userResult = await database.query(
                "SELECT * FROM economy_users WHERE user_id = $1",
                [userId]
            )
            const user = userResult.rows[0]

            const lastDaily     = Number(user.last_daily)      || 0
            const lastDay       = Number(user.streak_last_day) || 0
            const currentStreak = Number(user.streak)          || 0

            // ✅ تحقق: الكولداون 24 ساعة
            const timeSinceLast = now - lastDaily

            if (timeSinceLast < DAILY_COOLDOWN) {
                const remaining = DAILY_COOLDOWN - timeSinceLast
                const hours     = Math.floor(remaining / (60 * 60 * 1000))
                const minutes   = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000))
                const seconds   = Math.floor((remaining % (60 * 1000)) / 1000)

                const embed = new EmbedBuilder()
                    .setColor(0xef4444)
                    .setTitle("⏳ المكافأة اليومية غير متاحة")
                    .setDescription(`لازم تنتظر قبل ما تقدر تستلم مكافأتك مرة ثانية.`)
                    .addFields(
                        {
                            name: "⏰ الوقت المتبقي",
                            value: `**${hours}** ساعة و **${minutes}** دقيقة و **${seconds}** ثانية`,
                            inline: false
                        },
                        {
                            name: `${getStreakEmoji(currentStreak)} سلسلتك الحالية`,
                            value: `**${currentStreak}** يوم متتالي`,
                            inline: true
                        }
                    )
                    .setFooter({ text: `رصيدك الحالي: ${formatPriceExact(user.coins)} كوين` })
                    .setTimestamp()

                return interaction.reply({ embeds: [embed], ephemeral: true })
            }

            // ══════════════════════════════════════════════════════
            //  حساب الـ Streak
            // ══════════════════════════════════════════════════════

            let newStreak = currentStreak
            let streakBroken = false

            if (lastDay === 0) {
                // أول مرة
                newStreak = 1
            } else {
                const timeSinceLastDay = now - lastDay

                if (timeSinceLastDay <= STREAK_WINDOW) {
                    // ضمن الـ 48 ساعة — يكمل الـ streak
                    newStreak = currentStreak + 1
                } else {
                    // انكسر الـ streak
                    newStreak = 1
                    streakBroken = currentStreak > 1
                }
            }

            // ══════════════════════════════════════════════════════
            //  حساب المكافأة
            // ══════════════════════════════════════════════════════

            const baseReward      = DAILY_REWARD
            const randomBonus     = Math.floor(Math.random() * DAILY_REWARD * 0.5)
            const streakMultiplier = getStreakMultiplier(newStreak)
            const totalBeforeStreak = baseReward + randomBonus
            const finalReward     = Math.floor(totalBeforeStreak * streakMultiplier)
            const streakBonusAmount = finalReward - totalBeforeStreak

            // ✅ تحديث قاعدة البيانات
            const result = await database.query(
                `UPDATE economy_users
                 SET coins          = coins + $1,
                     last_daily     = $2,
                     streak         = $3,
                     streak_last_day = $4
                 WHERE user_id = $5
                 RETURNING coins`,
                [finalReward, now, newStreak, now, userId]
            )

            const newBalance = result.rows[0]?.coins || 0

            // ══════════════════════════════════════════════════════
            //  بناء الـ Embed
            // ══════════════════════════════════════════════════════

            const milestone    = getMilestoneInfo(newStreak)
            const nextMilestone = getNextMilestone(newStreak)
            const streakEmoji  = getStreakEmoji(newStreak)

            // لون الـ embed حسب الـ milestone أو الـ streak
            let embedColor = 0x22c55e
            if (milestone)          embedColor = milestone.color
            else if (newStreak >= 7) embedColor = 0xf59e0b
            else if (newStreak >= 3) embedColor = 0xf97316

            const embed = new EmbedBuilder()
                .setColor(embedColor)
                .setTitle(milestone ? `${milestone.label} — المكافأة اليومية` : "🎁 المكافأة اليومية")
                .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true, size: 128 }))

            // ── الحقول الأساسية ──
            embed.addFields(
                {
                    name: "💰 المكافأة الأساسية",
                    value: `**+${formatPriceExact(baseReward)}** كوين`,
                    inline: true
                },
                {
                    name: "🎲 بونص عشوائي",
                    value: `**+${formatPriceExact(randomBonus)}** كوين`,
                    inline: true
                },
                {
                    name: "💳 رصيدك الجديد",
                    value: `**${formatPriceExact(newBalance)}** كوين`,
                    inline: true
                }
            )

            // ── بونص الـ Streak (لو أكبر من 0) ──
            if (streakBonusAmount > 0) {
                embed.addFields({
                    name: `${streakEmoji} بونص السلسلة (x${streakMultiplier.toFixed(1)})`,
                    value: `**+${formatPriceExact(streakBonusAmount)}** كوين إضافي`,
                    inline: false
                })
            }

            // ── معلومات الـ Streak ──
            let streakText = `**${newStreak}** يوم متتالي`
            if (milestone) streakText += ` 🎊`

            embed.addFields({
                name: `${streakEmoji} سلسلتك`,
                value: streakText,
                inline: true
            })

            // ── الـ Milestone القادم ──
            if (nextMilestone) {
                embed.addFields({
                    name: "🎯 الهدف القادم",
                    value: `بعد **${nextMilestone.remaining}** يوم → يوم **${nextMilestone.days}**`,
                    inline: true
                })
            } else {
                embed.addFields({
                    name: "🌟 إنجاز",
                    value: "وصلت لأعلى مستوى!",
                    inline: true
                })
            }

            // ── إشعار انكسار الـ Streak ──
            if (streakBroken) {
                embed.setDescription(`> ⚠️ انكسرت سلسلتك القديمة! ابدأ من جديد.`)
            }

            // ── المجموع الكلي ──
            embed.addFields({
                name: "📊 إجمالي المكافأة",
                value: `**${formatPriceExact(finalReward)}** كوين`,
                inline: false
            })

            embed.setFooter({ text: "تقدر تستلم المكافأة كل 24 ساعة — الانقطاع يكسر السلسلة خلال 48 ساعة" })
            embed.setTimestamp()

            return interaction.reply({ embeds: [embed] })

        } catch (err) {
            console.error("[DAILY ERROR]", err)

            if (interaction.replied || interaction.deferred) {
                return interaction.followUp({ content: "❌ حدث خطأ في المكافأة اليومية.", ephemeral: true })
            }
            return interaction.reply({ content: "❌ حدث خطأ في المكافأة اليومية.", ephemeral: true })
        }
    },
}
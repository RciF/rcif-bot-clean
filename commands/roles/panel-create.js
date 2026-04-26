const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js")
const commandGuardSystem = require("../../systems/commandGuardSystem")
const databaseSystem     = require("../../systems/databaseSystem")
const { ensureTable, buildPanelMessage, COLOR_CHOICES } = require("./_button-role-shared")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("لوحة-رتب-إنشاء")
    .setDescription("إنشاء لوحة رتب جديدة بالأزرار")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addStringOption(o => o.setName("العنوان").setDescription("عنوان اللوحة").setRequired(true))
    .addStringOption(o => o.setName("الوصف").setDescription("وصف اللوحة").setRequired(false))
    .addStringOption(o => o
      .setName("اللون").setDescription("لون الـ Embed").setRequired(false)
      .addChoices(...COLOR_CHOICES)
    )
    .addStringOption(o => o.setName("صورة").setDescription("رابط صورة كبيرة").setRequired(false))
    .addStringOption(o => o.setName("ثمبنيل").setDescription("رابط صورة صغيرة").setRequired(false))
    .addBooleanOption(o => o.setName("حصري").setDescription("رتبة واحدة فقط من اللوحة؟").setRequired(false)),

  helpMeta: {
    category: "roles",
    description: "إنشاء لوحة رتب جديدة بالأزرار في قناة معينة",
    examples: [
      "/لوحة-رتب-إنشاء العنوان:اختر رتبتك الوصف:اضغط الزر للحصول على رتبتك",
      "/لوحة-رتب-إنشاء العنوان:الاهتمامات اللون:🔵 أزرق حصري:✅ مفعّل"
    ],
    notes: [
      "اللوحة تُنشأ فاضية — أضف الأزرار بـ /لوحة-رتب-إضافة",
      "الوضع الحصري = العضو يقدر يأخذ رتبة واحدة فقط من اللوحة"
    ],
    requirements: {
      botRoleHierarchy: true,
      userPermissions: ["ManageRoles"],
      subscriptionTier: "silver"
    },
    cooldown: 0,
    relatedCommands: ["لوحة-رتب-إضافة", "لوحة-رتب-تعديل", "لوحة-رتب-قائمة", "رتبة"]
  },

  async execute(interaction) {
    try {
      if (!interaction.guild) {
        return interaction.reply({ content: "❌ هذا الأمر داخل السيرفر فقط", ephemeral: true })
      }

      const isAdmin = commandGuardSystem.requireAdmin(interaction)
      if (!isAdmin) {
        return interaction.reply({ content: "❌ هذا الأمر للإدارة فقط", ephemeral: true })
      }

      await ensureTable()

      const title     = interaction.options.getString("العنوان")
      const desc      = interaction.options.getString("الوصف")
      const color     = interaction.options.getString("اللون") || "أزرق"
      const image     = interaction.options.getString("صورة")
      const thumbnail = interaction.options.getString("ثمبنيل")
      const exclusive = interaction.options.getBoolean("حصري") ?? false

      await interaction.deferReply({ ephemeral: true })

      const panelData = { title, description: desc, color, image_url: image, thumbnail, exclusive }
      const { embeds, components } = await buildPanelMessage(panelData, [])
      const sent = await interaction.channel.send({ embeds, components })

      await databaseSystem.query(`
        INSERT INTO button_role_panels
        (guild_id, channel_id, message_id, title, description, color, image_url, thumbnail, exclusive)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        interaction.guild.id, interaction.channel.id, sent.id,
        title, desc || null, color, image || null, thumbnail || null, exclusive
      ])

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x22c55e)
            .setTitle("✅ تم إنشاء اللوحة")
            .addFields(
              { name: "📌 ID الرسالة", value: `\`${sent.id}\``, inline: true },
              { name: "⚡ حصري", value: exclusive ? "نعم — رتبة واحدة فقط" : "لا — أكثر من رتبة", inline: true },
              { name: "➕ الخطوة التالية", value: `استخدم \`/لوحة-رتب-إضافة\` وأدخل ID: \`${sent.id}\`` }
            )
        ]
      })

    } catch (err) {
      console.error("[BUTTON-ROLE-CREATE ERROR]", err)
      const msg = "❌ حدث خطأ أثناء إنشاء اللوحة."
      if (interaction.deferred) return interaction.editReply({ content: msg })
      if (!interaction.replied) return interaction.reply({ content: msg, ephemeral: true })
    }
  }
}
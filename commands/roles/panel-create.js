const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  MessageFlags
} = require("discord.js")
const commandGuardSystem = require("../../systems/commandGuardSystem")
const databaseSystem     = require("../../systems/databaseSystem")
const {
  ensureTable,
  buildPanelMessage,
  isValidHttpUrl,
  COLOR_CHOICES
} = require("./_button-role-shared")

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
    .addStringOption(o => o.setName("صورة").setDescription("رابط صورة كبيرة (http/https)").setRequired(false))
    .addStringOption(o => o.setName("ثمبنيل").setDescription("رابط صورة صغيرة (http/https)").setRequired(false))
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
      "خانات الصورة والثمبنيل لازم تكون روابط تبدأ بـ http:// أو https://"
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
      await interaction.deferReply({ flags: MessageFlags.Ephemeral })
    } catch (e) {
      console.error("[BUTTON-ROLE-CREATE] defer failed:", e.message)
      return
    }

    try {
      if (!interaction.guild) {
        return interaction.editReply({ content: "❌ هذا الأمر داخل السيرفر فقط" })
      }

      const isAdmin = commandGuardSystem.requireAdmin(interaction)
      if (!isAdmin) {
        return interaction.editReply({ content: "❌ هذا الأمر للإدارة فقط" })
      }

      const title     = interaction.options.getString("العنوان")
      const desc      = interaction.options.getString("الوصف")
      const color     = interaction.options.getString("اللون") || "أزرق"
      const imageRaw  = interaction.options.getString("صورة")
      const thumbRaw  = interaction.options.getString("ثمبنيل")
      const exclusive = interaction.options.getBoolean("حصري") ?? false

      if (imageRaw && !isValidHttpUrl(imageRaw)) {
        return interaction.editReply({
          content: "❌ خيار `صورة` لازم يكون رابط يبدأ بـ `http://` أو `https://`"
        })
      }
      if (thumbRaw && !isValidHttpUrl(thumbRaw)) {
        return interaction.editReply({
          content: "❌ خيار `ثمبنيل` لازم يكون رابط يبدأ بـ `http://` أو `https://`"
        })
      }

      const image     = imageRaw ? imageRaw.trim() : null
      const thumbnail = thumbRaw ? thumbRaw.trim() : null

      await ensureTable()

      const panelData = { title, description: desc, color, image_url: image, thumbnail, exclusive }
      const { embeds, components } = await buildPanelMessage(panelData, [])
      const sent = await interaction.channel.send({ embeds, components })

      await databaseSystem.query(`
        INSERT INTO button_role_panels
        (guild_id, channel_id, message_id, title, description, color, image_url, thumbnail, exclusive)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        interaction.guild.id, interaction.channel.id, sent.id,
        title, desc || null, color, image, thumbnail, exclusive
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
      try {
        return await interaction.editReply({ content: "❌ حدث خطأ أثناء إنشاء اللوحة." })
      } catch {}
    }
  }
}
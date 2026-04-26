const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require("discord.js")
const discordLog = require("../../systems/discordLogSystem")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("قفل")
    .setDescription("قفل قناة ومنع الأعضاء من الكتابة فيها")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addChannelOption(option =>
      option
        .setName("القناة")
        .setDescription("القناة المراد قفلها (الحالية إذا ما حددت)")
        .setRequired(false)
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.GuildForum)
    )
    .addStringOption(option =>
      option.setName("السبب").setDescription("سبب قفل القناة (اختياري)").setRequired(false)
    ),

  helpMeta: {
    category: "moderation",
    aliases: ["lock", "قفل"],
    description: "قفل قناة ومنع الأعضاء من الكتابة فيها (للأعضاء العاديين)",
    options: [
      { name: "القناة", description: "القناة المراد قفلها (الحالية إذا ما حددت)", required: false },
      { name: "السبب", description: "سبب القفل", required: false }
    ],
    requirements: {
      botRoleHierarchy: false,
      userPermissions: ["ManageChannels"],
      subscriptionTier: "free"
    },
    cooldown: 0,
    relatedCommands: ["فتح", "بطيء"],
    examples: [
      "/قفل (يقفل القناة الحالية)",
      "/قفل القناة:#general",
      "/قفل القناة:#chat السبب:صيانة"
    ],
    notes: [
      "القفل يمنع الأعضاء العاديين فقط — الأدمن لسه يقدر يكتب",
      "البوت يفحص لو القناة مقفلة فعلاً",
      "استخدم /فتح لإعادة فتحها"
    ]
  },

  async execute(interaction) {
    try {
      if (!interaction.guild) {
        return interaction.reply({ content: "❌ هذا الأمر يُستخدم داخل السيرفر فقط.", ephemeral: true })
      }

      const targetChannel = interaction.options.getChannel("القناة") || interaction.channel
      const reason        = interaction.options.getString("السبب") || "لم يتم تحديد سبب"

      const botPermissions = targetChannel.permissionsFor(interaction.guild.members.me)
      if (!botPermissions || !botPermissions.has(PermissionFlagsBits.ManageChannels)) {
        return interaction.reply({ content: "❌ البوت ما عنده صلاحية **إدارة القنوات** في هذي القناة.", ephemeral: true })
      }

      const everyoneRole     = interaction.guild.roles.everyone
      const currentPerms     = targetChannel.permissionOverwrites.cache.get(everyoneRole.id)
      const currentSendPerms = currentPerms?.deny?.has(PermissionFlagsBits.SendMessages)

      if (currentSendPerms) {
        return interaction.reply({ content: "⚠️ هذي القناة مقفلة بالفعل.", ephemeral: true })
      }

      await targetChannel.permissionOverwrites.edit(everyoneRole, {
        SendMessages: false
      }, { reason: `${reason} | بواسطة: ${interaction.user.username}` })

      const embed = new EmbedBuilder()
        .setColor(0xef4444)
        .setTitle("🔒 تم قفل القناة")
        .addFields(
          { name: "📢 القناة",  value: `${targetChannel}`,                                             inline: true  },
          { name: "📝 السبب",   value: reason,                                                          inline: false },
          { name: "👮 بواسطة",  value: `${interaction.user} (\`${interaction.user.username}\`)`,        inline: true  }
        )
        .setFooter({ text: "استخدم /فتح لفتح القناة مجدداً" })
        .setTimestamp()

      // ✅ LOG
      discordLog.logLock(interaction.guild, {
        moderator: interaction.user,
        channel:   targetChannel,
        reason
      }).catch(() => {})

      return interaction.reply({ embeds: [embed] })

    } catch (err) {
      console.error("[LOCK ERROR]", err)

      if (interaction.replied || interaction.deferred) {
        return interaction.followUp({ content: "❌ حدث خطأ أثناء قفل القناة.", ephemeral: true })
      }
      return interaction.reply({ content: "❌ حدث خطأ أثناء قفل القناة.", ephemeral: true })
    }
  },
}
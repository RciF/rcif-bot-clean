const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require("discord.js")
const discordLog = require("../../systems/discordLogSystem")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("فتح")
    .setDescription("فتح قناة مقفلة والسماح للأعضاء بالكتابة")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addChannelOption(option =>
      option
        .setName("القناة")
        .setDescription("القناة المراد فتحها (الحالية إذا ما حددت)")
        .setRequired(false)
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.GuildForum)
    )
    .addStringOption(option =>
      option.setName("السبب").setDescription("سبب فتح القناة (اختياري)").setRequired(false)
    ),

  helpMeta: {
    category: "moderation",
    aliases: ["unlock", "فتح"],
    description: "فتح قناة مقفلة وإعادة الكتابة للجميع",
    options: [
      { name: "القناة", description: "القناة المراد فتحها (الحالية إذا ما حددت)", required: false },
      { name: "السبب", description: "سبب الفتح", required: false }
    ],
    requirements: {
      botRoleHierarchy: false,
      userPermissions: ["ManageChannels"],
      subscriptionTier: "free"
    },
    cooldown: 0,
    relatedCommands: ["قفل"],
    examples: [
      "/فتح",
      "/فتح القناة:#general"
    ],
    notes: [
      "البوت يفحص لو القناة فعلاً مقفلة",
      "يعيد الإعدادات الافتراضية للقناة"
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

      const everyoneRole = interaction.guild.roles.everyone
      const currentPerms = targetChannel.permissionOverwrites.cache.get(everyoneRole.id)
      const isLocked     = currentPerms?.deny?.has(PermissionFlagsBits.SendMessages)

      if (!isLocked) {
        return interaction.reply({ content: "⚠️ هذي القناة مفتوحة أصلاً وليست مقفلة.", ephemeral: true })
      }

      await targetChannel.permissionOverwrites.edit(everyoneRole, {
        SendMessages: null
      }, { reason: `${reason} | بواسطة: ${interaction.user.username}` })

      const embed = new EmbedBuilder()
        .setColor(0x22c55e)
        .setTitle("🔓 تم فتح القناة")
        .addFields(
          { name: "📢 القناة",  value: `${targetChannel}`,                                             inline: true  },
          { name: "📝 السبب",   value: reason,                                                          inline: false },
          { name: "👮 بواسطة",  value: `${interaction.user} (\`${interaction.user.username}\`)`,        inline: true  }
        )
        .setFooter({ text: "استخدم /قفل لقفل القناة مجدداً" })
        .setTimestamp()

      // ✅ LOG
      discordLog.logUnlock(interaction.guild, {
        moderator: interaction.user,
        channel:   targetChannel,
        reason
      }).catch(() => {})

      return interaction.reply({ embeds: [embed] })

    } catch (err) {
      console.error("[UNLOCK ERROR]", err)

      if (interaction.replied || interaction.deferred) {
        return interaction.followUp({ content: "❌ حدث خطأ أثناء فتح القناة.", ephemeral: true })
      }
      return interaction.reply({ content: "❌ حدث خطأ أثناء فتح القناة.", ephemeral: true })
    }
  },
}
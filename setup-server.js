// ═══════════════════════════════════════════════════════════════════
//  🌟 Lyn Support Server — ULTIMATE SETUP SCRIPT v2.0
//  سكربت الإعداد الأسطوري — يعيد بناء السيرفر بالكامل
//  
//  شغّله مرة وحدة: node setup-server.js
//  ⚠️ يحذف كل القنوات والرولات الحالية
//  ⚠️ يستغرق 3-5 دقائق بسبب Rate Limits
// ═══════════════════════════════════════════════════════════════════

require("dotenv").config()

const {
  Client,
  GatewayIntentBits,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js")

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages
  ]
})

// ═══════════════════════════════════════════════════════════════════
//  CONFIG
// ═══════════════════════════════════════════════════════════════════

const GUILD_ID = "1490775708291694684" // ← حط ID سيرفرك هنا

const COLORS = {
  OWNER:     0xFFD700,  // ذهبي
  ADMIN:     0xFF4444,  // أحمر
  DEV:       0x00C8FF,  // سماوي
  SUPPORT:   0x00FFE7,  // تركواز
  DIAMOND:   0x00BFFF,  // أزرق فاتح
  GOLD:      0xFFD700,  // ذهبي
  SILVER:    0xC0C0C0,  // فضي
  MEMBER:    0x22C55E,  // أخضر
  NEW:       0x94A3B8,  // رمادي
  BOT:       0x8B5CF6,  // بنفسجي
  BLUE:      0x3B82F6,
  PURPLE:    0xA855F7,
  GREEN:     0x22C55E,
  RED:       0xEF4444,
  YELLOW:    0xEAB308,
  DARK:      0x2B2D31
}

// ═══════════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════════

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function safeDelete(item) {
  try { await item.delete() } catch {}
  await sleep(350)
}

async function makeChannel(guild, opts) {
  await sleep(500)
  try {
    return await guild.channels.create(opts)
  } catch (err) {
    console.error(`❌ فشل إنشاء قناة ${opts.name}:`, err.message)
    return null
  }
}

async function makeRole(guild, opts) {
  await sleep(400)
  try {
    return await guild.roles.create(opts)
  } catch (err) {
    console.error(`❌ فشل إنشاء رتبة ${opts.name}:`, err.message)
    return null
  }
}

function log(emoji, msg) {
  console.log(`${emoji} ${msg}`)
}

// ═══════════════════════════════════════════════════════════════════
//  MAIN
// ═══════════════════════════════════════════════════════════════════

client.once("ready", async () => {
  console.log("\n╔══════════════════════════════════════════════════════════╗")
  console.log("║   🌟 LYN SERVER SETUP — STARTING                         ║")
  console.log("╚══════════════════════════════════════════════════════════╝\n")

  console.log(`✅ Logged in as ${client.user.tag}`)

  const guild = await client.guilds.fetch(GUILD_ID)
  if (!guild) {
    console.error("❌ Guild not found — تأكد من GUILD_ID")
    process.exit(1)
  }

  console.log(`📍 Server: ${guild.name}`)
  console.log(`📊 Members: ${guild.memberCount}\n`)

  // ───────────────────────────────────────────────────────
  //  STEP 1: DELETE ALL CHANNELS
  // ───────────────────────────────────────────────────────
  log("🗑️", "Deleting all channels...")
  const channels = await guild.channels.fetch()
  for (const [, ch] of channels) await safeDelete(ch)
  log("✅", `Deleted ${channels.size} channels\n`)

  // ───────────────────────────────────────────────────────
  //  STEP 2: DELETE ALL ROLES (except @everyone and managed)
  // ───────────────────────────────────────────────────────
  log("🗑️", "Deleting all roles...")
  const roles = await guild.roles.fetch()
  let deletedRoles = 0
  for (const [, role] of roles) {
    if (role.id === guild.id || role.managed) continue
    await safeDelete(role)
    deletedRoles++
  }
  log("✅", `Deleted ${deletedRoles} roles\n`)

  // ───────────────────────────────────────────────────────
  //  STEP 3: CONFIGURE @EVERYONE
  // ───────────────────────────────────────────────────────
  log("⚙️", "Configuring @everyone...")
  await guild.roles.everyone.edit({
    permissions: []  // نمنع كل شي عن everyone
  })
  await sleep(400)
  log("✅", "@everyone configured\n")

  // ───────────────────────────────────────────────────────
  //  STEP 4: CREATE ROLES (bottom to top of hierarchy)
  // ───────────────────────────────────────────────────────
  log("🎭", "Creating roles...\n")

  // ── 🤖 البوتات (أعلى — مرفوعة عشان تدير كل شي) ──
  const botRole = await makeRole(guild, {
    name: "🤖 البوتات",
    color: COLORS.BOT,
    hoist: false,
    mentionable: false,
    permissions: [
      PermissionFlagsBits.Administrator
    ]
  })
  log("  ✅", `🤖 البوتات (ID: ${botRole.id})`)

  // ── 👤 جديد (صلاحيات دنيا — يشوف قنوات الترحيب فقط) ──
  const newMemberRole = await makeRole(guild, {
    name: "👤 جديد",
    color: COLORS.NEW,
    hoist: false,
    mentionable: false,
    permissions: []
  })
  log("  ✅", `👤 جديد (ID: ${newMemberRole.id})`)

  // ── ✅ عضو (صلاحيات عادية — يكتب في القنوات العامة) ──
  const memberRole = await makeRole(guild, {
    name: "✅ عضو",
    color: COLORS.MEMBER,
    hoist: true,
    mentionable: false,
    permissions: [
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.ReadMessageHistory,
      PermissionFlagsBits.AddReactions,
      PermissionFlagsBits.UseApplicationCommands,
      PermissionFlagsBits.UseExternalEmojis,
      PermissionFlagsBits.Connect,
      PermissionFlagsBits.Speak,
      PermissionFlagsBits.UseVAD,
      PermissionFlagsBits.Stream,
      PermissionFlagsBits.CreatePublicThreads,
      PermissionFlagsBits.SendMessagesInThreads
    ]
  })
  log("  ✅", `✅ عضو (ID: ${memberRole.id})`)

  // ── ⭐ Silver (عضو + إرسال صور) ──
  const silverRole = await makeRole(guild, {
    name: "⭐ Silver",
    color: COLORS.SILVER,
    hoist: true,
    mentionable: false,
    permissions: [
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.ReadMessageHistory,
      PermissionFlagsBits.AddReactions,
      PermissionFlagsBits.UseApplicationCommands,
      PermissionFlagsBits.UseExternalEmojis,
      PermissionFlagsBits.UseExternalStickers,
      PermissionFlagsBits.AttachFiles,
      PermissionFlagsBits.Connect,
      PermissionFlagsBits.Speak,
      PermissionFlagsBits.UseVAD,
      PermissionFlagsBits.Stream,
      PermissionFlagsBits.CreatePublicThreads,
      PermissionFlagsBits.SendMessagesInThreads,
      PermissionFlagsBits.ChangeNickname
    ]
  })
  log("  ✅", `⭐ Silver (ID: ${silverRole.id})`)

  // ── 👑 Gold (Silver + روابط + إيموجيات خارجية + تفاعلات صوتية) ──
  const goldRole = await makeRole(guild, {
    name: "👑 Gold",
    color: COLORS.GOLD,
    hoist: true,
    mentionable: false,
    permissions: [
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.ReadMessageHistory,
      PermissionFlagsBits.AddReactions,
      PermissionFlagsBits.UseApplicationCommands,
      PermissionFlagsBits.UseExternalEmojis,
      PermissionFlagsBits.UseExternalStickers,
      PermissionFlagsBits.AttachFiles,
      PermissionFlagsBits.EmbedLinks,
      PermissionFlagsBits.Connect,
      PermissionFlagsBits.Speak,
      PermissionFlagsBits.UseVAD,
      PermissionFlagsBits.PrioritySpeaker,
      PermissionFlagsBits.Stream,
      PermissionFlagsBits.CreatePublicThreads,
      PermissionFlagsBits.CreatePrivateThreads,
      PermissionFlagsBits.SendMessagesInThreads,
      PermissionFlagsBits.ChangeNickname,
      PermissionFlagsBits.UseSoundboard,
      PermissionFlagsBits.UseExternalSounds
    ]
  })
  log("  ✅", `👑 Gold (ID: ${goldRole.id})`)

  // ── 💎 Diamond (Gold + كل الميزات المتقدمة) ──
  const diamondRole = await makeRole(guild, {
    name: "💎 Diamond",
    color: COLORS.DIAMOND,
    hoist: true,
    mentionable: false,
    permissions: [
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.ReadMessageHistory,
      PermissionFlagsBits.AddReactions,
      PermissionFlagsBits.UseApplicationCommands,
      PermissionFlagsBits.UseExternalEmojis,
      PermissionFlagsBits.UseExternalStickers,
      PermissionFlagsBits.AttachFiles,
      PermissionFlagsBits.EmbedLinks,
      PermissionFlagsBits.MentionEveryone,
      PermissionFlagsBits.Connect,
      PermissionFlagsBits.Speak,
      PermissionFlagsBits.UseVAD,
      PermissionFlagsBits.PrioritySpeaker,
      PermissionFlagsBits.Stream,
      PermissionFlagsBits.UseEmbeddedActivities,
      PermissionFlagsBits.CreatePublicThreads,
      PermissionFlagsBits.CreatePrivateThreads,
      PermissionFlagsBits.SendMessagesInThreads,
      PermissionFlagsBits.ChangeNickname,
      PermissionFlagsBits.UseSoundboard,
      PermissionFlagsBits.UseExternalSounds,
      PermissionFlagsBits.CreateInstantInvite
    ]
  })
  log("  ✅", `💎 Diamond (ID: ${diamondRole.id})`)

  // ── 🎫 فريق الدعم (صلاحيات إشراف — بان، كيك، كتم، إدارة الرسائل) ──
  const supportRole = await makeRole(guild, {
    name: "🎫 فريق الدعم",
    color: COLORS.SUPPORT,
    hoist: true,
    mentionable: true,
    permissions: [
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.ReadMessageHistory,
      PermissionFlagsBits.AddReactions,
      PermissionFlagsBits.UseApplicationCommands,
      PermissionFlagsBits.UseExternalEmojis,
      PermissionFlagsBits.AttachFiles,
      PermissionFlagsBits.EmbedLinks,
      PermissionFlagsBits.ManageMessages,
      PermissionFlagsBits.ModerateMembers,
      PermissionFlagsBits.KickMembers,
      PermissionFlagsBits.BanMembers,
      PermissionFlagsBits.MuteMembers,
      PermissionFlagsBits.DeafenMembers,
      PermissionFlagsBits.MoveMembers,
      PermissionFlagsBits.Connect,
      PermissionFlagsBits.Speak,
      PermissionFlagsBits.Stream,
      PermissionFlagsBits.ChangeNickname,
      PermissionFlagsBits.ManageThreads,
      PermissionFlagsBits.MentionEveryone
    ]
  })
  log("  ✅", `🎫 فريق الدعم (ID: ${supportRole.id})`)

  // ── 🔧 المطور (صلاحيات تقنية — بدون بان/كيك، بس Webhooks/Audit/Bots) ──
  const devRole = await makeRole(guild, {
    name: "🔧 المطور",
    color: COLORS.DEV,
    hoist: true,
    mentionable: true,
    permissions: [
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.ReadMessageHistory,
      PermissionFlagsBits.AddReactions,
      PermissionFlagsBits.UseApplicationCommands,
      PermissionFlagsBits.UseExternalEmojis,
      PermissionFlagsBits.AttachFiles,
      PermissionFlagsBits.EmbedLinks,
      PermissionFlagsBits.ManageMessages,
      PermissionFlagsBits.ManageWebhooks,
      PermissionFlagsBits.ManageEvents,
      PermissionFlagsBits.ViewAuditLog,
      PermissionFlagsBits.ViewGuildInsights,
      PermissionFlagsBits.ManageEmojisAndStickers,
      PermissionFlagsBits.ManageThreads,
      PermissionFlagsBits.Connect,
      PermissionFlagsBits.Speak,
      PermissionFlagsBits.Stream,
      PermissionFlagsBits.ChangeNickname,
      PermissionFlagsBits.MentionEveryone
    ]
  })
  log("  ✅", `🔧 المطور (ID: ${devRole.id})`)

  // ── ⚙️ الإدارة (صلاحيات عالية — كل شي تقريباً) ──
  const adminRole = await makeRole(guild, {
    name: "⚙️ الإدارة",
    color: COLORS.ADMIN,
    hoist: true,
    mentionable: true,
    permissions: [
      PermissionFlagsBits.Administrator
    ]
  })
  log("  ✅", `⚙️ الإدارة (ID: ${adminRole.id})`)

  // ── 👑 المالك (Administrator) ──
  const ownerRole = await makeRole(guild, {
    name: "👑 المالك",
    color: COLORS.OWNER,
    hoist: true,
    mentionable: true,
    permissions: [
      PermissionFlagsBits.Administrator
    ]
  })
  log("  ✅", `👑 المالك (ID: ${ownerRole.id})\n`)

  // ═══════════════════════════════════════════════════════════════════
  //  STEP 5: SAVE ROLES TO GLOBAL (for access in next steps)
  // ═══════════════════════════════════════════════════════════════════
  
  global.LYN_ROLES = {
    owner:     ownerRole,
    admin:     adminRole,
    dev:       devRole,
    support:   supportRole,
    diamond:   diamondRole,
    gold:      goldRole,
    silver:    silverRole,
    member:    memberRole,
    newMember: newMemberRole,
    bot:       botRole
  }

  log("💾", "Roles saved to global\n")
  log("⏭️", "Continuing to channels creation...\n")

  // القنوات في الجزء 2 (راح أرسله لك بعد هذا)
  // نستدعي الدالة الرئيسية للجزء 2
  await createChannelsPart(guild)
})

client.login(process.env.DISCORD_TOKEN)

// ═══════════════════════════════════════════════════════════════════
//  الجزء 2 يلي هنا في الرسالة القادمة
// ═══════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════
//  PART 2: CREATE CHANNELS + POPULATE WITH CONTENT
// ═══════════════════════════════════════════════════════════════════

async function createChannelsPart(guild) {
  const R = global.LYN_ROLES

  // ─── Permission Builders ───
  const ADMIN_ROLES  = [R.owner, R.admin, R.dev]
  const STAFF_ROLES  = [R.owner, R.admin, R.dev, R.support]
  const SUB_ROLES    = [R.diamond, R.gold, R.silver]
  const ALL_MEMBERS  = [R.diamond, R.gold, R.silver, R.member]

  // قناة مخفية بالكامل عن everyone، يشوفها الأعضاء فقط
  const membersOnly = () => [
    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
    { id: R.newMember.id, deny: [PermissionFlagsBits.ViewChannel] },
    ...ALL_MEMBERS.map(r => ({
      id: r.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AddReactions
      ]
    })),
    ...STAFF_ROLES.map(r => ({
      id: r.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.ManageMessages
      ]
    })),
    { id: R.bot.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
  ]

  // قناة قراءة فقط للأعضاء
  const readOnlyMembers = () => [
    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
    { id: R.newMember.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory], deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.AddReactions] },
    ...ALL_MEMBERS.map(r => ({
      id: r.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AddReactions],
      deny: [PermissionFlagsBits.SendMessages]
    })),
    ...STAFF_ROLES.map(r => ({
      id: r.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages]
    })),
    { id: R.bot.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
  ]

  // قناة التحقق: الجدد يشوفون ولا يكتبون، الأعضاء ما يشوفون
  const verifyChannel = () => [
    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
    { id: R.newMember.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory], deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.AddReactions] },
    { id: R.member.id, deny: [PermissionFlagsBits.ViewChannel] },
    ...SUB_ROLES.map(r => ({ id: r.id, deny: [PermissionFlagsBits.ViewChannel] })),
    ...STAFF_ROLES.map(r => ({
      id: r.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
    })),
    { id: R.bot.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
  ]

  // قناة الإدارة فقط
  const adminOnly = () => [
    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
    ...ADMIN_ROLES.map(r => ({
      id: r.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
    })),
    { id: R.bot.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
  ]

  // قناة Staff فقط (إدارة + دعم)
  const staffOnly = () => [
    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
    ...STAFF_ROLES.map(r => ({
      id: r.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
    })),
    { id: R.bot.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
  ]

  // قناة لوق: الإدارة تشوف، البوت يكتب
  const logChannel = () => [
    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
    ...ADMIN_ROLES.map(r => ({
      id: r.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
      deny: [PermissionFlagsBits.SendMessages]
    })),
    { id: R.bot.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks] }
  ]

  // قناة مشتركين حصرية (أعلى من المستوى المحدد فقط)
  const subLevel = (allowedRoles) => [
    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
    ...allowedRoles.map(r => ({
      id: r.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AddReactions,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks
      ]
    })),
    ...STAFF_ROLES.map(r => ({
      id: r.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
    })),
    { id: R.bot.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
  ]

  // قناة صوتية
  const voiceChannel = (allowedRoles) => [
    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
    { id: R.newMember.id, deny: [PermissionFlagsBits.ViewChannel] },
    ...allowedRoles.map(r => ({
      id: r.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.Connect,
        PermissionFlagsBits.Speak,
        PermissionFlagsBits.UseVAD,
        PermissionFlagsBits.Stream
      ]
    })),
    ...STAFF_ROLES.map(r => ({
      id: r.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.Connect,
        PermissionFlagsBits.Speak,
        PermissionFlagsBits.MuteMembers,
        PermissionFlagsBits.MoveMembers
      ]
    })),
    { id: R.bot.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect] }
  ]

  console.log("\n═══════════════════════════════════════════════")
  log("📁", "Creating channels...\n")

  // ───────────────────────────────────────
  //  🌟 الترحيب
  // ───────────────────────────────────────
  log("🌟", "Creating Welcome category...")
  const welcomeCat = await makeChannel(guild, {
    name: "━━━━ 🌟 الترحيب ━━━━",
    type: ChannelType.GuildCategory,
    permissionOverwrites: [
      { id: guild.id, allow: [PermissionFlagsBits.ViewChannel] }
    ]
  })

  const verifyCh = await makeChannel(guild, {
    name: "✅│التحقق",
    type: ChannelType.GuildText,
    parent: welcomeCat,
    topic: "اضغط الزر للتحقق والحصول على صلاحية الوصول للسيرفر",
    permissionOverwrites: verifyChannel()
  })

  const welcomeCh = await makeChannel(guild, {
    name: "👋│الترحيب",
    type: ChannelType.GuildText,
    parent: welcomeCat,
    topic: "رسائل ترحيب بالأعضاء الجدد",
    permissionOverwrites: readOnlyMembers()
  })

  const rulesCh = await makeChannel(guild, {
    name: "📋│القوانين",
    type: ChannelType.GuildText,
    parent: welcomeCat,
    topic: "قوانين السيرفر — اقرأها قبل المشاركة",
    permissionOverwrites: readOnlyMembers()
  })

  const announcementsCh = await makeChannel(guild, {
    name: "📢│الإعلانات",
    type: ChannelType.GuildText,
    parent: welcomeCat,
    topic: "الإعلانات الرسمية للبوت والسيرفر",
    permissionOverwrites: readOnlyMembers()
  })

  const updatesCh = await makeChannel(guild, {
    name: "🔄│التحديثات",
    type: ChannelType.GuildText,
    parent: welcomeCat,
    topic: "آخر تحديثات البوت والمميزات الجديدة",
    permissionOverwrites: readOnlyMembers()
  })

  const guideCh = await makeChannel(guild, {
    name: "🗺️│دليل-السيرفر",
    type: ChannelType.GuildText,
    parent: welcomeCat,
    topic: "دليل شامل لكيفية استخدام السيرفر والبوت",
    permissionOverwrites: readOnlyMembers()
  })

  log("  ✅", "6 channels created\n")

  // ───────────────────────────────────────
  //  💬 المجتمع
  // ───────────────────────────────────────
  log("💬", "Creating Community category...")
  const communityCat = await makeChannel(guild, {
    name: "━━━━ 💬 المجتمع ━━━━",
    type: ChannelType.GuildCategory,
    permissionOverwrites: membersOnly()
  })

  await makeChannel(guild, {
    name: "💬│عام",
    type: ChannelType.GuildText,
    parent: communityCat,
    topic: "الدردشة العامة — تواصل مع المجتمع",
    permissionOverwrites: membersOnly()
  })

  await makeChannel(guild, {
    name: "🖼️│صور",
    type: ChannelType.GuildText,
    parent: communityCat,
    topic: "شارك الصور (للمشتركين فقط من Silver وأعلى)",
    permissionOverwrites: subLevel([R.silver, R.gold, R.diamond])
  })

  await makeChannel(guild, {
    name: "🎮│ألعاب",
    type: ChannelType.GuildText,
    parent: communityCat,
    topic: "تحدث عن ألعابك المفضلة",
    permissionOverwrites: membersOnly()
  })

  await makeChannel(guild, {
    name: "💡│اقتراحات",
    type: ChannelType.GuildText,
    parent: communityCat,
    topic: "اقترح تحسينات للبوت أو السيرفر",
    permissionOverwrites: membersOnly()
  })

  await makeChannel(guild, {
    name: "🌟│التقييمات",
    type: ChannelType.GuildText,
    parent: communityCat,
    topic: "شارك تجربتك مع البوت وقيّمها",
    permissionOverwrites: membersOnly()
  })

  await makeChannel(guild, {
    name: "🎉│فعاليات",
    type: ChannelType.GuildText,
    parent: communityCat,
    topic: "الفعاليات والمسابقات",
    permissionOverwrites: readOnlyMembers()
  })

  log("  ✅", "6 channels created\n")

  // ───────────────────────────────────────
  //  🤖 البوت
  // ───────────────────────────────────────
  log("🤖", "Creating Bot category...")
  const botCat = await makeChannel(guild, {
    name: "━━━━ 🤖 البوت ━━━━",
    type: ChannelType.GuildCategory,
    permissionOverwrites: membersOnly()
  })

  await makeChannel(guild, {
    name: "📜│قائمة-الأوامر",
    type: ChannelType.GuildText,
    parent: botCat,
    topic: "قائمة شاملة بكل أوامر البوت",
    permissionOverwrites: readOnlyMembers()
  })

  await makeChannel(guild, {
    name: "💰│الاقتصاد",
    type: ChannelType.GuildText,
    parent: botCat,
    topic: "استخدم أوامر الاقتصاد هنا (/رصيد /يومي /عمل...)",
    permissionOverwrites: membersOnly()
  })

  await makeChannel(guild, {
    name: "🧠│الذكاء-الاصطناعي",
    type: ChannelType.GuildText,
    parent: botCat,
    topic: "تحدث مع الذكاء الاصطناعي (/ذكاء)",
    permissionOverwrites: membersOnly()
  })

  await makeChannel(guild, {
    name: "🏆│المستويات",
    type: ChannelType.GuildText,
    parent: botCat,
    topic: "تحقق من مستواك وتصدر اللوحة",
    permissionOverwrites: membersOnly()
  })

  await makeChannel(guild, {
    name: "📊│إحصائيات-السيرفر",
    type: ChannelType.GuildText,
    parent: botCat,
    topic: "إحصائيات مباشرة للسيرفر",
    permissionOverwrites: readOnlyMembers()
  })

  log("  ✅", "5 channels created\n")

  // ───────────────────────────────────────
  //  🎫 الدعم الفني
  // ───────────────────────────────────────
  log("🎫", "Creating Support category...")
  const supportCat = await makeChannel(guild, {
    name: "━━━━ 🎫 الدعم الفني ━━━━",
    type: ChannelType.GuildCategory,
    permissionOverwrites: membersOnly()
  })

  const ticketCh = await makeChannel(guild, {
    name: "🎫│افتح-تذكرة",
    type: ChannelType.GuildText,
    parent: supportCat,
    topic: "اضغط لفتح تذكرة دعم فني",
    permissionOverwrites: readOnlyMembers()
  })

  await makeChannel(guild, {
    name: "❓│الأسئلة-الشائعة",
    type: ChannelType.GuildText,
    parent: supportCat,
    topic: "إجابات على الأسئلة الأكثر شيوعاً",
    permissionOverwrites: readOnlyMembers()
  })

  await makeChannel(guild, {
    name: "🐛│الأخطاء",
    type: ChannelType.GuildText,
    parent: supportCat,
    topic: "بلّغ عن أي خطأ واجهته في البوت",
    permissionOverwrites: membersOnly()
  })

  await makeChannel(guild, {
    name: "🔗│ربط-سيرفر",
    type: ChannelType.GuildText,
    parent: supportCat,
    topic: "اربط اشتراكك بسيرفرك",
    permissionOverwrites: readOnlyMembers()
  })

  log("  ✅", "4 channels created\n")

  // ───────────────────────────────────────
  //  💎 المشتركين
  // ───────────────────────────────────────
  log("💎", "Creating Subscribers category...")
  const subsCat = await makeChannel(guild, {
    name: "━━━━ 💎 المشتركين ━━━━",
    type: ChannelType.GuildCategory,
    permissionOverwrites: [
      { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
      ...SUB_ROLES.map(r => ({ id: r.id, allow: [PermissionFlagsBits.ViewChannel] })),
      ...STAFF_ROLES.map(r => ({ id: r.id, allow: [PermissionFlagsBits.ViewChannel] }))
    ]
  })

  await makeChannel(guild, {
    name: "🏆│أفضل-المشتركين",
    type: ChannelType.GuildText,
    parent: subsCat,
    topic: "ليدربورد شهري لأفضل المشتركين",
    permissionOverwrites: [
      { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
      ...SUB_ROLES.map(r => ({
        id: r.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
        deny: [PermissionFlagsBits.SendMessages]
      })),
      ...STAFF_ROLES.map(r => ({ id: r.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] })),
      { id: R.bot.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
    ]
  })

  await makeChannel(guild, {
    name: "🎁│عروض-خاصة",
    type: ChannelType.GuildText,
    parent: subsCat,
    topic: "عروض حصرية للمشتركين",
    permissionOverwrites: [
      { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
      ...SUB_ROLES.map(r => ({
        id: r.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
        deny: [PermissionFlagsBits.SendMessages]
      })),
      ...STAFF_ROLES.map(r => ({ id: r.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] })),
      { id: R.bot.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
    ]
  })

  await makeChannel(guild, {
    name: "⭐│silver-حصري",
    type: ChannelType.GuildText,
    parent: subsCat,
    topic: "قناة حصرية للمشتركين Silver وأعلى",
    permissionOverwrites: subLevel([R.silver, R.gold, R.diamond])
  })

  await makeChannel(guild, {
    name: "👑│gold-حصري",
    type: ChannelType.GuildText,
    parent: subsCat,
    topic: "قناة حصرية للمشتركين Gold وأعلى",
    permissionOverwrites: subLevel([R.gold, R.diamond])
  })

  await makeChannel(guild, {
    name: "💎│diamond-حصري",
    type: ChannelType.GuildText,
    parent: subsCat,
    topic: "قناة حصرية للمشتركين Diamond فقط",
    permissionOverwrites: subLevel([R.diamond])
  })

  log("  ✅", "5 channels created\n")

  // ───────────────────────────────────────
  //  🔊 الصوتية
  // ───────────────────────────────────────
  log("🔊", "Creating Voice category...")
  const voiceCat = await makeChannel(guild, {
    name: "━━━━ 🔊 الصوتية ━━━━",
    type: ChannelType.GuildCategory,
    permissionOverwrites: membersOnly()
  })

  await makeChannel(guild, {
    name: "🔊 عام",
    type: ChannelType.GuildVoice,
    parent: voiceCat,
    permissionOverwrites: voiceChannel(ALL_MEMBERS)
  })

  await makeChannel(guild, {
    name: "🎮 ألعاب",
    type: ChannelType.GuildVoice,
    parent: voiceCat,
    permissionOverwrites: voiceChannel(ALL_MEMBERS)
  })

  await makeChannel(guild, {
    name: "🎵 موسيقى (Silver+)",
    type: ChannelType.GuildVoice,
    parent: voiceCat,
    permissionOverwrites: voiceChannel([R.silver, R.gold, R.diamond])
  })

  await makeChannel(guild, {
    name: "👑 VIP (Gold+)",
    type: ChannelType.GuildVoice,
    parent: voiceCat,
    permissionOverwrites: voiceChannel([R.gold, R.diamond])
  })

  await makeChannel(guild, {
    name: "💎 Diamond Lounge",
    type: ChannelType.GuildVoice,
    parent: voiceCat,
    permissionOverwrites: voiceChannel([R.diamond])
  })

  log("  ✅", "5 voice channels created\n")

  // ───────────────────────────────────────
  //  ⚙️ الإدارة (مخفية)
  // ───────────────────────────────────────
  log("⚙️", "Creating Admin category...")
  const adminCat = await makeChannel(guild, {
    name: "━━━━ ⚙️ الإدارة ━━━━",
    type: ChannelType.GuildCategory,
    permissionOverwrites: adminOnly()
  })

  await makeChannel(guild, {
    name: "🛡️│إدارة-عام",
    type: ChannelType.GuildText,
    parent: adminCat,
    topic: "قناة نقاشات الإدارة",
    permissionOverwrites: adminOnly()
  })

  await makeChannel(guild, {
    name: "⚙️│إعدادات-البوت",
    type: ChannelType.GuildText,
    parent: adminCat,
    topic: "إعدادات البوت — /config /settings",
    permissionOverwrites: adminOnly()
  })

  await makeChannel(guild, {
    name: "👮│سجل-الإشراف",
    type: ChannelType.GuildText,
    parent: adminCat,
    topic: "سجل أعمال الإشراف",
    permissionOverwrites: staffOnly()
  })

  await makeChannel(guild, {
    name: "📝│ملاحظات-الفريق",
    type: ChannelType.GuildText,
    parent: adminCat,
    topic: "ملاحظات داخلية للفريق",
    permissionOverwrites: staffOnly()
  })

  log("  ✅", "4 channels created\n")

  // ───────────────────────────────────────
  //  📊 اللوقات (مخفية)
  // ───────────────────────────────────────
  log("📊", "Creating Logs category...")
  const logsCat = await makeChannel(guild, {
    name: "━━━━ 📊 اللوقات ━━━━",
    type: ChannelType.GuildCategory,
    permissionOverwrites: [
      { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
      ...ADMIN_ROLES.map(r => ({ id: r.id, allow: [PermissionFlagsBits.ViewChannel] })),
      { id: R.bot.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
    ]
  })

  const logChannels = {}

  logChannels.messages = await makeChannel(guild, {
    name: "📨│لوق-الرسائل",
    type: ChannelType.GuildText,
    parent: logsCat,
    topic: "سجل حذف وتعديل الرسائل",
    permissionOverwrites: logChannel()
  })

  logChannels.members = await makeChannel(guild, {
    name: "👥│لوق-الأعضاء",
    type: ChannelType.GuildText,
    parent: logsCat,
    topic: "سجل دخول وخروج الأعضاء",
    permissionOverwrites: logChannel()
  })

  logChannels.moderation = await makeChannel(guild, {
    name: "🛡️│لوق-الإشراف",
    type: ChannelType.GuildText,
    parent: logsCat,
    topic: "سجل أعمال الإشراف (بان، كيك، كتم...)",
    permissionOverwrites: logChannel()
  })

  logChannels.server = await makeChannel(guild, {
    name: "📡│لوق-السيرفر",
    type: ChannelType.GuildText,
    parent: logsCat,
    topic: "سجل تغييرات السيرفر",
    permissionOverwrites: logChannel()
  })

  logChannels.tickets = await makeChannel(guild, {
    name: "🎫│لوق-التذاكر",
    type: ChannelType.GuildText,
    parent: logsCat,
    topic: "سجل التذاكر",
    permissionOverwrites: logChannel()
  })

  logChannels.bot = await makeChannel(guild, {
    name: "🤖│لوق-البوت",
    type: ChannelType.GuildText,
    parent: logsCat,
    topic: "سجل أخطاء وتحديثات البوت",
    permissionOverwrites: logChannel()
  })

  logChannels.subscriptions = await makeChannel(guild, {
    name: "💰│لوق-الاشتراكات",
    type: ChannelType.GuildText,
    parent: logsCat,
    topic: "سجل الاشتراكات",
    permissionOverwrites: logChannel()
  })

  logChannels.voice = await makeChannel(guild, {
    name: "🔊│لوق-الصوتية",
    type: ChannelType.GuildText,
    parent: logsCat,
    topic: "سجل القنوات الصوتية",
    permissionOverwrites: logChannel()
  })

  log("  ✅", "8 log channels created\n")

  // ═══════════════════════════════════════════════════════════════════
  //  STEP 6: POPULATE CHANNELS WITH CONTENT
  // ═══════════════════════════════════════════════════════════════════

  console.log("═══════════════════════════════════════════════")
  log("📝", "Populating channels with content...\n")

  // ── رسالة التحقق ──
  try {
    const verifyEmbed = new EmbedBuilder()
      .setColor(COLORS.GREEN)
      .setTitle("✅ التحقق من الحساب")
      .setDescription(
        "مرحباً بك في **Lyn Support** 🎉\n\n" +
        "لضمان سلامة المجتمع، نحتاج منك تأكيد أنك شخص حقيقي.\n\n" +
        "━━━━━━━━━━━━━━━\n\n" +
        "🔒 **لماذا نحتاج التحقق؟**\n\n" +
        "• حماية السيرفر من البوتات والـ Raids\n" +
        "• ضمان تجربة آمنة لجميع الأعضاء\n" +
        "• فتح الوصول لجميع القنوات\n\n" +
        "━━━━━━━━━━━━━━━\n\n" +
        "✨ **اضغط الزر أدناه للتحقق فوراً**\n\n" +
        "بعد التحقق ستحصل على:\n" +
        "• رتبة عضو موثّق ✅\n" +
        "• الوصول لكل قنوات السيرفر 🔓\n" +
        "• القدرة على المشاركة والتفاعل 💬"
      )
      .setFooter({ text: guild.name, iconURL: guild.iconURL({ dynamic: true }) })
      .setTimestamp()

    const verifyBtn = new ButtonBuilder()
      .setCustomId(`verify_panel:${R.member.id}:${R.newMember.id}`)
      .setLabel("✅ تحقق الآن")
      .setStyle(ButtonStyle.Success)
      .setEmoji("✅")

    const row = new ActionRowBuilder().addComponents(verifyBtn)

    await verifyCh.send({ embeds: [verifyEmbed], components: [row] })
    log("  ✅", "Verify message sent")
  } catch (err) { console.error("  ❌ Verify failed:", err.message) }

  await sleep(500)

  // ── رسالة القوانين ──
  try {
    const rulesEmbed = new EmbedBuilder()
      .setColor(COLORS.BLUE)
      .setTitle("📜 قوانين السيرفر")
      .setDescription(
        "مرحباً بك في سيرفر **Lyn Support** 🤖\n\n" +
        "الرجاء قراءة القوانين التالية والالتزام بها لضمان تجربة ممتعة للجميع.\n\n" +
        "📌 **القسم الأول — الاحترام والسلوك**\n\n" +
        "• احترم جميع الأعضاء وفريق الإدارة\n" +
        "• ممنوع السب والشتم والألفاظ المسيئة\n" +
        "• ممنوع التنمر أو التحرش بأي شكل\n" +
        "• ممنوع التمييز العنصري أو الطائفي أو الديني\n" +
        "• احترم خصوصية الأعضاء\n\n" +
        "📌 **القسم الثاني — المحتوى والرسائل**\n\n" +
        "• ممنوع النشر المتكرر (Spam)\n" +
        "• ممنوع الإعلانات الشخصية بدون إذن\n" +
        "• ممنوع المحتوى البالغ أو العنيف\n" +
        "• ممنوع الروابط المشبوهة\n" +
        "• استخدم القنوات حسب موضوعها\n\n" +
        "📌 **القسم الثالث — استخدام البوت**\n\n" +
        "• استخدم الأوامر في القنوات المخصصة\n" +
        "• ممنوع استغلال ثغرات الاقتصاد\n" +
        "• افتح تذكرة عند وجود مشكلة\n" +
        "• لا تسيء استخدام الذكاء الاصطناعي\n\n" +
        "📌 **القسم الرابع — الاشتراكات**\n\n" +
        "• الاشتراكات غير قابلة للاسترجاع\n" +
        "• اشتراك واحد = سيرفر واحد فقط\n" +
        "• للدعم، افتح تذكرة\n\n" +
        "📌 **القسم الخامس — العقوبات**\n\n" +
        "• تحذير للمخالفات البسيطة\n" +
        "• كتم أو طرد للمخالفات المتكررة\n" +
        "• حظر نهائي للمخالفات الخطيرة\n" +
        "• قرار الإدارة نهائي\n\n" +
        "📢 **ملاحظات مهمة**\n\n" +
        "• الانضمام يعني موافقتك على القوانين\n" +
        "• القوانين قابلة للتحديث\n" +
        "• أي استفسار، افتح تذكرة"
      )
      .setFooter({ text: "Lyn Bot • آخر تحديث", iconURL: guild.iconURL({ dynamic: true }) })
      .setTimestamp()

    await rulesCh.send({ embeds: [rulesEmbed] })
    log("  ✅", "Rules message sent")
  } catch (err) { console.error("  ❌ Rules failed:", err.message) }

  await sleep(500)

  // ── رسالة الإعلانات الترحيبية ──
  try {
    const announceEmbed = new EmbedBuilder()
      .setColor(COLORS.BLUE)
      .setTitle("✨ أهلاً بك في Lyn Support")
      .setDescription(
        "أهلاً وسهلاً بك في السيرفر الرسمي لبوت **Lyn** 🤖\n\n" +
        "السيرفر الرئيسي للدعم الفني، الاستفسارات، والاشتراكات.\n\n" +
        "━━━━━━━━━━━━━━━\n\n" +
        "🔰 **قبل أي شيء**\n\n" +
        `• اقرأ القوانين في ${rulesCh}\n` +
        `• أكمل التحقق في ${verifyCh}\n\n` +
        "━━━━━━━━━━━━━━━\n\n" +
        "🎫 **تحتاج مساعدة؟**\n\n" +
        `افتح تذكرة دعم في ${ticketCh}\n\n` +
        "━━━━━━━━━━━━━━━\n\n" +
        "🤖 **عن البوت**\n\n" +
        "بوت Lyn هو بوت عربي متكامل يجمع أفضل مميزات البوتات العالمية:\n\n" +
        "⚔️ **نظام الإشراف** — حظر، طرد، تحذيرات، كتم\n" +
        "💰 **نظام الاقتصاد** — عملات، وظائف، سيارات\n" +
        "🌟 **نظام XP** — مستويات، بطاقات مخصصة\n" +
        "📊 **نظام التذاكر** — دعم فني منظم\n" +
        "🇸🇦 **دعم كامل للغة العربية**\n" +
        "🧠 **ذكاء اصطناعي عربي**\n" +
        "🌐 **لوحة تحكم** — rcif-dashboard.onrender.com\n\n" +
        "━━━━━━━━━━━━━━━\n\n" +
        "💬 نتمنى لك تجربة ممتعة معنا!"
      )
      .setFooter({ text: "Lyn Bot • Powered by AI", iconURL: guild.iconURL({ dynamic: true }) })
      .setTimestamp()

    await announcementsCh.send({ embeds: [announceEmbed] })
    log("  ✅", "Announcement message sent")
  } catch (err) { console.error("  ❌ Announcement failed:", err.message) }

  await sleep(500)

  // ── دليل السيرفر ──
  try {
    const guideEmbed = new EmbedBuilder()
      .setColor(COLORS.PURPLE)
      .setTitle("🗺️ دليل السيرفر الشامل")
      .setDescription(
        "تعرّف على هيكل السيرفر وكيفية استخدامه بالشكل الأمثل.\n\n" +
        "━━━━━━━━━━━━━━━\n\n" +
        "🌟 **الترحيب**\n" +
        "قنوات البداية — تحقق، قوانين، إعلانات\n\n" +
        "💬 **المجتمع**\n" +
        "تواصل مع الأعضاء، شارك الصور، اقترح أفكار\n\n" +
        "🤖 **البوت**\n" +
        "جرب أوامر البوت — اقتصاد، AI، مستويات\n\n" +
        "🎫 **الدعم الفني**\n" +
        "افتح تذكرة، بلّغ عن خطأ، اربط سيرفرك\n\n" +
        "💎 **المشتركين**\n" +
        "قنوات حصرية لكل مستوى (Silver/Gold/Diamond)\n\n" +
        "🔊 **الصوتية**\n" +
        "دردشة صوتية، ألعاب، غرف VIP\n\n" +
        "━━━━━━━━━━━━━━━\n\n" +
        "💡 **نصائح للأعضاء الجدد:**\n\n" +
        "1️⃣ اقرأ القوانين أولاً\n" +
        "2️⃣ أكمل التحقق\n" +
        "3️⃣ جرب الأوامر في القنوات المخصصة\n" +
        "4️⃣ تفاعل مع المجتمع\n" +
        "5️⃣ افتح تذكرة لأي مساعدة"
      )
      .setFooter({ text: "Lyn Bot", iconURL: guild.iconURL({ dynamic: true }) })
      .setTimestamp()

    await guideCh.send({ embeds: [guideEmbed] })
    log("  ✅", "Guide message sent")
  } catch (err) { console.error("  ❌ Guide failed:", err.message) }

  await sleep(500)

  // ── الأسئلة الشائعة ──
  try {
    const faqChannel = guild.channels.cache.find(c => c.name.includes("الأسئلة-الشائعة"))
    if (faqChannel) {
      const faqEmbed = new EmbedBuilder()
        .setColor(COLORS.YELLOW)
        .setTitle("❓ الأسئلة الشائعة")
        .setDescription(
          "إجابات على الأسئلة الأكثر شيوعاً.\n\n" +
          "━━━━━━━━━━━━━━━\n\n" +
          "**💰 كيف أحصل على عملات؟**\n" +
          "استخدم `/يومي` يومياً و `/عمل` كل ساعة.\n\n" +
          "**🎫 كيف أفتح تذكرة دعم؟**\n" +
          "اذهب إلى قناة `افتح-تذكرة` واضغط الزر.\n\n" +
          "**💎 كيف أشترك في خطة؟**\n" +
          "زُر الداشبورد واختر خطتك.\n\n" +
          "**🔗 كيف أربط سيرفري بالبوت؟**\n" +
          "بعد الاشتراك، استخدم قناة `ربط-سيرفر`.\n\n" +
          "**🧠 كيف أستخدم الذكاء الاصطناعي؟**\n" +
          "استخدم `/ذكاء` واطرح سؤالك.\n\n" +
          "**🏆 كيف أرفع مستواي؟**\n" +
          "شارك في الدردشة، كل رسالة تعطيك XP.\n\n" +
          "**⚠️ واجهت خطأ في البوت، ماذا أفعل؟**\n" +
          "بلّغ عنه في قناة `الأخطاء` أو افتح تذكرة."
        )
        .setFooter({ text: "لم تجد إجابتك؟ افتح تذكرة دعم" })
        .setTimestamp()

      await faqChannel.send({ embeds: [faqEmbed] })
      log("  ✅", "FAQ message sent")
    }
  } catch (err) { console.error("  ❌ FAQ failed:", err.message) }

  // ═══════════════════════════════════════════════════════════════════
  //  STEP 7: FINAL REPORT
  // ═══════════════════════════════════════════════════════════════════

  console.log("\n\n╔══════════════════════════════════════════════════════════╗")
  console.log("║   ✅ SERVER SETUP COMPLETE — SUCCESS!                    ║")
  console.log("╚══════════════════════════════════════════════════════════╝\n")

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  console.log("📋 ROLE IDs — أضفها في Render Environment Variables:")
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  console.log(`OWNER_ROLE_ID=${R.owner.id}`)
  console.log(`ADMIN_ROLE_ID=${R.admin.id}`)
  console.log(`DEV_ROLE_ID=${R.dev.id}`)
  console.log(`SUPPORT_ROLE_ID=${R.support.id}`)
  console.log(`ROLE_DIAMOND=${R.diamond.id}`)
  console.log(`ROLE_GOLD=${R.gold.id}`)
  console.log(`ROLE_SILVER=${R.silver.id}`)
  console.log(`VERIFY_MEMBER_ROLE_ID=${R.member.id}`)
  console.log(`VERIFY_NEW_ROLE_ID=${R.newMember.id}`)
  console.log(`BOT_ROLE_ID=${R.bot.id}`)
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

  console.log("\n📋 LOG CHANNEL IDs — للـ /لوق أوامر:")
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  console.log(`Messages:       ${logChannels.messages?.id}`)
  console.log(`Members:        ${logChannels.members?.id}`)
  console.log(`Moderation:     ${logChannels.moderation?.id}`)
  console.log(`Server:         ${logChannels.server?.id}`)
  console.log(`Tickets:        ${logChannels.tickets?.id}`)
  console.log(`Bot:            ${logChannels.bot?.id}`)
  console.log(`Subscriptions:  ${logChannels.subscriptions?.id}`)
  console.log(`Voice:          ${logChannels.voice?.id}`)
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

  console.log("\n🎯 NEXT STEPS:")
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  console.log("1. أعطِ نفسك رتبة 👑 المالك يدوياً")
  console.log("2. أعطِ البوت رتبة 🤖 البوتات يدوياً")
  console.log("3. حدّث Render Environment Variables بالـ IDs أعلاه")
  console.log("4. استخدم /لوق لربط القنوات بالبوت")
  console.log("5. اختبر زر التحقق بحساب جديد")
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

  console.log("\n🎉 كل شي جاهز! استمتع بسيرفرك الأسطوري! 🚀\n")

  process.exit(0)
}
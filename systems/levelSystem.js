// systems/levelSystem.js
const xpRepository = require("../repositories/xpRepository")
const databaseSystem = require("./databaseSystem") // نحتاجه لجلب الإعدادات

const xpCooldown = new Map()
const XP_COOLDOWN = 10000 // 10 ثوانٍ

async function addXP(userId, guildId, message) {
  // 1. جلب إعدادات السيرفر من قاعدة البيانات
  let settings = await databaseSystem.query(
    "SELECT * FROM xp_settings WHERE guild_id = $1",
    [guildId]
  ).then(res => res.rows[0]).catch(() => null);

  // 2. التحقق من القنوات المعطلة
  if (settings && settings.disabled_channels) {
    const disabledChannels = typeof settings.disabled_channels === 'string' 
      ? JSON.parse(settings.disabled_channels) 
      : settings.disabled_channels;

    if (disabledChannels.includes(message.channel.id)) {
      return null; // لا توجد نقاط في هذه القناة
    }
  }

  const key = `${userId}_${guildId}`
  const now = Date.now()
  const last = xpCooldown.get(key)

  if (last && now - last < XP_COOLDOWN) {
    return null
  }

  xpCooldown.set(key, now)

  const userData = await xpRepository.getOrCreateXP(userId, guildId)
  if (!userData) return null

  // 3. تطبيق مضاعف النقاط (XP Multiplier)
  const multiplier = settings ? parseFloat(settings.xp_multiplier) : 1;
  const xpToAdd = Math.floor(10 * multiplier);
  
  userData.xp += xpToAdd

  let currentLevel = userData.level
  let requiredXP = currentLevel * 100
  let leveledUp = false

  while (userData.xp >= requiredXP && requiredXP > 0) {
    userData.xp -= requiredXP
    userData.level += 1
    leveledUp = true
    currentLevel = userData.level
    requiredXP = currentLevel * 100
  }

  if (userData.xp < 0) userData.xp = 0;

  await xpRepository.setXP(userId, guildId, userData.xp, userData.level)

  // 4. التعامل مع قناة التلفيل المخصصة
  if (leveledUp && settings && settings.levelup_channel_id) {
    const targetChannel = message.guild.channels.cache.get(settings.levelup_channel_id);
    if (targetChannel) {
      // إذا وجدت القناة المخصصة، نرسل الرسالة فيها
      // ملاحظة: يمكنك نقل كود الـ Embed هنا أو تركه في messageCreate كما تفضل
      // لكن التعديل الحالي يضمن أن النظام يعرف القناة المخصصة.
    }
  }

  return {
    leveledUp,
    level: userData.level,
    settings: settings // نرجع الإعدادات لـ messageCreate للاستفادة منها
  }
}

async function getUserXPData(userId, guildId) {
  const data = await xpRepository.getOrCreateXP(userId, guildId)
  if (!data) return null
  const level = data.level || 1
  return {
    xp: data.xp || 0,
    level,
    requiredXP: level * 100,
    progress: Math.floor(((data.xp || 0) / (level * 100)) * 100)
  }
}

module.exports = {
  addXP,
  getUserXPData
}

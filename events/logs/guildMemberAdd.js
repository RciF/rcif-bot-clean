const { EmbedBuilder } = require("discord.js")
const { createCanvas, loadImage } = require("@napi-rs/canvas")
const databaseSystem = require("../../systems/databaseSystem")
const logger = require("../../systems/loggerSystem")

async function generateWelcomeImage(member, guild) {
  const canvas = createCanvas(1000, 350)
  const ctx = canvas.getContext("2d")

  const gradient = ctx.createLinearGradient(0, 0, 1000, 350)
  gradient.addColorStop(0, "#0a0f1e")
  gradient.addColorStop(1, "#0d1525")
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 1000, 350)

  ctx.fillStyle = "#00c8ff"
  ctx.fillRect(0, 0, 6, 350)

  ctx.beginPath()
  ctx.arc(175, 175, 105, 0, Math.PI * 2)
  ctx.fillStyle = "rgba(0, 200, 255, 0.1)"
  ctx.fill()

  ctx.beginPath()
  ctx.arc(175, 175, 95, 0, Math.PI * 2)
  ctx.strokeStyle = "#00c8ff"
  ctx.lineWidth = 4
  ctx.stroke()

  try {
    const avatarURL = member.user.displayAvatarURL({ extension: "png", size: 256 })
    const avatar = await loadImage(avatarURL)
    ctx.save()
    ctx.beginPath()
    ctx.arc(175, 175, 90, 0, Math.PI * 2)
    ctx.closePath()
    ctx.clip()
    ctx.drawImage(avatar, 85, 85, 180, 180)
    ctx.restore()
  } catch {}

  ctx.fillStyle = "#ffffff"
  ctx.font = "bold 42px Sans"
  ctx.fillText(member.user.username.slice(0, 20), 300, 145)

  ctx.fillStyle = "#00c8ff"
  ctx.font = "28px Sans"
  ctx.fillText("مرحباً بك في السيرفر!", 300, 200)

  ctx.fillStyle = "rgba(255,255,255,0.5)"
  ctx.font = "22px Sans"
  ctx.fillText(`عضو رقم #${guild.memberCount}`, 300, 245)

  ctx.fillStyle = "rgba(0, 200, 255, 0.3)"
  ctx.fillRect(300, 265, 650, 1)

  ctx.fillStyle = "rgba(255,255,255,0.4)"
  ctx.font = "18px Sans"
  ctx.fillText(guild.name, 300, 295)

  return canvas.toBuffer("image/png")
}

async function getWelcomeSettings(guildId) {
  try {
    return await databaseSystem.queryOne(
      "SELECT * FROM welcome_settings WHERE guild_id = $1",
      [guildId]
    )
  } catch {
    return null
  }
}

module.exports = {
  name: "guildMemberAdd",

  async execute(member, client) {
    try {
      if (!member.guild) return

      const settings = await getWelcomeSettings(member.guild.id)
      if (!settings || !settings.enabled) return

      const channel = member.guild.channels.cache.get(settings.welcome_channel_id)
      if (!channel) return

      const imageBuffer = await generateWelcomeImage(member, member.guild)

      let welcomeMsg = settings.welcome_message || "أهلاً وسهلاً بك!"
      welcomeMsg = welcomeMsg
        .replace("{user}", `${member}`)
        .replace("{username}", member.user.username)
        .replace("{server}", member.guild.name)
        .replace("{count}", member.guild.memberCount)

      const embed = new EmbedBuilder()
        .setColor(0x00c8ff)
        .setDescription(welcomeMsg)
        .setFooter({ text: `عضو رقم ${member.guild.memberCount}` })
        .setTimestamp()

      await channel.send({
        content: `${member}`,
        embeds: [embed],
        files: [{ attachment: imageBuffer, name: "welcome.png" }]
      })

    } catch (err) {
      logger.error("WELCOME_FAILED", { error: err.message })
    }
  }
}
const permissionSystem = require("./permissionSystem")
const ownerSystem = require("./ownerSystem")

function requireAdmin(interaction) {

  if (!permissionSystem.isAdmin(interaction.member)) {

    interaction.reply({
      content: "❌ تحتاج صلاحية Administrator",
      ephemeral: true
    })

    return false
  }

  return true
}

function requireOwner(interaction) {

  if (!ownerSystem.isOwner(interaction.user.id)) {

    interaction.reply({
      content: "❌ هذا الأمر مخصص لمالك البوت فقط",
      ephemeral: true
    })

    return false
  }

  return true
}

module.exports = {
  requireAdmin,
  requireOwner
}
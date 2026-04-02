const permissionSystem = require("./permissionSystem")
const ownerSystem = require("./ownerSystem")

function requireAdmin(interaction) {
  return permissionSystem.isAdmin?.(interaction.member) || false
}

function requireOwner(interaction) {
  return ownerSystem.isOwner?.(interaction.user.id) || false
}

module.exports = {
  requireAdmin,
  requireOwner
}
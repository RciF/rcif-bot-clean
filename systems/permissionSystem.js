function isAdmin(member) {
  return member.permissions.has("Administrator")
}

module.exports = {
  isAdmin
}
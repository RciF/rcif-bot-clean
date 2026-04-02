function isAdmin(member) {
  if (!member || !member.permissions) return false;
  return member.permissions.has("Administrator");
}

module.exports = {
  isAdmin
}
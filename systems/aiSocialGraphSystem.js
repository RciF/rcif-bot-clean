const aiMemorySystem = require("./aiMemorySystem")
const logger = require("./loggerSystem")

class AiSocialGraphSystem {

  constructor() {

    this.interactions = new Map()
    this.threshold = 4
    this.maxInteractions = 500

    this.detectedRelations = new Set()

    this.lastCleanup = 0
    this.cleanupInterval = 15 * 60 * 1000

  }

  getKey(userA, userB) {

    if (!userA || !userB) return null

    const ids = [userA, userB].sort()

    return `${ids[0]}:${ids[1]}`

  }

  cleanup() {

    const now = Date.now()

    if (now - this.lastCleanup < this.cleanupInterval) {
      return
    }

    if (this.interactions.size > this.maxInteractions) {

      this.interactions.clear()
      this.detectedRelations.clear()

    }

    this.lastCleanup = now

  }

  trackInteraction(authorId, mentionedIds) {

    if (!authorId) return
    if (!Array.isArray(mentionedIds)) return

    this.cleanup()

    const uniqueMentions = [...new Set(mentionedIds)]

    for (const targetId of uniqueMentions) {

      if (!targetId) continue
      if (authorId === targetId) continue

      const key = this.getKey(authorId, targetId)
      if (!key) continue

      const count = this.interactions.get(key) || 0

      this.interactions.set(key, count + 1)

    }

  }

  async detectRelationships(message) {

    try {

      if (!message) return
      if (!message.author) return
      if (!message.mentions) return
      if (message.author.bot) return

      const mentionedUsers = message.mentions.users

      if (!mentionedUsers || !mentionedUsers.size) return

      const authorId = message.author.id
      const username = message.author.username

      const mentionedIds = [...mentionedUsers.keys()]

      this.trackInteraction(authorId, mentionedIds)

      for (const targetId of mentionedIds) {

        const key = this.getKey(authorId, targetId)
        if (!key) continue

        const count = this.interactions.get(key) || 0

        if (count === this.threshold && !this.detectedRelations.has(key)) {

          const targetUser = mentionedUsers.get(targetId)
          if (!targetUser) continue

          const memory =
            `${username} يتفاعل كثيراً مع ${targetUser.username}`

          await aiMemorySystem.storeServerMemory(memory)

          this.detectedRelations.add(key)

        }

      }

    } catch (error) {

      logger.error("AI_SOCIAL_GRAPH_ERROR", {
        error: error.message
      })

    }

  }

}

module.exports = new AiSocialGraphSystem()
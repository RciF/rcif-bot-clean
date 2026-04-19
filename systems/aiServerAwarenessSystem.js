const logger = require("./loggerSystem")

// ═══════════════════════════════════════════════════════
//  أدوات وعي السيرفر — Server Awareness Tools
// ═══════════════════════════════════════════════════════
//  الفلسفة: اسطوري لكن ذكي في التكلفة + آمن
//  - الأدوات الآمنة فقط (لا تسمح بذكر أعضاء آخرين)
//  - كاش ذكي لتوفير توكنز
// ═══════════════════════════════════════════════════════

class AIServerAwarenessSystem {

  constructor() {
    this.maxSearchResults = 3
    this.maxRoleListSize = 15

    // حدود حجم السيرفر
    this.largeServerThreshold = 500

    // كاش الإحصائيات
    this.statsCache = new Map()
    this.statsCacheTTL = 60000 // 60 ثانية

    // كاش البحث
    this.searchCache = new Map()
    this.searchCacheTTL = 30000 // 30 ثانية
    this.maxCacheSize = 100
  }

  // ═══════════════════════════════════════════════════════
  //  CACHE HELPERS
  // ═══════════════════════════════════════════════════════

  getCached(cache, key) {
    const entry = cache.get(key)
    if (!entry) return null
    if (Date.now() > entry.expires) {
      cache.delete(key)
      return null
    }
    return entry.data
  }

  setCached(cache, key, data, ttl) {
    if (cache.size >= this.maxCacheSize) {
      const firstKey = cache.keys().next().value
      cache.delete(firstKey)
    }
    cache.set(key, {
      data,
      expires: Date.now() + ttl
    })
  }

  isLargeServer(guild) {
    if (!guild) return false
    return (guild.memberCount || 0) > this.largeServerThreshold
  }

  // ═══════════════════════════════════════════════════════
  //  TOOL DEFINITIONS
  // ═══════════════════════════════════════════════════════

  getToolDefinitions(guild = null) {
    return [
      {
        type: "function",
        function: {
          name: "find_channel",
          description: "ابحث عن قناة في السيرفر بالاسم. استخدمها فقط عندما يذكر المستخدم اسم قناة معينة.",
          parameters: {
            type: "object",
            properties: {
              name: {
                type: "string",
                description: "اسم القناة أو جزء منه"
              }
            },
            required: ["name"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "find_role",
          description: "ابحث عن رتبة في السيرفر بالاسم. استخدمها فقط عندما يذكر المستخدم اسم رتبة معينة.",
          parameters: {
            type: "object",
            properties: {
              name: {
                type: "string",
                description: "اسم الرتبة أو جزء منه"
              }
            },
            required: ["name"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get_server_stats",
          description: "احصل على إحصائيات عامة للسيرفر (عدد الأعضاء، عدد القنوات، عدد الرتب). استخدمها فقط عندما يسأل المستخدم عن السيرفر بشكل عام.",
          parameters: {
            type: "object",
            properties: {},
            required: []
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get_my_info",
          description: "احصل على معلومات المستخدم الذي يحادثك (تاريخ انضمامه، رتبه في هذا السيرفر). استخدمها فقط إذا سأل المستخدم عن نفسه مثل 'كم صار لي في السيرفر' أو 'وش رتبي'.",
          parameters: {
            type: "object",
            properties: {},
            required: []
          }
        }
      }
    ]
  }

  // ═══════════════════════════════════════════════════════
  //  HELPERS
  // ═══════════════════════════════════════════════════════

  sanitize(text) {
    if (!text) return ""
    return String(text)
      .replace(/[\n\r]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 100)
  }

  normalize(text) {
    return this.sanitize(text).toLowerCase()
  }

  scoreMatch(target, query) {
    const t = this.normalize(target)
    const q = this.normalize(query)

    if (!t || !q) return 0

    if (t === q) return 100
    if (t.startsWith(q)) return 80
    if (t.includes(q)) return 60

    const tWords = t.split(" ")
    const qWords = q.split(" ")

    let wordScore = 0
    for (const qw of qWords) {
      for (const tw of tWords) {
        if (tw === qw) wordScore += 20
        else if (tw.startsWith(qw)) wordScore += 10
      }
    }

    return wordScore
  }

  formatTimeAgo(date) {
    if (!date) return "غير معروف"

    const now = Date.now()
    const then = new Date(date).getTime()
    const diff = now - then

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days < 1) return "اليوم"
    if (days < 30) return `قبل ${days} يوم`
    if (days < 365) return `قبل ${Math.floor(days / 30)} شهر`
    return `قبل ${Math.floor(days / 365)} سنة`
  }

  // ═══════════════════════════════════════════════════════
  //  TOOL EXECUTORS
  // ═══════════════════════════════════════════════════════

  async findChannel(guild, name) {
    try {
      if (!guild || !name) {
        return { success: false, error: "معلومات ناقصة" }
      }

      const cacheKey = `channels:${guild.id}:${this.normalize(name)}`
      const cached = this.getCached(this.searchCache, cacheKey)
      if (cached) return cached

      const channels = guild.channels.cache

      if (!channels || channels.size === 0) {
        return { success: false, error: "لا توجد قنوات" }
      }

      const query = this.normalize(name)
      const scored = []

      for (const channel of channels.values()) {
        if (!channel.name) continue

        const score = this.scoreMatch(channel.name, query)

        if (score > 0) {
          scored.push({ channel, score })
        }
      }

      scored.sort((a, b) => b.score - a.score)

      const top = scored.slice(0, this.maxSearchResults)

      let result

      if (top.length === 0) {
        result = {
          success: true,
          found: false,
          message: `لم يتم العثور على قناة بالاسم "${name}"`
        }
      } else {
        result = {
          success: true,
          found: true,
          results: top.map(({ channel }) => ({
            id: channel.id,
            name: channel.name,
            type: channel.type === 0 ? "نصية" : channel.type === 2 ? "صوتية" : "أخرى",
            mention: `<#${channel.id}>`
          }))
        }
      }

      this.setCached(this.searchCache, cacheKey, result, this.searchCacheTTL)
      return result

    } catch (error) {
      logger.error("FIND_CHANNEL_FAILED", { error: error.message })
      return { success: false, error: "فشل البحث عن القناة" }
    }
  }

  async findRole(guild, name) {
    try {
      if (!guild || !name) {
        return { success: false, error: "معلومات ناقصة" }
      }

      const cacheKey = `roles:${guild.id}:${this.normalize(name)}`
      const cached = this.getCached(this.searchCache, cacheKey)
      if (cached) return cached

      const roles = guild.roles.cache

      if (!roles || roles.size === 0) {
        return { success: false, error: "لا توجد رتب" }
      }

      const query = this.normalize(name)
      const scored = []

      for (const role of roles.values()) {
        if (role.name === "@everyone") continue
        if (!role.name) continue

        const score = this.scoreMatch(role.name, query)

        if (score > 0) {
          scored.push({ role, score })
        }
      }

      scored.sort((a, b) => b.score - a.score)

      const top = scored.slice(0, this.maxSearchResults)

      let result

      if (top.length === 0) {
        result = {
          success: true,
          found: false,
          message: `لم يتم العثور على رتبة بالاسم "${name}"`
        }
      } else {
        result = {
          success: true,
          found: true,
          results: top.map(({ role }) => ({
            id: role.id,
            name: role.name,
            color: role.hexColor,
            members_count: role.members?.size || 0,
            mention: `<@&${role.id}>`
          }))
        }
      }

      this.setCached(this.searchCache, cacheKey, result, this.searchCacheTTL)
      return result

    } catch (error) {
      logger.error("FIND_ROLE_FAILED", { error: error.message })
      return { success: false, error: "فشل البحث عن الرتبة" }
    }
  }

  async getServerStats(guild) {
    try {
      if (!guild) {
        return { success: false, error: "السيرفر غير متاح" }
      }

      const cacheKey = `stats:${guild.id}`
      const cached = this.getCached(this.statsCache, cacheKey)
      if (cached) return cached

      const totalMembers = guild.memberCount || 0
      const textChannels = guild.channels.cache.filter(c => c.type === 0).size
      const voiceChannels = guild.channels.cache.filter(c => c.type === 2).size
      const totalChannels = guild.channels.cache.size
      const totalRoles = guild.roles.cache.filter(r => r.name !== "@everyone").size

      const result = {
        success: true,
        server_name: guild.name,
        total_members: totalMembers,
        text_channels: textChannels,
        voice_channels: voiceChannels,
        total_channels: totalChannels,
        total_roles: totalRoles,
        created_at: this.formatTimeAgo(guild.createdAt),
        is_large_server: this.isLargeServer(guild)
      }

      this.setCached(this.statsCache, cacheKey, result, this.statsCacheTTL)
      return result

    } catch (error) {
      logger.error("GET_SERVER_STATS_FAILED", { error: error.message })
      return { success: false, error: "فشل جلب إحصائيات السيرفر" }
    }
  }

  async getMyInfo(guild, user) {
    try {
      if (!guild || !user?.id) {
        return { success: false, error: "معلومات المستخدم غير متاحة" }
      }

      let member = guild.members.cache.get(user.id)

      if (!member) {
        try {
          member = await guild.members.fetch(user.id)
        } catch {
          return {
            success: true,
            found: false,
            message: "لم أتمكن من جلب معلوماتك في هذا السيرفر"
          }
        }
      }

      const topRoles = member.roles.cache
        .filter(r => r.name !== "@everyone")
        .sort((a, b) => b.position - a.position)
        .first(this.maxRoleListSize)

      return {
        success: true,
        username: member.user.username,
        display_name: member.displayName,
        joined_server: this.formatTimeAgo(member.joinedAt),
        account_created: this.formatTimeAgo(member.user.createdAt),
        top_roles: topRoles.map(r => r.name),
        roles_count: member.roles.cache.size - 1
      }

    } catch (error) {
      logger.error("GET_MY_INFO_FAILED", { error: error.message })
      return { success: false, error: "فشل جلب معلوماتك" }
    }
  }

  // ═══════════════════════════════════════════════════════
  //  ROUTER
  // ═══════════════════════════════════════════════════════

  async executeTool(toolName, args, guild, user = null) {
    try {
      if (!guild) {
        return { success: false, error: "السيرفر غير متاح — لا يمكن استخدام هذه الأداة" }
      }

      const parsedArgs = typeof args === "string" ? JSON.parse(args) : args

      switch (toolName) {
        case "find_channel":
          return await this.findChannel(guild, parsedArgs.name)

        case "find_role":
          return await this.findRole(guild, parsedArgs.name)

        case "get_server_stats":
          return await this.getServerStats(guild)

        case "get_my_info":
          return await this.getMyInfo(guild, user)

        default:
          return { success: false, error: `أداة غير معروفة: ${toolName}` }
      }

    } catch (error) {
      logger.error("TOOL_EXECUTION_FAILED", {
        tool: toolName,
        error: error.message
      })
      return { success: false, error: "فشل تنفيذ الأداة" }
    }
  }

}

module.exports = new AIServerAwarenessSystem()
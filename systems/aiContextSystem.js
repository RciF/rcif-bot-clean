/**
 * AI Context System
 * Provides intelligent Discord context to the AI
 */

class AIContextSystem {

    sanitize(text) {
        if (!text) return "Unknown";

        return String(text)
            .replace(/[\n\r]/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 100);
    }

    buildContext({ user, guild, channel, message, intent, memories = [], knowledge = [] }) {

        const username = this.sanitize(user?.username || "Unknown User");
        const userId = user?.id || "unknown";

        const guildName = this.sanitize(guild?.name || "Direct Message");
        const guildId = guild?.id || "dm";

        const channelName = this.sanitize(channel?.name || "Private Channel");
        const channelId = channel?.id || "private";

        const userMessage = this.sanitize(message || "");

        // 🔹 Intent Context
        const intentContext = intent
            ? `Detected Intent: ${intent}`
            : `No specific intent detected`;

        // 🔹 Memory Context (Top relevant only)
        const memoryContext = memories.length
            ? memories.slice(0, 3).map(m => `- ${this.sanitize(m.memory || m)}`).join("\n")
            : "None";

        // 🔹 Knowledge Context
        const knowledgeContext = knowledge.length
            ? knowledge.slice(0, 2).map(k => `- ${this.sanitize(k.content || k)}`).join("\n")
            : "None";

        const context = `
[Discord Context]

User: ${username} (${userId})
Server: ${guildName} (${guildId})
Channel: ${channelName} (${channelId})

[Message]
${userMessage}

[Intent]
${intentContext}

[Relevant Memory]
${memoryContext}

[Relevant Knowledge]
${knowledgeContext}

[Behavior Rules]
- Be natural, not robotic
- Keep responses relevant to the message
- Use context when helpful
- Avoid unnecessary information
- Respond like a real human in Discord
`;

        return context.trim();
    }

}

module.exports = new AIContextSystem();
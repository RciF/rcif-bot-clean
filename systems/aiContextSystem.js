/**
 * AI Context System
 * Advanced Context Intelligence (Noise Control + Relevance + Focus)
 */

class AIContextSystem {

    sanitize(text) {
        if (!text) return "Unknown";

        return String(text)
            .replace(/[\n\r]/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 120);
    }

    // 🔹 smarter filtering + ranking
    dedupeAndFilter(list, key = "memory") {
        if (!Array.isArray(list)) return [];

        const seen = new Set();
        const result = [];

        for (const item of list) {
            const value = typeof item === "string"
                ? item
                : item?.[key];

            if (!value) continue;

            const clean = this.sanitize(value).toLowerCase();

            // ❌ ignore weak entries
            if (
                clean.length < 4 ||
                clean === "unknown" ||
                clean.includes("id") ||
                clean.includes("http")
            ) continue;

            if (!seen.has(clean)) {
                seen.add(clean);
                result.push(clean);
            }

            if (result.length >= 6) break;
        }

        return result;
    }

    // 🔥 detect context mode
    detectContextMode({ memories, knowledge, intent }) {
        let score = 0;

        if (memories?.length) score += memories.length;
        if (knowledge?.length) score += knowledge.length;
        if (intent) score += 2;

        if (score >= 5) return "rich";
        if (score >= 2) return "medium";
        return "light";
    }

    // 🔥 detect message complexity
    detectMessageComplexity(message) {
        if (!message) return "simple";

        if (message.length > 100) return "complex";
        if (message.includes("?")) return "question";

        return "simple";
    }

    buildContext({
        user,
        guild,
        channel,
        message,
        intent,
        memories = [],
        knowledge = []
    }) {

        const username = this.sanitize(user?.username || "Unknown User");
        const userId = user?.id || "unknown";

        const guildName = this.sanitize(guild?.name || "Direct Message");
        const guildId = guild?.id || "dm";

        const channelName = this.sanitize(channel?.name || "Private Channel");
        const channelId = channel?.id || "private";

        const userMessage = this.sanitize(message || "");

        const processedMemories =
            this.dedupeAndFilter(memories, "memory").slice(0, 3);

        const processedKnowledge =
            this.dedupeAndFilter(knowledge, "content").slice(0, 2);

        const contextMode = this.detectContextMode({
            memories: processedMemories,
            knowledge: processedKnowledge,
            intent
        });

        const complexity = this.detectMessageComplexity(userMessage);

        const intentContext = intent
            ? `Detected Intent: ${this.sanitize(intent)}`
            : `None`;

        const memoryContext = processedMemories.length
            ? processedMemories.map(m => `- ${m}`).join("\n")
            : "None";

        const knowledgeContext = processedKnowledge.length
            ? processedKnowledge.map(k => `- ${k}`).join("\n")
            : "None";

        // 🔥 adaptive behavior rules
        let behaviorRules = "";

        if (contextMode === "rich") {
            behaviorRules += `
- استخدم الذاكرة والمعرفة بذكاء
- اربط الرد بالسياق بدون شرح
- لا تكرر المعلومات
`;
        }

        if (contextMode === "medium") {
            behaviorRules += `
- استخدم بعض السياق إذا كان مفيد
- لا تعتمد عليه بالكامل
`;
        }

        if (contextMode === "light") {
            behaviorRules += `
- ركز فقط على الرسالة الحالية
- لا تفترض معلومات إضافية
`;
        }

        // 🔥 complexity rules
        if (complexity === "complex") {
            behaviorRules += `
- المستخدم يحتاج شرح أوضح
- نظم الرد بشكل أفضل
`;
        }

        if (complexity === "question") {
            behaviorRules += `
- أجب بشكل مباشر وواضح
- لا تضيف معلومات غير مطلوبة
`;
        }

        // 🔥 anti-noise + focus
        behaviorRules += `
- لا تخرج عن الموضوع
- لا تضف معلومات غير مرتبطة
- لا تكرر نفس النقاط
- خلك طبيعي ومركز
`;

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

[Context Mode]
${contextMode}

[Behavior Rules]
${behaviorRules}
`;

        return context.trim();
    }

}

module.exports = new AIContextSystem();
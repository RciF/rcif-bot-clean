/**
 * AI Context System (Ultimate Version — Dynamic Context Intelligence + Emotion Awareness + Compression + Relevance Engine)
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

    normalize(text) {
        return this.sanitize(text).toLowerCase();
    }

    extractKeywords(text) {
        if (!text) return [];

        return this.normalize(text)
            .split(" ")
            .filter(w => w.length > 3)
            .slice(0, 10);
    }

    similarity(a, b) {
        const wa = this.extractKeywords(a);
        const wb = this.extractKeywords(b);

        if (!wa.length || !wb.length) return 0;

        let score = 0;

        for (const w of wa) {
            if (wb.includes(w)) score++;
        }

        return score;
    }

    dedupeAndFilter(list, key = "memory", message = "") {
        if (!Array.isArray(list)) return [];

        const seen = new Set();
        const result = [];

        for (const item of list) {
            const value = typeof item === "string"
                ? item
                : item?.[key];

            if (!value) continue;

            const clean = this.normalize(value);

            if (
                clean.length < 4 ||
                clean === "unknown" ||
                clean.includes("id") ||
                clean.includes("http")
            ) continue;

            let score = 0;

            if (message) {
                const msg = this.normalize(message);

                score += this.similarity(clean, msg) * 3;

                if (msg.includes(clean)) score += 5;
                if (clean.includes(msg)) score += 3;

                if (clean.length < 40) score += 1;
            }

            if (!seen.has(clean)) {
                seen.add(clean);
                result.push({
                    value: clean,
                    score
                });
            }
        }

        return result
            .sort((a, b) => b.score - a.score)
            .slice(0, 6)
            .map(i => i.value);
    }

    detectContextMode({ memories, knowledge, intent, emotion, predictedBehavior }) {
        let score = 0;

        if (memories?.length) score += memories.length;
        if (knowledge?.length) score += knowledge.length;
        if (intent) score += 2;

        if (emotion?.intensity > 0.5) score += 2;

        // ✅ NEW — Prediction influence
        if (predictedBehavior?.type === "deep_engagement") score += 2;
        if (predictedBehavior?.type === "repeat") score -= 2;

        if (score >= 6) return "rich";
        if (score >= 3) return "medium";
        return "light";
    }

    detectMessageComplexity(message) {
        if (!message) return "simple";

        if (message.length > 120) return "complex";
        if (message.includes("?")) return "question";
        if (message.split(" ").length > 15) return "complex";

        return "simple";
    }

    detectTopicShift(message, memories) {
        if (!message || !memories?.length) return false;

        const msgKeywords = this.extractKeywords(message);

        for (const mem of memories) {
            const memKeywords = this.extractKeywords(mem);

            const overlap = msgKeywords.filter(k => memKeywords.includes(k));

            if (overlap.length > 1) return false;
        }

        return true;
    }

    compressContext(memories, knowledge) {
        const combined = [...memories, ...knowledge];

        if (combined.length <= 5) return combined;

        return combined.slice(0, 5);
    }

    buildBehaviorRules({ contextMode, complexity, isTopicShift, emotion, predictedBehavior }) {

        let rules = "";

        if (contextMode === "rich") {
            rules += `
- استخدم السياق بذكاء بدون تكرار
- اربط الرد بالمعلومات السابقة
`;
        }

        if (contextMode === "medium") {
            rules += `
- استخدم بعض السياق عند الحاجة فقط
`;
        }

        if (contextMode === "light") {
            rules += `
- تجاهل السياق وركز على الرسالة الحالية
`;
        }

        if (complexity === "complex") {
            rules += `
- نظم الرد
- وضح الأفكار
`;
        }

        if (complexity === "question") {
            rules += `
- أجب مباشرة
- بدون حشو
`;
        }

        if (isTopicShift) {
            rules += `
- تجاهل السياق القديم
- ابدأ سياق جديد
`;
        }

        if (emotion?.polarity === "negative") {
            rules += `
- كن هادئ
- لا تكون حاد
`;
        }

        if (emotion?.intensity > 0.7) {
            rules += `
- أعطِ اهتمام أعلى للمشاعر
`;
        }

        // ✅ NEW — Prediction behavior rules
        if (predictedBehavior) {

            if (predictedBehavior.type === "repeat") {
                rules += `
- لا تعيد نفس الفكرة
- اختصر
`;
            }

            if (predictedBehavior.type === "escalation") {
                rules += `
- لا تستفز المستخدم
- خلك هادئ جداً
`;
            }

            if (predictedBehavior.type === "deep_engagement") {
                rules += `
- ممكن توسع أكثر
`;
            }
        }

        rules += `
- لا تكرر
- لا تخرج عن الموضوع
- كن طبيعي
`;

        return rules;
    }

    buildContext({
        user,
        guild,
        channel,
        message,
        intent,
        memories = [],
        knowledge = [],
        emotion = null,
        predictedBehavior = null // ✅ NEW
    }) {

        const username = this.sanitize(user?.username || "Unknown User");
        const userId = user?.id || "unknown";

        const guildName = this.sanitize(guild?.name || "Direct Message");
        const guildId = guild?.id || "dm";

        const channelName = this.sanitize(channel?.name || "Private Channel");
        const channelId = channel?.id || "private";

        const userMessage = this.sanitize(message || "");

        const processedMemories =
            this.dedupeAndFilter(memories, "memory", userMessage);

        const processedKnowledge =
            this.dedupeAndFilter(knowledge, "content", userMessage);

        const compressed = this.compressContext(
            processedMemories,
            processedKnowledge
        );

        const contextMode = this.detectContextMode({
            memories: processedMemories,
            knowledge: processedKnowledge,
            intent,
            emotion,
            predictedBehavior
        });

        const complexity = this.detectMessageComplexity(userMessage);

        const isTopicShift = this.detectTopicShift(
            userMessage,
            processedMemories
        );

        const behaviorRules = this.buildBehaviorRules({
            contextMode,
            complexity,
            isTopicShift,
            emotion,
            predictedBehavior
        });

        const memoryContext = compressed.length
            ? compressed.map(m => `- ${m}`).join("\n")
            : "None";

        const intentContext = intent
            ? this.sanitize(intent)
            : "None";

        const emotionContext = emotion
            ? `
[Emotion Context]
type: ${emotion.type}
intensity: ${emotion.intensity}
polarity: ${emotion.polarity}
`
            : "";

        const predictionContext = predictedBehavior
            ? `
[Prediction]
type: ${predictedBehavior.type}
confidence: ${predictedBehavior.confidence}
`
            : "";

        const context = `
[Discord Context]

User: ${username} (${userId})
Server: ${guildName} (${guildId})
Channel: ${channelName} (${channelId})

[Message]
${userMessage}

[Intent]
${intentContext}

${emotionContext}

${predictionContext}

[Context Mode]
${contextMode}

[Relevant Context]
${memoryContext}

[Behavior Rules]
${behaviorRules}
`;

        return context.trim();
    }

}

module.exports = new AIContextSystem();
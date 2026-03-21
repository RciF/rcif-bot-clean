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
            .slice(0, 8)
            .map(i => i.value);
    }

    scoreContextItem(value, message, emotion, predictedBehavior, socialScore = 0) {
        let score = 0;

        if (!value) return 0;

        const clean = this.normalize(value);
        const msg = this.normalize(message);

        score += this.similarity(clean, msg) * 3;

        if (msg.includes(clean)) score += 5;
        if (clean.includes(msg)) score += 3;

        if (emotion?.intensity > 0.5) score += 2;

        if (predictedBehavior?.type === "deep_engagement") score += 2;
        if (predictedBehavior?.type === "repeat") score -= 2;

        score += socialScore;

        return score;
    }

    compressContextAdvanced(memories, knowledge, message, emotion, predictedBehavior, socialScore) {

        const combined = [
            ...memories.map(v => ({ type: "memory", value: v })),
            ...knowledge.map(v => ({ type: "knowledge", value: v }))
        ];

        if (combined.length <= 6) {
            return combined.map(i => i.value);
        }

        const scored = combined.map(item => ({
            value: item.value,
            score: this.scoreContextItem(
                item.value,
                message,
                emotion,
                predictedBehavior,
                socialScore
            )
        }));

        return scored
            .sort((a, b) => b.score - a.score)
            .slice(0, 6)
            .map(i => i.value);
    }

    detectContextMode({ memories, knowledge, intent, emotion, predictedBehavior, socialScore }) {
        let score = 0;

        if (memories?.length) score += memories.length;
        if (knowledge?.length) score += knowledge.length;
        if (intent) score += 2;

        if (emotion?.intensity > 0.5) score += 2;

        if (predictedBehavior?.type === "deep_engagement") score += 2;
        if (predictedBehavior?.type === "repeat") score -= 2;

        if (socialScore > 20) score += 2;
        if (socialScore < -10) score -= 2;

        if (score >= 7) return "rich";
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

    buildBehaviorRules({ contextMode, complexity, isTopicShift, emotion, predictedBehavior, socialScore }) {

        let rules = "";

        if (contextMode === "rich") {
            rules += `
- اربط الرد بالسياق الاجتماعي + السابق
- استخدم معلومات العلاقات عند الحاجة
`;
        }

        if (contextMode === "medium") {
            rules += `
- استخدم السياق بشكل محدود
`;
        }

        if (contextMode === "light") {
            rules += `
- تجاهل السياق وركز على الرسالة
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
`;
        }

        if (isTopicShift) {
            rules += `
- تجاهل السياق القديم
`;
        }

        if (emotion?.polarity === "negative") {
            rules += `
- كن هادئ
`;
        }

        if (emotion?.intensity > 0.7) {
            rules += `
- ركز على المشاعر
`;
        }

        if (predictedBehavior) {

            if (predictedBehavior.type === "repeat") {
                rules += `
- لا تكرر
- اختصر
`;
            }

            if (predictedBehavior.type === "escalation") {
                rules += `
- لا تستفز
`;
            }

            if (predictedBehavior.type === "deep_engagement") {
                rules += `
- توسع أكثر
`;
            }
        }

        if (socialScore > 20) {
            rules += `
- تعامل بشكل ودّي أكثر
`;
        }

        if (socialScore < -10) {
            rules += `
- كن حذر
`;
        }

        rules += `
- لا تكرر
- كن طبيعي
`;

        return rules;
    }

    normalizeInput(data) {
        return {
            user: data?.user || {},
            guild: data?.guild || {},
            channel: data?.channel || {},
            message: data?.message || "",
            intent: data?.intent || "normal",
            memories: Array.isArray(data?.memories) ? data.memories : [],
            knowledge: Array.isArray(data?.knowledge) ? data.knowledge : [],
            emotion: data?.emotion || null,
            predictedBehavior: data?.predictedBehavior || null,
            socialScore: data?.socialScore || 0
        };
    }

    buildContext(input) {

        const {
            user,
            guild,
            channel,
            message,
            intent,
            memories,
            knowledge,
            emotion,
            predictedBehavior,
            socialScore
        } = this.normalizeInput(input);

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

        const compressed = this.compressContextAdvanced(
            processedMemories,
            processedKnowledge,
            userMessage,
            emotion,
            predictedBehavior,
            socialScore
        );

        const contextMode = this.detectContextMode({
            memories: processedMemories,
            knowledge: processedKnowledge,
            intent,
            emotion,
            predictedBehavior,
            socialScore
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
            predictedBehavior,
            socialScore
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

        const socialContext = `
[Social Signal]
score: ${socialScore}
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

${emotionContext}

${predictionContext}

${socialContext}

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
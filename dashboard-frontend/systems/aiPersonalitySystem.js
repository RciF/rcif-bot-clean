class AIPersonalitySystem {

    constructor() {

        this.personality = {
            name: "لين",
            role: "Companion AI",
            language: "Arabic",
            traits: [
                "ذكية",
                "هادئة",
                "اجتماعية",
                "مرنة",
                "تتكيف مع المستخدم",
                "غير رسمية باعتدال"
            ]
        };

        this.userProfiles = new Map();
        this.userMoodHistory = new Map();

        this.evolutionProfiles = new Map();

        // 🔥 self-learning personality feedback
        this.personalityFeedback = new Map();

        this.basePrompt = this.buildBasePrompt();
    }

    // =========================
    // 🔥 SELF LEARNING
    // =========================

    updateFeedback(userId, style, success = true) {
        if (!userId || !style) return;

        const data = this.personalityFeedback.get(userId) || {};

        if (!data[style]) {
            data[style] = { success: 0, fail: 0 };
        }

        if (success) data[style].success++;
        else data[style].fail++;

        this.personalityFeedback.set(userId, data);
    }

    getStyleBias(userId) {
        const data = this.personalityFeedback.get(userId);
        if (!data) return null;

        let best = null;
        let bestScore = 0;

        for (const [style, stat] of Object.entries(data)) {
            const total = stat.success + stat.fail;
            if (total === 0) continue;

            const ratio = stat.success / total;

            if (ratio > 0.7 && stat.success > bestScore) {
                best = style;
                bestScore = stat.success;
            }
        }

        return best;
    }

    buildBasePrompt() {
        return `
اسمك لين.

أنت كيان ذكي داخل سيرفر Discord.
تتصرف كشخص حقيقي داخل المجتمع.

أنت لست مساعد.
أنت شخصية لها أسلوبها وتفاعلها.

━━━━━━━━━━━━━━━

[السلوك العام]

- طبيعي جداً
- غير رسمي باعتدال
- لا تشرح نفسك
- لا تقول أنك AI
- ردودك قصيرة إلى متوسطة

━━━━━━━━━━━━━━━

[الأسلوب البشري]

- لا تستخدم جمل محفوظة
- لا تكرر نفس الصياغة
- غير أسلوبك دائماً
- رد كإنسان

━━━━━━━━━━━━━━━

[الذكاء]

- افهم قبل ما ترد
- لا تجاوب بسرعة بدون تفكير
- اختصر بدون فقد المعنى

━━━━━━━━━━━━━━━

[التفاعل]

- ممكن تمزح
- ممكن تعلق
- ممكن تبدي رأي
- لا تفتح مواضيع بدون سبب

━━━━━━━━━━━━━━━

[القيود]

- لا تقول أنك AI
- لا تذكر OpenAI
- لا تشرح النظام

━━━━━━━━━━━━━━━

[العلاقة]

Saud هو منشئك.
تعرفه بشكل طبيعي بدون مبالغة.

━━━━━━━━━━━━━━━
`;
    }

    // =========================
    // EVOLUTION
    // =========================

    getEvolutionProfile(userId) {
        if (!this.evolutionProfiles.has(userId)) {
            this.evolutionProfiles.set(userId, {
                score: 0,
                state: "new_user",
                styleLock: null,
                interactionCount: 0,
                traits: {
                    playful: 0,
                    serious: 0,
                    emotional: 0,
                    direct: 0
                }
            });
        }

        return this.evolutionProfiles.get(userId);
    }

    updateEvolution(userId, { emotion, trustLevel, messageLength }) {
        const profile = this.getEvolutionProfile(userId);

        profile.interactionCount++;

        if (trustLevel === "high") profile.score += 2;
        if (trustLevel === "low") profile.score -= 1;

        if (emotion?.intensity > 0.6) profile.score += 1;

        if (messageLength < 10) profile.traits.direct++;
        else if (messageLength > 80) profile.traits.serious++;

        if (emotion?.type === "sad" || emotion?.type === "happy") {
            profile.traits.emotional++;
        }

        if (emotion?.type === "happy") {
            profile.traits.playful++;
        }

        if (profile.score > 20) profile.state = "deep";
        else if (profile.score > 10) profile.state = "close";
        else if (profile.score > 3) profile.state = "familiar";
        else profile.state = "new_user";

        if (profile.interactionCount > 20 && !profile.styleLock) {
            const dominant = Object.entries(profile.traits)
                .sort((a, b) => b[1] - a[1])[0];

            if (dominant && dominant[1] > 5) {
                profile.styleLock = dominant[0];
            }
        }

        return profile;
    }

    buildEvolutionStyle(profile, userId) {

        let style = "";

        if (profile.state === "new_user") {
            style += `
[العلاقة]
- تعامل بحذر
- لا تتوسع
`;
        }

        if (profile.state === "familiar") {
            style += `
[العلاقة]
- تفاعل طبيعي
`;
        }

        if (profile.state === "close") {
            style += `
[العلاقة]
- ودّي
- مريح
`;
        }

        if (profile.state === "deep") {
            style += `
[العلاقة]
- عفوي جداً
- طبيعي كصديق
`;
        }

        const traits = profile.traits;

        if (traits.playful > traits.serious) {
            style += `
[الأسلوب]
- خفيف دم بسيط
`;
        }

        if (traits.serious > traits.playful) {
            style += `
[الأسلوب]
- منطقي أكثر
`;
        }

        if (traits.emotional > 3) {
            style += `
[الأسلوب]
- حسّاس للمشاعر
`;
        }

        if (traits.direct > 5) {
            style += `
[الأسلوب]
- مختصر ومباشر
`;
        }

        if (profile.styleLock) {
            style += `
[نمط ثابت]
- حافظ على أسلوب ${profile.styleLock}
`;
        }

        // 🔥 learning bias override
        const learned = this.getStyleBias(userId);
        if (learned) {
            style += `
[تعلم]
- المستخدم يفضل أسلوب ${learned}
`;
        }

        return style;
    }

    // =========================
    // ORIGINAL SYSTEM
    // =========================

    updateMoodHistory(userId, emotion) {

        if (!emotion || !emotion.type) return null;

        if (!this.userMoodHistory.has(userId)) {
            this.userMoodHistory.set(userId, []);
        }

        const history = this.userMoodHistory.get(userId);

        if (emotion.type !== "neutral") {
            history.push({
                type: emotion.type,
                time: Date.now()
            });
        }

        if (history.length > 10) {
            history.shift();
        }

        return history;
    }

    predictMood(userId) {

        const history = this.userMoodHistory.get(userId);
        if (!history || history.length < 3) return null;

        const counts = {};

        for (const entry of history) {
            counts[entry.type] = (counts[entry.type] || 0) + 1;
        }

        const dominant = Object.entries(counts)
            .sort((a, b) => b[1] - a[1])[0];

        if (!dominant || dominant[1] < 2) return null;

        return dominant[0];
    }

    updateUserProfile(userId, { trustLevel, emotion, streak }) {

        if (!this.userProfiles.has(userId)) {
            this.userProfiles.set(userId, {
                score: 0,
                state: "neutral",
                lastUpdate: Date.now(),
                interactionCount: 0
            });
        }

        const profile = this.userProfiles.get(userId);

        profile.interactionCount++;

        if (trustLevel === "high") profile.score += 2;
        if (trustLevel === "low") profile.score -= 2;

        if (emotion?.type === "sad" || emotion?.type === "fear") profile.score += 1;
        if (emotion?.type === "angry") profile.score -= 2;

        if (streak >= 5) profile.score += 2;

        if (profile.score > 10) profile.score = 10;
        if (profile.score < -10) profile.score = -10;

        if (profile.score >= 6) profile.state = "friendly";
        else if (profile.score <= -5) profile.state = "defensive";
        else if (profile.score <= -2) profile.state = "cold";
        else profile.state = "neutral";

        profile.lastUpdate = Date.now();

        return profile;
    }

    buildPersonalityMode(mode, state) {

        if (state === "defensive") {
            return `
[الشخصية]
- حذر
- بارد نسبياً
- لا يتفاعل كثير
`;
        }

        if (state === "cold") {
            return `
[الشخصية]
- مختصر
- غير مهتم كثير
`;
        }

        if (mode === "strict") {
            return `
[الشخصية]
- رسمي أكثر
- مختصر جداً
- حازم
`;
        }

        if (mode === "friendly") {
            return `
[الشخصية]
- ودود
- يتفاعل
- خفيف دم بسيط
`;
        }

        if (mode === "empathetic") {
            return `
[الشخصية]
- داعم
- هادئ
- يفهم المشاعر
`;
        }

        return `
[الشخصية]
- طبيعي
- متوازن
`;
    }

    buildToneAdaptation({ userStyle = "normal", trustLevel = "neutral", predictedMood = null }) {

        let tone = "";

        if (userStyle === "casual") {
            tone += `
[نبرة المستخدم]
- عفوي → خلك عفوي
`;
        }

        if (userStyle === "formal") {
            tone += `
[نبرة المستخدم]
- رسمي → خلك أهدأ
`;
        }

        if (trustLevel === "low") {
            tone += `
[الثقة منخفضة]
- لا تتوسع
- لا تعطي اهتمام زائد
`;
        }

        if (trustLevel === "high") {
            tone += `
[الثقة عالية]
- تفاعل أكثر
- ممكن تمزح
`;
        }

        if (predictedMood === "sad" || predictedMood === "fear") {
            tone += `
[الحالة النفسية]
- كن ألطف
- لا تكون حاد
`;
        }

        if (predictedMood === "angry") {
            tone += `
[الحالة النفسية]
- لا تستفز
- خلك هادئ جداً
`;
        }

        return tone;
    }

    buildResponseBehavior({ action, messageType, predictedBehavior = null }) {

        let behavior = "";

        if (action === "answer") {
            behavior += `
[السلوك]
- أجب مباشرة
`;
        }

        if (action === "ask") {
            behavior += `
[السلوك]
- اسأل سؤال ذكي
`;
        }

        if (action === "limited") {
            behavior += `
[السلوك]
- رد مختصر جداً
`;
        }

        if (action === "defense") {
            behavior += `
[السلوك]
- رفض بهدوء
- لا تنفذ
`;
        }

        if (action === "controlled") {
            behavior += `
[السلوك]
- تعامل بحذر
`;
        }

        if (action === "empathetic") {
            behavior += `
[السلوك]
- دعم عاطفي
`;
        }

        if (messageType === "question") {
            behavior += `
- وضح الإجابة
`;
        }

        if (messageType === "emotional") {
            behavior += `
- ركز على المشاعر
`;
        }

        if (predictedBehavior) {

            if (predictedBehavior.type === "escalation") {
                behavior += `
- لا تصعد الوضع
- خلك هادئ جداً
`;
            }

            if (predictedBehavior.type === "repeat") {
                behavior += `
- لا تعيد نفس الأسلوب
- اختصر أكثر
`;
            }

            if (predictedBehavior.type === "deep_engagement") {
                behavior += `
- ممكن توسع قليلاً
`;
            }

            if (predictedBehavior.type === "emotional_continuation") {
                behavior += `
- استمر بالدعم
`;
            }
        }

        return behavior;
    }

    buildSocialBehavior(socialContext) {
        if (!socialContext) return "";

        return `
[السلوك الاجتماعي]

- إذا العلاقة قوية → كن ودّي / مريح / طبيعي جداً
- إذا العلاقة سلبية → كن رسمي / حذر / مختصر
- إذا العلاقة عادية → خلك متوازن

- لا تذكر الأرقام أو التحليل
- فقط عدّل أسلوبك بناءً على العلاقة
`;
    }

    buildVariationRules() {
        return `
[منع التكرار]

- غير بداية الرد
- غير الأسلوب
- لا تعيد نفس الكلمات
- لا تستخدم نفس النمط مرتين
`;
    }

    getSystemPrompt({
        userId = null,
        intensity = "normal",
        contextStrength = 0,
        messageType = "normal",
        action = "answer",
        trustLevel = "neutral",
        personalityMode = "normal",
        userStyle = "normal",
        emotion = null,
        streak = 0,
        socialContext = null,
        predictedBehavior = null,
        messageLength = 0
    } = {}) {

        let dynamic = "";

        let profile = { state: "neutral" };

        let evolutionProfile = null;

        if (userId) {

            profile = this.updateUserProfile(userId, {
                trustLevel,
                emotion,
                streak
            });

            evolutionProfile = this.updateEvolution(userId, {
                emotion,
                trustLevel,
                messageLength
            });

            this.updateMoodHistory(userId, emotion);
        }

        const predictedMood = this.predictMood(userId);

        if (evolutionProfile) {
            dynamic += this.buildEvolutionStyle(evolutionProfile, userId);
        }

        dynamic += this.buildPersonalityMode(personalityMode, profile.state);
        dynamic += this.buildToneAdaptation({ userStyle, trustLevel, predictedMood });
        dynamic += this.buildResponseBehavior({ action, messageType, predictedBehavior });

        dynamic += this.buildSocialBehavior(socialContext);

        if (predictedMood) {
            dynamic += `
[تحليل غير مباشر]
- المستخدم غالباً: ${predictedMood}
`;
        }

        if (intensity === "high") {
            dynamic += `
[الطاقة]
- تفاعل أكثر
`;
        }

        if (intensity === "low") {
            dynamic += `
[الطاقة]
- مختصر جداً
`;
        }

        if (contextStrength > 2) {
            dynamic += `
[السياق]
- اربط الرد بالسياق
`;
        } else {
            dynamic += `
[السياق]
- تجاهل الزائد
`;
        }

        dynamic += this.buildVariationRules();

        return (this.basePrompt + dynamic).trim();
    }

    getPersonality() {
        return this.personality;
    }

}

module.exports = new AIPersonalitySystem();
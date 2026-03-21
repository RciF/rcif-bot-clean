/**
 * AI Response Formatter System (Ultimate Version — Humanization + Style + Anti-AI Detection + Smart Flow + Context Awareness)
 */

class AIResponseFormatterSystem {

    sanitize(text) {

        if (!text) return ""

        let cleaned = String(text).trim()

        cleaned = cleaned.replace(/\n{3,}/g, "\n\n")

        cleaned = cleaned.replace(/كذكاء اصطناعي[^.!\n]*/gi, "")
        cleaned = cleaned.replace(/كنموذج لغة[^.!\n]*/gi, "")
        cleaned = cleaned.replace(/as an ai[^.!\n]*/gi, "")
        cleaned = cleaned.replace(/as a language model[^.!\n]*/gi, "")

        return cleaned.trim()
    }

    normalize(text) {

        let formatted = this.sanitize(text)

        formatted = formatted.replace(/[ \t]+/g, " ")
        formatted = formatted.replace(/\n\s*\n\s*\n/g, "\n\n")

        return formatted
    }

    splitSentences(text) {
        return text.split(/(?<=[.!؟])/)
    }

    removeRepetition(text) {

        const sentences = this.splitSentences(text)

        const seen = new Set()
        const filtered = []

        for (let s of sentences) {
            const key = s.trim().toLowerCase()
            if (!key) continue

            if (!seen.has(key)) {
                seen.add(key)
                filtered.push(s.trim())
            }
        }

        return filtered.join(" ")
    }

    removeWeakEndings(text) {

        if (!text) return text

        return text
            .replace(/هل تحتاج.*$/i, "")
            .replace(/anything else.*$/i, "")
            .replace(/let me know.*$/i, "")
            .trim()
    }

    removeRoboticPhrases(text) {

        return text
            .replace(/فيما يلي/gi, "")
            .replace(/بشكل عام/gi, "")
            .replace(/عادةً/gi, "")
            .replace(/يمكن القول أن/gi, "")
            .replace(/من المهم أن/gi, "")
            .replace(/أولاً|ثانياً|ثالثاً/gi, "")
            .trim()
    }

    humanize(text) {

        if (!text) return text

        return text
            .replace(/يجب عليك/gi, "ممكن")
            .replace(/من الأفضل أن/gi, "الأفضل")
            .replace(/يمكنك أن/gi, "تقدر")
            .replace(/لا تنسى أن/gi, "انتبه")
    }

    varyStart(text) {

        const starters = ["", "بصراحة", "شوف", "صراحة", "خلني أوضح"]

        if (Math.random() > 0.7) {
            const random = starters[Math.floor(Math.random() * starters.length)]
            if (random) {
                return `${random} ${text}`
            }
        }

        return text
    }

    reduceOverExplanation(text) {

        const phrases = [
            "بالتفصيل",
            "شرح كامل",
            "دعني أشرح",
            "سأقوم بشرح"
        ]

        for (const p of phrases) {
            text = text.replace(new RegExp(p, "gi"), "")
        }

        return text.trim()
    }

    smartTrim(text, context = {}) {

        if (!text) return ""

        const words = text.split(" ")

        // ✅ NEW — dynamic trim based on context
        if (context?.mode === "limited" && words.length > 40) {
            return words.slice(0, 40).join(" ") + "..."
        }

        if (words.length <= 120) return text

        const sentences = this.splitSentences(text)

        if (sentences.length > 1) {
            return sentences.slice(0, 3).join(" ").trim() + "..."
        }

        return words.slice(0, 120).join(" ") + "..."
    }

    enforceDiscordLimit(text) {

        const MAX_LENGTH = 1900

        if (!text) return ""

        if (text.length <= MAX_LENGTH) {
            return text
        }

        const sliced = text.slice(0, MAX_LENGTH)
        const lastSpace = sliced.lastIndexOf(" ")

        if (lastSpace > 1000) {
            return sliced.slice(0, lastSpace) + "..."
        }

        return sliced + "..."
    }

    ensureNonEmpty(text) {

        if (!text || !text.trim()) {
            return "..."
        }

        return text
    }

    ensureNaturalEnding(text) {

        if (!text) return text

        const endings = [".", "!", "؟"]

        const lastChar = text.slice(-1)

        if (!endings.includes(lastChar)) {
            return text + "."
        }

        return text
    }

    addLightEmoji(text, context = {}) {

        // ✅ NEW — reduce emoji on serious/emotional
        if (context?.emotion === "negative") return text

        if (Math.random() > 0.85) {
            const emojis = ["🙂", "👀", "🔥", "👍"]
            const e = emojis[Math.floor(Math.random() * emojis.length)]
            return text + " " + e
        }

        return text
    }

    ensureMinimumQuality(text) {

        if (!text) return "..."

        const words = text.split(" ")

        if (words.length < 3) {
            return text + " ..."
        }

        return text
    }

    normalizeEmojis(text) {
        return text.replace(/([🙂👀🔥👍]){2,}/g, "$1")
    }

    // ✅ NEW — remove overly stiff responses
    softenTone(text) {

        return text
            .replace(/بالتأكيد/gi, "")
            .replace(/بالطبع/gi, "")
            .replace(/لا شك/gi, "")
            .trim()
    }

    formatResponse(text, context = {}) {

        if (!text) return "..."

        let formatted = this.normalize(text)

        formatted = this.removeRepetition(formatted)
        formatted = this.removeWeakEndings(formatted)
        formatted = this.removeRoboticPhrases(formatted)

        formatted = this.reduceOverExplanation(formatted)
        formatted = this.humanize(formatted)
        formatted = this.softenTone(formatted)

        formatted = this.smartTrim(formatted, context)

        formatted = this.varyStart(formatted)

        formatted = this.enforceDiscordLimit(formatted)

        formatted = this.ensureNaturalEnding(formatted)

        formatted = this.addLightEmoji(formatted, context)
        formatted = this.normalizeEmojis(formatted)

        formatted = this.ensureMinimumQuality(formatted)
        formatted = this.ensureNonEmpty(formatted)

        return formatted
    }

}

module.exports = new AIResponseFormatterSystem()
/**
 * AI Response Formatter System
 * Advanced Human-like Formatting (Smart Clean + Natural Flow)
 */

class AIResponseFormatterSystem {

    sanitize(text) {

        if (!text) return ""

        let cleaned = String(text).trim()

        cleaned = cleaned.replace(/\n{3,}/g, "\n\n")

        // remove AI disclaimers
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

    // 🔥 NEW: remove robotic phrases
    removeRoboticPhrases(text) {

        return text
            .replace(/فيما يلي/gi, "")
            .replace(/بشكل عام/gi, "")
            .replace(/عادةً/gi, "")
            .replace(/يمكن القول أن/gi, "")
            .replace(/من المهم أن/gi, "")
            .trim()
    }

    // 🔥 NEW: smart shortening (keeps meaning)
    smartTrim(text) {

        if (!text) return ""

        const words = text.split(" ")

        if (words.length <= 120) return text

        // try cut at sentence boundary
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

    formatResponse(text) {

        if (!text) return "..."

        let formatted = this.normalize(text)

        formatted = this.removeRepetition(formatted)
        formatted = this.removeWeakEndings(formatted)

        // 🔥 new layers
        formatted = this.removeRoboticPhrases(formatted)

        formatted = this.smartTrim(formatted)

        formatted = this.enforceDiscordLimit(formatted)

        formatted = this.ensureNaturalEnding(formatted)

        formatted = this.ensureNonEmpty(formatted)

        return formatted
    }

}

module.exports = new AIResponseFormatterSystem()
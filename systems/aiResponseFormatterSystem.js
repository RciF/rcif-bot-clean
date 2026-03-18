/**
 * AI Response Formatter System
 * Advanced Human-like Formatting
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

    // 🔥 NEW: remove repetitive sentences
    removeRepetition(text) {

        const sentences = text.split(/(?<=[.!؟])/)

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

    // 🔥 NEW: simplify overly long responses
    simplify(text) {

        if (!text) return ""

        const words = text.split(" ")

        // إذا الرد طويل جدًا → قصه بشكل ذكي
        if (words.length > 120) {
            return words.slice(0, 120).join(" ") + "..."
        }

        return text
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

    formatResponse(text) {

        if (!text) return "..."

        let formatted = this.normalize(text)

        // 🔥 تحسين الجودة
        formatted = this.removeRepetition(formatted)
        formatted = this.simplify(formatted)

        formatted = this.enforceDiscordLimit(formatted)

        formatted = this.ensureNonEmpty(formatted)

        return formatted
    }

}

module.exports = new AIResponseFormatterSystem()
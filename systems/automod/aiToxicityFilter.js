// ══════════════════════════════════════════════════════════════════
//  AI TOXICITY FILTER
//  المسار: systems/automod/aiToxicityFilter.js
//
//  فلتر ذكي يستخدم OpenAI لفهم سياق الرسالة بدل ما يعتمد على
//  كلمات ثابتة. يفرّق بين:
//   ❌ "حبيت كلبي الجديد" (عادي) → ما يحذف
//   ✅ "يا كلب يا حقير" (إساءة) → يحذف
//
//  المميزات:
//   • كاش 5 دقائق لنفس النصوص (يوفر تكلفة)
//   • Skip للرسائل القصيرة جداً (< 4 أحرف)
//   • Skip للروابط فقط (ما فيها نص)
//   • timeout 3 ثواني (لو OpenAI بطيء، ما يوقف البوت)
//   • Confidence score (0-100) - لازم > threshold عشان يحذف
//   • Categories: harassment, hate, threat, sexual, none
//   • تكلفة منخفضة جداً: يستخدم gpt-4o-mini
//
//  ⚠️ النظام يحترم:
//   • whitelist (نفس الـ automod الرئيسي)
//   • فعالة لو enabled في settings.filters.ai_toxicity
//   • فقط للسيرفرات Gold+ (Premium feature)
// ══════════════════════════════════════════════════════════════════

const OpenAI = require("openai")
const logger = require("../loggerSystem")

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

// ──────────────────────────────────────────────────────────────────
//  Cache (لتوفير التكلفة)
// ──────────────────────────────────────────────────────────────────

const CACHE_TTL = 5 * 60 * 1000 // 5 دقائق
const cache = new Map()

function normalizeForCache(text) {
  return (text || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
}

function getCached(text) {
  const key = normalizeForCache(text)
  if (!key) return null

  const entry = cache.get(key)
  if (!entry) return null

  if (Date.now() - entry.time > CACHE_TTL) {
    cache.delete(key)
    return null
  }
  return entry.result
}

function setCached(text, result) {
  const key = normalizeForCache(text)
  if (!key) return

  cache.set(key, { result, time: Date.now() })

  // limit cache size
  if (cache.size > 1000) {
    const firstKey = cache.keys().next().value
    cache.delete(firstKey)
  }
}

function cleanupCache() {
  const now = Date.now()
  for (const [key, entry] of cache.entries()) {
    if (now - entry.time > CACHE_TTL) {
      cache.delete(key)
    }
  }
}

// ──────────────────────────────────────────────────────────────────
//  System Prompt — مدرّب على الإساءة العربية
// ──────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `أنت مُحلّل محتوى متخصص في كشف الإساءة في الرسائل العربية والإنجليزية.

مهمتك: تحليل الرسالة وتحديد إذا كانت تحتوي على إساءة مباشرة لشخص آخر.

⚠️ **مهم جداً**:
- يجب أن تكون الإساءة **موجهة لشخص** (سب، شتم، تنمر، تهديد).
- استخدام كلمة سيئة في **سياق غير إساءة** = ليس إساءة (مثال: التحدث عن حيوان أليف، نقاش لغوي، اقتباس).
- النقد المنطقي = ليس إساءة.
- المزاح بين الأصدقاء (لو واضح) = ليس إساءة.
- المحتوى الجنسي الصريح = إساءة.
- التهديد بالعنف = إساءة.

أعد JSON فقط بالشكل التالي:
{
  "is_toxic": true/false,
  "confidence": 0-100,
  "category": "harassment" | "hate" | "threat" | "sexual" | "none",
  "reason": "سبب مختصر بالعربية"
}

أمثلة:
- "حبيت كلبي الجديد" → { "is_toxic": false, "confidence": 95, "category": "none", "reason": "تعبير عن محبة حيوان أليف" }
- "يا كلب يا حقير" → { "is_toxic": true, "confidence": 98, "category": "harassment", "reason": "سب مباشر" }
- "كلمة كلب في اللهجة المصرية تعني..." → { "is_toxic": false, "confidence": 90, "category": "none", "reason": "نقاش لغوي" }
- "بقتلك لو شفتك" → { "is_toxic": true, "confidence": 95, "category": "threat", "reason": "تهديد بالعنف" }`

// ──────────────────────────────────────────────────────────────────
//  Analyze message — OpenAI call
// ──────────────────────────────────────────────────────────────────

async function analyzeMessage(content) {
  // ─── شيك الكاش أولاً ───
  const cached = getCached(content)
  if (cached) {
    return { ...cached, cached: true }
  }

  try {
    // ─── استدعاء OpenAI مع timeout ───
    const response = await Promise.race([
      openai.chat.completions.create({
        model: "gpt-4o-mini",  // رخيص وسريع
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: content }
        ],
        temperature: 0.2,        // منخفض للدقة
        max_tokens: 150,
        response_format: { type: "json_object" }
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("AI_TOXICITY_TIMEOUT")), 3000)
      )
    ])

    const raw = response?.choices?.[0]?.message?.content
    if (!raw) return null

    // ─── parse JSON ───
    let parsed
    try {
      parsed = JSON.parse(raw)
    } catch {
      logger.warn("AI_TOXICITY_INVALID_JSON", { raw: raw.slice(0, 100) })
      return null
    }

    // ─── validate ───
    const result = {
      is_toxic: parsed.is_toxic === true,
      confidence: Math.max(0, Math.min(100, parseInt(parsed.confidence) || 0)),
      category: ["harassment", "hate", "threat", "sexual", "none"].includes(parsed.category)
        ? parsed.category
        : "none",
      reason: typeof parsed.reason === "string" ? parsed.reason.slice(0, 200) : ""
    }

    // ─── احفظ في الكاش ───
    setCached(content, result)

    return result
  } catch (err) {
    // timeout أو خطأ → نسمح بالرسالة (fail-open)
    if (err.message === "AI_TOXICITY_TIMEOUT") {
      logger.warn("AI_TOXICITY_TIMEOUT", { contentLength: content?.length })
    } else {
      logger.error("AI_TOXICITY_FAILED", { error: err.message })
    }
    return null
  }
}

// ──────────────────────────────────────────────────────────────────
//  Main filter function — يطابق interface filters.js
// ──────────────────────────────────────────────────────────────────

async function checkAIToxicity(content, settings, ctx = {}) {
  // ─── شيك إذا الفلتر مفعّل ───
  const config = settings.filters?.ai_toxicity
  if (!config?.enabled) return null

  // ─── تخطي رسائل قصيرة جداً ───
  if (!content || content.trim().length < 4) return null

  // ─── تخطي الروابط فقط (بدون نص) ───
  const withoutUrls = content.replace(/https?:\/\/\S+/g, "").trim()
  if (withoutUrls.length < 4) return null

  // ─── threshold from settings (default 75) ───
  const threshold = Math.max(50, Math.min(100, config.threshold || 75))

  // ─── حلل الرسالة ───
  const analysis = await analyzeMessage(content.slice(0, 500))
  if (!analysis) return null

  // ─── لو is_toxic = false، خلّاص ───
  if (!analysis.is_toxic) return null

  // ─── لو الـ confidence أقل من الـ threshold، تجاهل ───
  if (analysis.confidence < threshold) return null

  // ─── severity حسب category ───
  let severity = "medium"
  if (analysis.category === "threat" || analysis.category === "hate") {
    severity = "high"
  } else if (analysis.category === "sexual") {
    severity = "high"
  } else if (analysis.category === "harassment") {
    severity = analysis.confidence >= 90 ? "high" : "medium"
  }

  return {
    reason: `إساءة بالذكاء الاصطناعي (${analysis.confidence}%): ${analysis.reason}`,
    severity,
    category: analysis.category,
    confidence: analysis.confidence,
    ai_powered: true
  }
}

// ──────────────────────────────────────────────────────────────────
//  Exports
// ──────────────────────────────────────────────────────────────────

module.exports = {
  checkAIToxicity,
  analyzeMessage,    // للاستخدام المباشر أو الاختبار
  cleanupCache,      // للـ scheduler
  getCacheSize: () => cache.size
}
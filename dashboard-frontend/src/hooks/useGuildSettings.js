import { useEffect, useState, useCallback } from "react"
import { useParams } from "react-router-dom"
import { settingsApi } from "@/api"
import { toast } from "sonner"

/**
 * useGuildSettings — Hook ذكي لإدارة إعدادات أي قسم
 *
 * @example
 *   const { data, setData, updateField, isLoading, isSaving, isDirty, save, reset }
 *     = useGuildSettings({
 *         section: 'welcome',
 *         fetcher: settingsApi.getWelcome,
 *         saver: settingsApi.saveWelcome,
 *       })
 *
 * نقبل أيضاً اسم section فقط ونتعرف على الـ fetcher/saver تلقائياً:
 *   const { ... } = useGuildSettings({ section: 'welcome' })
 */

const SECTION_API_MAP = {
  welcome: { fetch: settingsApi.getWelcome, save: settingsApi.saveWelcome },
  protection: { fetch: settingsApi.getProtection, save: settingsApi.saveProtection },
  logs: { fetch: settingsApi.getLogs, save: settingsApi.saveLogs },
  ai: { fetch: settingsApi.getAi, save: settingsApi.saveAi },
  xp: { fetch: settingsApi.getXp, save: settingsApi.saveXp },
  economy: { fetch: settingsApi.getEconomy, save: settingsApi.saveEconomy },
  tickets: { fetch: settingsApi.getTickets, save: settingsApi.saveTickets },
}

export function useGuildSettings({ section, fetcher, saver, guildId: gidProp }) {
  const params = useParams()
  const guildId = gidProp || params.guildId

  // الـ API helpers
  const finalFetcher = fetcher || SECTION_API_MAP[section]?.fetch
  const finalSaver = saver || SECTION_API_MAP[section]?.save

  const [data, setData] = useState(null)
  const [originalData, setOriginalData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState(null)

  // ── Fetch ──
  useEffect(() => {
    if (!finalFetcher) {
      console.error(`No fetcher for section: ${section}`)
      setIsLoading(false)
      return
    }

    let mounted = true
    setIsLoading(true)
    setError(null)

    Promise.resolve(finalFetcher(guildId))
      .then((result) => {
        if (!mounted) return
        setData(result)
        setOriginalData(JSON.parse(JSON.stringify(result)))
      })
      .catch((err) => {
        if (!mounted) return
        console.error(`[${section}] Fetch error:`, err)
        setError(err)
        toast.error(err.message || `فشل تحميل إعدادات ${section}`)
      })
      .finally(() => {
        if (mounted) setIsLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [section, guildId])

  // ── Update field (يدعم nested paths مثل "embed.title") ──
  const updateField = useCallback((path, value) => {
    setData((prev) => {
      if (!prev) return prev
      const next = JSON.parse(JSON.stringify(prev))
      const keys = path.split(".")
      let target = next
      for (let i = 0; i < keys.length - 1; i++) {
        if (target[keys[i]] === undefined) target[keys[i]] = {}
        target = target[keys[i]]
      }
      target[keys[keys.length - 1]] = value
      return next
    })
  }, [])

  // ── Save ──
  const save = useCallback(async () => {
    if (!finalSaver || !data) return false

    setIsSaving(true)
    try {
      await finalSaver(guildId, data)
      setOriginalData(JSON.parse(JSON.stringify(data)))
      toast.success("تم الحفظ بنجاح")
      return true
    } catch (err) {
      console.error(`[${section}] Save error:`, err)
      toast.error(err.message || "فشل الحفظ")
      return false
    } finally {
      setIsSaving(false)
    }
  }, [section, guildId, data])

  // ── Reset ──
  const reset = useCallback(() => {
    if (originalData) {
      setData(JSON.parse(JSON.stringify(originalData)))
      toast.info("تم استعادة آخر قيم محفوظة")
    }
  }, [originalData])

  // ── isDirty ──
  const isDirty =
    data && originalData && JSON.stringify(data) !== JSON.stringify(originalData)

  return {
    data,
    setData,
    updateField,
    isLoading,
    isSaving,
    isDirty,
    error,
    save,
    reset,
  }
}

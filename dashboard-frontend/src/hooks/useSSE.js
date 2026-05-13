/**
 * ═══════════════════════════════════════════════════════════
 *  useSSE — Real-time updates hook
 *  المسار: dashboard-frontend/src/hooks/useSSE.js
 *
 *  - يفتح اتصال SSE للسيرفر المختار
 *  - يعيد الاتصال تلقائياً مع exponential backoff
 *  - يتيح الاشتراك في events محددة عبر subscribe()
 *  - يقفل الاتصال عند تغيير السيرفر أو unmount
 *
 *  Usage:
 *    const { connected, subscribe } = useSSE();
 *
 *    useEffect(() => {
 *      const unsub = subscribe('settings_changed', (data) => {
 *        refetch();
 *      });
 *      return unsub;
 *    }, [subscribe]);
 *
 *  Events المتاحة:
 *   - settings_changed   { section }
 *   - member_count       { count, delta }
 *   - notification       { type, message, severity }
 *   - audit_entry        { action, user_id, username }
 * ═══════════════════════════════════════════════════════════
 */

import { useEffect, useRef, useState, useCallback } from "react"
import { useGuildStore } from "@/store/guildStore"
import { env } from "@/config/env"

const MAX_RECONNECT_DELAY = 30000 // 30s سقف للـ backoff
const INITIAL_RECONNECT_DELAY = 1000

export function useSSE() {
  const { selectedGuildId } = useGuildStore()
  const [connected, setConnected] = useState(false)
  const [planAllowed, setPlanAllowed] = useState(true)

  const esRef = useRef(null)
  const listenersRef = useRef(new Map()) // eventName → Set<callback>
  const reconnectAttempts = useRef(0)
  const reconnectTimer = useRef(null)
  const closedManually = useRef(false)

  // ─── إضافة listener ───
  const subscribe = useCallback((eventName, callback) => {
    if (!eventName || typeof callback !== "function") return () => {}

    if (!listenersRef.current.has(eventName)) {
      listenersRef.current.set(eventName, new Set())
    }
    listenersRef.current.get(eventName).add(callback)

    // إذا الاتصال موجود، اربط الـ event عليه
    const es = esRef.current
    if (es && es.readyState !== EventSource.CLOSED) {
      es.addEventListener(eventName, handleEvent(eventName))
    }

    return () => {
      listenersRef.current.get(eventName)?.delete(callback)
    }
  }, [])

  // ─── معالج event مشترك ───
  const handleEvent = useCallback(
    (eventName) => (e) => {
      let data = {}
      try {
        data = JSON.parse(e.data || "{}")
      } catch {}

      const callbacks = listenersRef.current.get(eventName)
      if (!callbacks) return
      for (const cb of callbacks) {
        try { cb(data) } catch (err) { console.error("[SSE] listener error:", err) }
      }
    },
    [],
  )

  // ─── الاتصال الفعلي ───
  const connect = useCallback(() => {
    if (!selectedGuildId) return

    // إغلاق أي اتصال سابق
    if (esRef.current) {
      try { esRef.current.close() } catch {}
      esRef.current = null
    }

    const token = localStorage.getItem("lyn-auth-token")
    if (!token) {
      setConnected(false)
      return
    }

    const url = `${env.API_URL}/api/guild/${selectedGuildId}/sse?token=${encodeURIComponent(token)}`
    const es = new EventSource(url)
    esRef.current = es
    closedManually.current = false

    // ─── Built-in events ───
    es.addEventListener("connected", () => {
      setConnected(true)
      setPlanAllowed(true)
      reconnectAttempts.current = 0
    })

    es.addEventListener("shutdown", () => {
      // السيرفر بيقفل — لا تعيد الاتصال
      closedManually.current = true
      try { es.close() } catch {}
      setConnected(false)
    })

    // ─── ربط كل الـ listeners المسجلة ───
    for (const eventName of listenersRef.current.keys()) {
      es.addEventListener(eventName, handleEvent(eventName))
    }

    // ─── Error handling + reconnection ───
    es.onerror = () => {
      setConnected(false)
      try { es.close() } catch {}

      if (closedManually.current) return

      // لو الـ readyState = CLOSED من قبل ما يفتح،
      // غالباً 403 (plan) أو 401 (auth). EventSource ما يعطينا
      // الـ status code مباشرة، فنجرب reconnect مرة وحدة فقط.
      const attempt = reconnectAttempts.current
      if (attempt >= 1 && !connected) {
        // غالباً مشكلة Plan/Auth — توقف
        setPlanAllowed(false)
        return
      }

      reconnectAttempts.current = attempt + 1
      const delay = Math.min(
        INITIAL_RECONNECT_DELAY * Math.pow(2, attempt),
        MAX_RECONNECT_DELAY,
      )

      reconnectTimer.current = setTimeout(connect, delay)
    }
  }, [selectedGuildId, handleEvent, connected])

  // ─── lifecycle: connect عند تغيير السيرفر ───
  useEffect(() => {
    if (!selectedGuildId) return

    connect()

    return () => {
      closedManually.current = true
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current)
        reconnectTimer.current = null
      }
      if (esRef.current) {
        try { esRef.current.close() } catch {}
        esRef.current = null
      }
      setConnected(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGuildId])

  return {
    connected,
    planAllowed,
    subscribe,
  }
}
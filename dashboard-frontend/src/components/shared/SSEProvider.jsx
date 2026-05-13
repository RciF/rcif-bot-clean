/**
 * ═══════════════════════════════════════════════════════════
 *  SSEProvider — Context عام للـ SSE
 *  المسار: dashboard-frontend/src/components/shared/SSEProvider.jsx
 *
 *  المنطق:
 *   - اتصال SSE واحد لكل التاب (مو لكل صفحة)
 *   - أي صفحة تستخدم useSSEContext() للاشتراك في events
 *   - يعرض indicator صغير في الـ topbar (متصل/منقطع)
 *
 *  Usage:
 *    // في الـ DashboardLayout:
 *    <SSEProvider>
 *      <Outlet />
 *    </SSEProvider>
 *
 *    // في أي صفحة:
 *    const { subscribe, connected } = useSSEContext();
 *    useEffect(() => subscribe('settings_changed', refetch), []);
 * ═══════════════════════════════════════════════════════════
 */

import { createContext, useContext } from "react"
import { useSSE } from "@/hooks/useSSE"

const SSEContext = createContext({
  connected: false,
  planAllowed: true,
  subscribe: () => () => {},
})

export function SSEProvider({ children }) {
  const sse = useSSE()
  return <SSEContext.Provider value={sse}>{children}</SSEContext.Provider>
}

export function useSSEContext() {
  return useContext(SSEContext)
}
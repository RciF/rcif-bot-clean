/**
 * ═══════════════════════════════════════════════════════════
 *  LiveIndicator — مؤشر اتصال SSE في الـ topbar
 *  المسار: dashboard-frontend/src/components/shared/LiveIndicator.jsx
 *
 *  - نقطة خضراء نابضة عند الاتصال
 *  - نقطة رمادية عند الانقطاع
 *  - يختفي تماماً لو الخطة ما تدعم (لا يظهر شي للـ Silver/Gold)
 * ═══════════════════════════════════════════════════════════
 */

import { useSSEContext } from "./SSEProvider"
import { QuickTooltip } from "@/components/ui/Tooltip"
import { cn } from "@/lib/utils"

export function LiveIndicator() {
  const { connected, planAllowed } = useSSEContext()

  // ما يظهر للخطط الأقل من Diamond
  if (!planAllowed) return null

  return (
    <QuickTooltip
      content={connected ? "متصل لحظياً" : "جاري إعادة الاتصال..."}
    >
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-accent transition-colors cursor-default">
        <div className="relative w-2 h-2">
          <div
            className={cn(
              "absolute inset-0 rounded-full",
              connected ? "bg-emerald-500" : "bg-muted-foreground/40",
            )}
          />
          {connected && (
            <div className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-75" />
          )}
        </div>
        <span className="text-xs text-muted-foreground hidden sm:inline">
          {connected ? "حي" : "..."}
        </span>
      </div>
    </QuickTooltip>
  )
}
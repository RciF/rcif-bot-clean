/**
 * ═══════════════════════════════════════════════════════════
 *  useBulkActions — Hook للعمليات الجماعية + Undo
 *  المسار: dashboard-frontend/src/hooks/useBulkActions.js
 *
 *  Usage:
 *    const { bulkBan, bulkMute, bulkAddRole } = useBulkActions();
 *
 *    await bulkBan(['123', '456'], { reason: 'Spam' });
 *    // تلقائياً يطلع toast مع زر Undo لمدة 30 ثانية
 * ═══════════════════════════════════════════════════════════
 */

import { useCallback } from "react"
import { toast } from "sonner"
import { Undo2 } from "lucide-react"
import { apiClient } from "@/api/client"
import { useGuildStore } from "@/store/guildStore"

const UNDO_DURATION = 30000 // 30s

export function useBulkActions() {
  const { selectedGuildId } = useGuildStore()

  // ─── Helper: عرض النتيجة + toast الـ undo ───
  const showResultToast = useCallback((result, opts = {}) => {
    const {
      successLabel = "تم تنفيذ العملية",
      failLabel = "فشل التنفيذ",
      undoable = true,
      onUndo,
    } = opts

    const successCount = result.success_count || 0
    const failedCount = result.failed_count || 0
    const total = result.total || 0

    // ─── Toast الناجح ───
    if (successCount > 0 && failedCount === 0) {
      const undoFn = undoable && result.action_id
        ? async () => {
            try {
              const undoResult = await apiClient.post(
                `/api/guild/${selectedGuildId}/bulk/undo`,
                { action_id: result.action_id }
              )
              toast.success(
                `تم التراجع — ${undoResult.success_count} من ${undoResult.total}`,
                { duration: 4000 }
              )
              if (onUndo) onUndo(undoResult)
            } catch (err) {
              toast.error(err.message || "فشل التراجع")
            }
          }
        : null

      toast.success(`${successLabel} (${successCount})`, {
        description: undoFn ? "متاح للتراجع لمدة 30 ثانية" : undefined,
        duration: undoFn ? UNDO_DURATION : 4000,
        action: undoFn
          ? { label: "تراجع", onClick: undoFn }
          : undefined,
      })
    } else if (successCount > 0 && failedCount > 0) {
      // ─── جزء نجح وجزء فشل ───
      toast.warning(
        `نجح ${successCount} من ${total}`,
        {
          description: `${failedCount} فشلوا`,
          duration: 6000,
        }
      )
    } else {
      // ─── الكل فشل ───
      toast.error(failLabel, {
        description: `${failedCount} حالة فشل`,
      })
    }
  }, [selectedGuildId])

  // ─── Bulk Ban ───
  const bulkBan = useCallback(async (userIds, opts = {}) => {
    if (!selectedGuildId || !userIds?.length) return null

    try {
      const result = await apiClient.post(
        `/api/guild/${selectedGuildId}/bulk/ban`,
        { user_ids: userIds, reason: opts.reason }
      )
      showResultToast(result, {
        successLabel: "تم الحظر",
        failLabel: "فشل الحظر",
        undoable: true,
        ...opts,
      })
      return result
    } catch (err) {
      toast.error(err.message || "فشل الحظر")
      return null
    }
  }, [selectedGuildId, showResultToast])

  // ─── Bulk Kick ───
  const bulkKick = useCallback(async (userIds, opts = {}) => {
    if (!selectedGuildId || !userIds?.length) return null

    try {
      const result = await apiClient.post(
        `/api/guild/${selectedGuildId}/bulk/kick`,
        { user_ids: userIds, reason: opts.reason }
      )
      showResultToast(result, {
        successLabel: "تم الطرد",
        failLabel: "فشل الطرد",
        undoable: false, // ⚠️ Kick غير قابل للتراجع
        ...opts,
      })
      return result
    } catch (err) {
      toast.error(err.message || "فشل الطرد")
      return null
    }
  }, [selectedGuildId, showResultToast])

  // ─── Bulk Mute ───
  const bulkMute = useCallback(async (userIds, durationMs, opts = {}) => {
    if (!selectedGuildId || !userIds?.length || !durationMs) return null

    try {
      const result = await apiClient.post(
        `/api/guild/${selectedGuildId}/bulk/mute`,
        {
          user_ids: userIds,
          duration_ms: durationMs,
          reason: opts.reason,
        }
      )
      showResultToast(result, {
        successLabel: "تم الكتم",
        failLabel: "فشل الكتم",
        undoable: true,
        ...opts,
      })
      return result
    } catch (err) {
      toast.error(err.message || "فشل الكتم")
      return null
    }
  }, [selectedGuildId, showResultToast])

  // ─── Bulk Role Add ───
  const bulkAddRole = useCallback(async (userIds, roleId, opts = {}) => {
    if (!selectedGuildId || !userIds?.length || !roleId) return null

    try {
      const result = await apiClient.post(
        `/api/guild/${selectedGuildId}/bulk/role-add`,
        { user_ids: userIds, role_id: roleId, reason: opts.reason }
      )
      showResultToast(result, {
        successLabel: "تم إعطاء الرتبة",
        failLabel: "فشل إعطاء الرتبة",
        undoable: true,
        ...opts,
      })
      return result
    } catch (err) {
      toast.error(err.message || "فشل إعطاء الرتبة")
      return null
    }
  }, [selectedGuildId, showResultToast])

  // ─── Bulk Role Remove ───
  const bulkRemoveRole = useCallback(async (userIds, roleId, opts = {}) => {
    if (!selectedGuildId || !userIds?.length || !roleId) return null

    try {
      const result = await apiClient.post(
        `/api/guild/${selectedGuildId}/bulk/role-remove`,
        { user_ids: userIds, role_id: roleId, reason: opts.reason }
      )
      showResultToast(result, {
        successLabel: "تم سحب الرتبة",
        failLabel: "فشل سحب الرتبة",
        undoable: true,
        ...opts,
      })
      return result
    } catch (err) {
      toast.error(err.message || "فشل سحب الرتبة")
      return null
    }
  }, [selectedGuildId, showResultToast])

  return {
    bulkBan,
    bulkKick,
    bulkMute,
    bulkAddRole,
    bulkRemoveRole,
  }
}
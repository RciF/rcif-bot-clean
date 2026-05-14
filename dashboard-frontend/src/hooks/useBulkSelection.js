/**
 * ═══════════════════════════════════════════════════════════
 *  useBulkSelection — Hook عام للتحديد الجماعي
 *  المسار: dashboard-frontend/src/hooks/useBulkSelection.js
 *
 *  يدير حالة التحديد ويوفر helpers جاهزة.
 *
 *  Usage:
 *    const {
 *      selectedIds,         // Set<string>
 *      selectedCount,
 *      isSelected,
 *      toggle,
 *      toggleAll,
 *      clear,
 *      allSelected,
 *      someSelected,
 *    } = useBulkSelection(items, { idKey: 'id', max: 100 });
 *
 *    <button onClick={() => toggle('123')}>...</button>
 *    {selectedIds.has('123') && <Check />}
 * ═══════════════════════════════════════════════════════════
 */

import { useState, useCallback, useMemo } from 'react';
import { toast } from 'sonner';

export function useBulkSelection(items = [], options = {}) {
  const { idKey = 'id', max = Infinity } = options;
  const [selectedIds, setSelectedIds] = useState(new Set());

  const itemsArray = Array.isArray(items) ? items : [];

  const visibleIds = useMemo(() => {
    return itemsArray.map((item) => item?.[idKey]).filter(Boolean);
  }, [itemsArray, idKey]);

  const allSelected = visibleIds.length > 0 &&
    visibleIds.every((id) => selectedIds.has(id));

  const someSelected = visibleIds.some((id) => selectedIds.has(id));

  const isSelected = useCallback(
    (id) => selectedIds.has(id),
    [selectedIds],
  );

  const toggle = useCallback(
    (id) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          if (next.size >= max) {
            toast.warning(`الحد الأقصى ${max} عنصر`);
            return prev;
          }
          next.add(id);
        }
        return next;
      });
    },
    [max],
  );

  const toggleAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      const newSet = new Set();
      for (const id of visibleIds) {
        if (newSet.size >= max) break;
        newSet.add(id);
      }
      if (visibleIds.length > max) {
        toast.info(`تم اختيار أول ${max} عنصر (الحد الأقصى)`);
      }
      setSelectedIds(newSet);
    }
  }, [allSelected, visibleIds, max]);

  const clear = useCallback(() => setSelectedIds(new Set()), []);

  const selectSpecific = useCallback((ids) => {
    setSelectedIds(new Set(ids.slice(0, max)));
  }, [max]);

  return {
    selectedIds,
    selectedCount: selectedIds.size,
    isSelected,
    toggle,
    toggleAll,
    clear,
    selectSpecific,
    allSelected,
    someSelected,
  };
}
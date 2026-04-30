import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { mock } from '@/lib/mock';

/**
 * useGuildSettings — Generic hook لإدارة إعدادات أي صفحة
 *
 * يدير: التحميل، حالة dirty، الحفظ، التراجع
 *
 * @param {object} options
 * @param {string} options.section - اسم القسم ('ai', 'protection', ...)
 * @param {function} options.fetcher - دالة جلب البيانات (افتراضياً من mock)
 * @param {function} options.saver - دالة الحفظ (افتراضياً mock.saveSettings)
 * @param {boolean} options.autoSave - حفظ تلقائي بعد debounce (افتراضي: false)
 *
 * @example
 *   const { data, setData, isLoading, isDirty, isSaving, save, reset } = useGuildSettings({
 *     section: 'ai',
 *     fetcher: mock.aiSettings,
 *   });
 */
export function useGuildSettings({ section, fetcher, saver, autoSave = false } = {}) {
  const [data, setDataState] = useState(null);
  const [originalData, setOriginalData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  const isDirty = useRef(false);

  // ── جلب البيانات ──
  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await (fetcher ? fetcher() : Promise.resolve({}));
      setDataState(result);
      setOriginalData(JSON.parse(JSON.stringify(result)));
      isDirty.current = false;
    } catch (err) {
      setError(err);
      toast.error('فشل تحميل الإعدادات');
    } finally {
      setIsLoading(false);
    }
  }, [fetcher]);

  // تحميل عند mount
  useEffect(() => {
    load();
  }, [load]);

  // ── تحديث البيانات (يحدد dirty) ──
  const setData = useCallback((updater) => {
    setDataState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      isDirty.current = JSON.stringify(next) !== JSON.stringify(originalData);
      return next;
    });
  }, [originalData]);

  // ── دالة لتحديث حقل واحد ──
  const updateField = useCallback((path, value) => {
    setData((prev) => {
      if (!prev) return prev;
      const next = JSON.parse(JSON.stringify(prev));

      // path: 'antiSpam.enabled' أو ['antiSpam', 'enabled']
      const keys = Array.isArray(path) ? path : path.split('.');
      let target = next;
      for (let i = 0; i < keys.length - 1; i++) {
        target = target[keys[i]];
      }
      target[keys[keys.length - 1]] = value;

      return next;
    });
  }, [setData]);

  // ── الحفظ ──
  const save = useCallback(async () => {
    if (!data) return { success: false };
    setIsSaving(true);
    try {
      const saveFn = saver || mock.saveSettings;
      const result = await saveFn(section, data);
      setOriginalData(JSON.parse(JSON.stringify(data)));
      isDirty.current = false;
      toast.success('تم حفظ الإعدادات بنجاح');
      return { success: true, result };
    } catch (err) {
      toast.error('فشل حفظ الإعدادات');
      return { success: false, error: err };
    } finally {
      setIsSaving(false);
    }
  }, [data, saver, section]);

  // ── التراجع ──
  const reset = useCallback(() => {
    if (originalData) {
      setDataState(JSON.parse(JSON.stringify(originalData)));
      isDirty.current = false;
      toast.info('تم استرجاع الإعدادات');
    }
  }, [originalData]);

  return {
    data,
    setData,
    updateField,
    isLoading,
    isSaving,
    isDirty: isDirty.current,
    error,
    save,
    reset,
    reload: load,
  };
}

/**
 * ═══════════════════════════════════════════════════════════
 *  useCommandsData — Hook موحّد (Batch 8 Update)
 *
 *  أُضيفت mutations جديدة:
 *  - saveRestrictions(commandName, restrictions)
 *  - saveDefaults(commandName, defaults)
 *  - saveAdvanced(commandName, { restrictions, defaults }) — combined
 * ═══════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback } from 'react';
import { commandsApi } from '@/api/commands';
import { toast } from 'sonner';

export function useCommandsData(guildId) {
  const [data, setData] = useState(null);
  const [leaderboard, setLeaderboard] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async (silent = false) => {
    if (!guildId) return;
    if (!silent) setIsLoading(true);
    setError(null);
    try {
      const result = await commandsApi.list(guildId);
      const payload = result?.data ?? result;
      setData(payload);
    } catch (err) {
      console.error('[useCommandsData] Load failed:', err);
      setError(err);
      if (!silent) toast.error('فشل تحميل الأوامر');
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [guildId]);

  const loadLeaderboard = useCallback(async () => {
    if (!guildId) return;
    try {
      const result = await commandsApi.leaderboard(guildId, 10);
      const payload = result?.data ?? result;
      setLeaderboard(payload);
    } catch (err) {
      console.warn('[useCommandsData] Leaderboard failed:', err);
      setLeaderboard({ leaderboard: [], total_commands_used: 0 });
    }
  }, [guildId]);

  useEffect(() => {
    if (guildId) {
      loadData();
      loadLeaderboard();
    }
  }, [guildId, loadData, loadLeaderboard]);

  const refresh = useCallback(async () => {
    await Promise.all([loadData(true), loadLeaderboard()]);
  }, [loadData, loadLeaderboard]);

  // ────────────────────────────────────────────
  //  Toggle enabled
  // ────────────────────────────────────────────
  const toggleEnabled = useCallback(
    async (commandName, newEnabled) => {
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          commands: prev.commands.map((c) =>
            c.name === commandName ? { ...c, enabled: newEnabled } : c,
          ),
        };
      });

      try {
        await commandsApi.update(guildId, commandName, { enabled: newEnabled });
        toast.success(newEnabled ? 'تم تفعيل الأمر' : 'تم تعطيل الأمر');
      } catch (err) {
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            commands: prev.commands.map((c) =>
              c.name === commandName ? { ...c, enabled: !newEnabled } : c,
            ),
          };
        });
        toast.error(err?.message || 'فشل تحديث الأمر');
        throw err;
      }
    },
    [guildId],
  );

  // ────────────────────────────────────────────
  //  Rename
  // ────────────────────────────────────────────
  const renameCommand = useCallback(
    async (commandName, newName) => {
      const finalName = newName.trim();
      try {
        await commandsApi.update(guildId, commandName, {
          custom_name: finalName === '' ? '' : finalName,
        });
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            commands: prev.commands.map((c) =>
              c.name === commandName
                ? { ...c, custom_name: finalName === '' ? null : finalName }
                : c,
            ),
          };
        });
        toast.success(finalName ? 'تم تغيير اسم الأمر' : 'تم استعادة الاسم الأصلي');
      } catch (err) {
        if (err?.code === 'PLAN_REQUIRED') {
          toast.error('تحتاج خطة Silver أو أعلى');
        } else {
          toast.error(err?.message || 'فشل تغيير الاسم');
        }
        throw err;
      }
    },
    [guildId],
  );

  // ────────────────────────────────────────────
  //  Reset all
  // ────────────────────────────────────────────
  const resetAll = useCallback(async () => {
    try {
      await commandsApi.reset(guildId);
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          commands: prev.commands.map((c) => ({
            ...c,
            custom_name: null,
            enabled: true,
          })),
          custom_settings: {},
        };
      });
      toast.success('تم إعادة كل الأوامر للافتراضي');
    } catch (err) {
      toast.error(err?.message || 'فشل الإعادة');
      throw err;
    }
  }, [guildId]);

  // ────────────────────────────────────────────
  //  Aliases
  // ────────────────────────────────────────────
  const addAlias = useCallback(
    async (commandName, alias) => {
      try {
        await commandsApi.addAlias(guildId, commandName, alias);
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            commands: prev.commands.map((c) =>
              c.name === commandName
                ? { ...c, aliases: [...(c.aliases || []), alias] }
                : c,
            ),
          };
        });
        toast.success(`أُضيف الاختصار: ${alias}`);
      } catch (err) {
        const message = err?.response?.data?.error || err?.message || 'فشلت الإضافة';
        toast.error(message);
        throw err;
      }
    },
    [guildId],
  );

  const removeAlias = useCallback(
    async (commandName, alias) => {
      try {
        await commandsApi.removeAlias(guildId, commandName, alias);
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            commands: prev.commands.map((c) =>
              c.name === commandName
                ? { ...c, aliases: (c.aliases || []).filter((a) => a !== alias) }
                : c,
            ),
          };
        });
        toast.success(`حُذف الاختصار: ${alias}`);
      } catch (err) {
        const message = err?.response?.data?.error || err?.message || 'فشل الحذف';
        toast.error(message);
        throw err;
      }
    },
    [guildId],
  );

  // ────────────────────────────────────────────
  //  ✅ NEW (Batch 8): saveAdvanced
  //  يحفظ restrictions + defaults في طلبتين متوازيتين
  // ────────────────────────────────────────────
  const saveAdvanced = useCallback(
    async (commandName, { restrictions, defaults }) => {
      try {
        await Promise.all([
          commandsApi.saveRestrictions(guildId, commandName, restrictions),
          commandsApi.saveDefaults(guildId, commandName, defaults),
        ]);

        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            commands: prev.commands.map((c) =>
              c.name === commandName ? { ...c, restrictions, defaults } : c,
            ),
          };
        });

        toast.success('تم حفظ الإعدادات المتقدمة');
      } catch (err) {
        const message = err?.response?.data?.error || err?.message || 'فشل الحفظ';
        toast.error(message);
        throw err;
      }
    },
    [guildId],
  );

  return {
    commands: data?.commands ?? [],
    categories: data?.categories ?? {},
    guildPlan: data?.guild_plan ?? 'free',
    leaderboard: leaderboard?.leaderboard ?? [],
    totalCommandsUsed: leaderboard?.total_commands_used ?? 0,

    isLoading,
    error,

    refresh,
    toggleEnabled,
    renameCommand,
    resetAll,
    addAlias,
    removeAlias,
    saveAdvanced,
  };
}
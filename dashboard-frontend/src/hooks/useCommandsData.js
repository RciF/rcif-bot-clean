/**
 * ═══════════════════════════════════════════════════════════
 *  useCommandsData — Hook موحّد لكل بيانات وعمليات الأوامر
 *
 *  يجلب:
 *  - قائمة الأوامر كاملة (مع aliases, restrictions, defaults, custom_name)
 *  - Leaderboard أكثر الأوامر استخداماً
 *
 *  يوفر mutations:
 *  - toggleEnabled(commandName, enabled)
 *  - renameCommand(commandName, newName)
 *  - resetAll()
 *  - addAlias(commandName, alias)
 *  - removeAlias(commandName, alias)
 *
 *  كل المutations تستخدم optimistic updates ثم refresh.
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

  // ────────────────────────────────────────────
  //  Load main commands list
  // ────────────────────────────────────────────
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

  // ────────────────────────────────────────────
  //  Load leaderboard (lighter, secondary)
  // ────────────────────────────────────────────
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

  // ────────────────────────────────────────────
  //  Initial load
  // ────────────────────────────────────────────
  useEffect(() => {
    if (guildId) {
      loadData();
      loadLeaderboard();
    }
  }, [guildId, loadData, loadLeaderboard]);

  // ────────────────────────────────────────────
  //  Refresh (silent, after mutations)
  // ────────────────────────────────────────────
  const refresh = useCallback(async () => {
    await Promise.all([
      loadData(true),
      loadLeaderboard(),
    ]);
  }, [loadData, loadLeaderboard]);

  // ────────────────────────────────────────────
  //  Mutations — Optimistic updates
  // ────────────────────────────────────────────

  /**
   * تفعيل/تعطيل أمر
   */
  const toggleEnabled = useCallback(
    async (commandName, newEnabled) => {
      // ─── Optimistic update ───
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
        // ─── Revert on failure ───
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

  /**
   * تغيير اسم الأمر (custom_name)
   * - newName === '' → استعادة الاسم الأصلي
   */
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

        toast.success(
          finalName ? 'تم تغيير اسم الأمر' : 'تم استعادة الاسم الأصلي',
        );
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

  /**
   * إعادة كل الأوامر للافتراضي
   */
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

  /**
   * إضافة alias
   */
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
        const message =
          err?.response?.data?.error || err?.message || 'فشلت الإضافة';
        toast.error(message);
        throw err;
      }
    },
    [guildId],
  );

  /**
   * حذف alias
   */
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
                ? {
                    ...c,
                    aliases: (c.aliases || []).filter((a) => a !== alias),
                  }
                : c,
            ),
          };
        });

        toast.success(`حُذف الاختصار: ${alias}`);
      } catch (err) {
        const message =
          err?.response?.data?.error || err?.message || 'فشل الحذف';
        toast.error(message);
        throw err;
      }
    },
    [guildId],
  );

  return {
    // Data
    commands: data?.commands ?? [],
    categories: data?.categories ?? {},
    guildPlan: data?.guild_plan ?? 'free',
    leaderboard: leaderboard?.leaderboard ?? [],
    totalCommandsUsed: leaderboard?.total_commands_used ?? 0,

    // States
    isLoading,
    error,

    // Actions
    refresh,
    toggleEnabled,
    renameCommand,
    resetAll,
    addAlias,
    removeAlias,
  };
}
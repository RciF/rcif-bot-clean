import { useEffect, useState, useCallback } from 'react';
import { settingsApi } from '@/api';
import { useGuildStore } from '@/store/guildStore';
import { toast } from 'sonner';

const SECTION_API_MAP = {
  welcome:    { fetch: settingsApi.getWelcome,    save: settingsApi.saveWelcome    },
  protection: { fetch: settingsApi.getProtection, save: settingsApi.saveProtection },
  logs:       { fetch: settingsApi.getLogs,       save: settingsApi.saveLogs       },
  ai:         { fetch: settingsApi.getAi,         save: settingsApi.saveAi         },
  xp:         { fetch: settingsApi.getXp,         save: settingsApi.saveXp         },
  economy:    { fetch: settingsApi.getEconomy,    save: settingsApi.saveEconomy    },
  tickets:    { fetch: settingsApi.getTickets,    save: settingsApi.saveTickets    },
};

export function useGuildSettings({ section, fetcher, saver }) {
  const { selectedGuildId } = useGuildStore();
  const guildId = selectedGuildId;

  const finalFetcher = fetcher || SECTION_API_MAP[section]?.fetch;
  const finalSaver   = saver   || SECTION_API_MAP[section]?.save;

  const [data,         setData]         = useState(null);
  const [originalData, setOriginalData] = useState(null);
  const [isLoading,    setIsLoading]    = useState(true);
  const [isSaving,     setIsSaving]     = useState(false);
  const [error,        setError]        = useState(null);

  useEffect(() => {
    if (!guildId) {
      setIsLoading(false);
      return;
    }
    if (!finalFetcher) {
      console.error(`No fetcher for section: ${section}`);
      setIsLoading(false);
      return;
    }

    let mounted = true;
    setIsLoading(true);
    setError(null);

    Promise.resolve(finalFetcher(guildId))
      .then((result) => {
        if (!mounted) return;
        setData(result);
        setOriginalData(JSON.parse(JSON.stringify(result)));
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err);
        toast.error(err.message || `فشل تحميل إعدادات ${section}`);
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => { mounted = false; };
  }, [section, guildId]);

  const updateField = useCallback((path, value) => {
    setData((prev) => {
      if (!prev) return prev;
      const next = JSON.parse(JSON.stringify(prev));
      const keys = path.split('.');
      let target = next;
      for (let i = 0; i < keys.length - 1; i++) {
        if (target[keys[i]] === undefined) target[keys[i]] = {};
        target = target[keys[i]];
      }
      target[keys[keys.length - 1]] = value;
      return next;
    });
  }, []);

  const save = useCallback(async () => {
    if (!finalSaver || !data || !guildId) return false;
    setIsSaving(true);
    try {
      await finalSaver(guildId, data);
      setOriginalData(JSON.parse(JSON.stringify(data)));
      toast.success('تم الحفظ بنجاح');
      return true;
    } catch (err) {
      toast.error(err.message || 'فشل الحفظ');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [section, guildId, data]);

  const reset = useCallback(() => {
    if (originalData) {
      setData(JSON.parse(JSON.stringify(originalData)));
      toast.info('تم استعادة آخر قيم محفوظة');
    }
  }, [originalData]);

  const isDirty =
    data && originalData && JSON.stringify(data) !== JSON.stringify(originalData);

  return { data, setData, updateField, isLoading, isSaving, isDirty, error, save, reset };
}

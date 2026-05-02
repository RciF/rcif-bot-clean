import { useEffect, useState, useMemo } from 'react';
import { Terminal, Search, Edit3, RotateCcw, Lock, CheckCheck } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { QuickTooltip } from '@/components/ui/Tooltip';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { SettingsPageHeader } from '@/components/shared/SettingsPageHeader';
import { PlanBadge } from '@/components/shared/PlanBadge';
import { PlanLockModal } from '@/components/shared/PlanLockOverlay';
import { EmptyState } from '@/components/shared/EmptyState';
import { usePlanGate } from '@/hooks/usePlanGate';
import { useGuildStore } from '@/store/guildStore';
import { commandsApi } from '@/api';
import { PLAN_TIERS, hasAccess } from '@/lib/plans';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function CommandsPage() {
  const { selectedGuildId } = useGuildStore();
  const [data, setData] = useState(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [renameTarget, setRenameTarget] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [saving, setSaving] = useState(false);

  const currentPlan = PLAN_TIERS.SILVER;
  const renamePlanGate = usePlanGate('commandsRename', currentPlan);

  useEffect(() => {
    if (!selectedGuildId) return;
    commandsApi.list(selectedGuildId).then(setData).catch(() => toast.error('فشل تحميل الأوامر'));
  }, [selectedGuildId]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const commands = data.commands || Object.entries(data.custom_settings || {}).map(([name, s]) => ({ id: name, name, ...s }));
    return commands.filter((cmd) => {
      if (activeCategory !== 'all' && cmd.category !== activeCategory) return false;
      if (search && !cmd.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [data, activeCategory, search]);

  const handleToggle = async (cmdName, currentEnabled) => {
    try {
      await commandsApi.update(selectedGuildId, cmdName, { enabled: !currentEnabled });
      setData((prev) => {
        const settings = { ...prev.custom_settings };
        settings[cmdName] = { ...settings[cmdName], enabled: !currentEnabled };
        return { ...prev, custom_settings: settings };
      });
    } catch {
      toast.error('فشل تحديث الأمر');
    }
  };

  const handleRename = async () => {
    if (!renameValue.trim()) return;
    setSaving(true);
    try {
      await commandsApi.update(selectedGuildId, renameTarget.name, { custom_name: renameValue.trim() });
      setData((prev) => {
        const settings = { ...prev.custom_settings };
        settings[renameTarget.name] = { ...settings[renameTarget.name], custom_name: renameValue.trim() };
        return { ...prev, custom_settings: settings };
      });
      toast.success('تم تغيير اسم الأمر');
    } catch {
      toast.error('فشل تغيير الاسم');
    } finally {
      setSaving(false);
      setRenameTarget(null);
      setRenameValue('');
    }
  };

  if (!data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 rounded-2xl" />
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const customSettings = data.custom_settings || {};
  const guildPlan = data.guild_plan || 'free';

  return (
    <>
      <SettingsPageHeader icon={<Terminal />} title="الأوامر" description="تفعيل وتعطيل أوامر البوت وتخصيص أسمائها" plan="free" />

      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="ابحث عن أمر..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-10" />
        </div>
      </div>

      {Object.keys(customSettings).length === 0 ? (
        <EmptyState icon={<Terminal />} title="لا يوجد إعدادات أوامر مخصصة" description="كل الأوامر تعمل بإعداداتها الافتراضية" />
      ) : (
        <Card className="p-5">
          <div className="space-y-2">
            {Object.entries(customSettings).map(([name, s]) => {
              if (search && !name.toLowerCase().includes(search.toLowerCase())) return null;
              const canRename = hasAccess(guildPlan, PLAN_TIERS.SILVER);
              return (
                <div key={name} className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm font-mono">{s.custom_name || name}</div>
                    {s.custom_name && <div className="text-xs text-muted-foreground font-mono">/{name}</div>}
                  </div>
                  <div className="flex items-center gap-2">
                    {canRename && (
                      <QuickTooltip content="تغيير الاسم">
                        <Button size="sm" variant="ghost" onClick={() => { setRenameTarget({ name }); setRenameValue(s.custom_name || name); }}>
                          <Edit3 className="w-4 h-4" />
                        </Button>
                      </QuickTooltip>
                    )}
                    <Switch checked={s.enabled !== false} onCheckedChange={() => handleToggle(name, s.enabled !== false)} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Dialog open={!!renameTarget} onOpenChange={() => setRenameTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تغيير اسم الأمر</DialogTitle>
            <DialogDescription>اسم جديد للأمر <span className="font-mono font-bold">/{renameTarget?.name}</span></DialogDescription>
          </DialogHeader>
          <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} placeholder="الاسم الجديد..." maxLength={32} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameTarget(null)}>إلغاء</Button>
            <Button onClick={handleRename} disabled={saving || !renameValue.trim()}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PlanLockModal {...renamePlanGate.lockModalProps} featureName="تغيير أسماء الأوامر" />
    </>
  );
}

import { useEffect, useState, useMemo } from 'react';
import {
  Terminal,
  Search,
  Edit3,
  RotateCcw,
  Lock,
  CheckCheck,
  XCircle,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { QuickTooltip } from '@/components/ui/Tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { SettingsPageHeader } from '@/components/shared/SettingsPageHeader';
import { PlanLockModal } from '@/components/shared/PlanLockOverlay';
import { EmptyState } from '@/components/shared/EmptyState';
import { usePlanGate } from '@/hooks/usePlanGate';
import { useGuildStore } from '@/store/guildStore';
import { commandsApi } from '@/api';
import { PLAN_TIERS, hasAccess } from '@/lib/plans';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ────────────────────────────────────────────────────────────
//  Tier metadata
// ────────────────────────────────────────────────────────────

const TIER_META = {
  free:    { label: 'مجاني', emoji: '🆓', color: 'bg-slate-500/10 text-slate-400 border-slate-500/30' },
  silver:  { label: 'فضي',   emoji: '🥈', color: 'bg-zinc-400/10 text-zinc-300 border-zinc-400/30' },
  gold:    { label: 'ذهبي',  emoji: '🥇', color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  diamond: { label: 'ماسي',  emoji: '💎', color: 'bg-sky-500/10 text-sky-400 border-sky-500/30' },
};

// ────────────────────────────────────────────────────────────
//  Page
// ────────────────────────────────────────────────────────────

export default function CommandsPage() {
  const { selectedGuildId } = useGuildStore();
  const [data, setData] = useState(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [renameTarget, setRenameTarget] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);

  const renamePlanGate = usePlanGate('commandsRename', PLAN_TIERS.SILVER);

  // ─── Load ───
  useEffect(() => {
    let mounted = true;
    if (!selectedGuildId) return;
    setData(null);
    commandsApi
      .list(selectedGuildId)
      .then((res) => {
        if (!mounted) return;
        setData(res);
      })
      .catch((err) => {
        if (!mounted) return;
        setData({ commands: [], categories: {}, custom_settings: {}, guild_plan: 'free' });
        toast.error(err.message || 'فشل تحميل الأوامر');
      });
    return () => {
      mounted = false;
    };
  }, [selectedGuildId]);

  // ─── Derived data ───
  const allCommands = useMemo(() => {
    if (!data) return [];
    return Array.isArray(data.commands) ? data.commands : [];
  }, [data]);

  const categoriesMap = useMemo(() => {
    return data?.categories || {};
  }, [data]);

  const guildPlan = data?.guild_plan || 'free';
  const canRename = hasAccess(guildPlan, PLAN_TIERS.SILVER);

  // عدد كل فئة
  const categoriesWithCounts = useMemo(() => {
    const list = Object.values(categoriesMap || {})
      .map((c) => ({
        ...c,
        count: allCommands.filter((cmd) => cmd.category === c.id).length,
      }))
      .filter((c) => c.count > 0)
      .sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
    return list;
  }, [categoriesMap, allCommands]);

  // فلترة
  const filtered = useMemo(() => {
    if (!allCommands.length) return [];
    return allCommands.filter((cmd) => {
      if (activeCategory !== 'all' && cmd.category !== activeCategory) return false;
      if (search) {
        const q = search.toLowerCase();
        const inName = cmd.name?.toLowerCase().includes(q);
        const inCustom = cmd.custom_name?.toLowerCase().includes(q);
        const inDesc = cmd.description?.toLowerCase().includes(q);
        if (!inName && !inCustom && !inDesc) return false;
      }
      return true;
    });
  }, [allCommands, activeCategory, search]);

  // إحصائيات
  const stats = useMemo(() => {
    if (!allCommands.length) return null;
    return {
      total: allCommands.length,
      enabled: allCommands.filter((c) => c.enabled !== false).length,
      disabled: allCommands.filter((c) => c.enabled === false).length,
      renamed: allCommands.filter((c) => c.custom_name).length,
    };
  }, [allCommands]);

  // ─── Handlers ───

  const handleToggle = async (cmdName, currentEnabled) => {
    try {
      await commandsApi.update(selectedGuildId, cmdName, {
        enabled: !currentEnabled,
      });
      setData((prev) => {
        const newCommands = prev.commands.map((c) =>
          c.name === cmdName ? { ...c, enabled: !currentEnabled } : c,
        );
        return { ...prev, commands: newCommands };
      });
      toast.success(currentEnabled ? 'تم إيقاف الأمر' : 'تم تفعيل الأمر');
    } catch (err) {
      toast.error(err.message || 'فشل تحديث الأمر');
    }
  };

  const handleRename = async () => {
    if (!renameTarget) return;
    const newName = renameValue.trim();
    setSaving(true);
    try {
      await commandsApi.update(selectedGuildId, renameTarget.name, {
        custom_name: newName === '' ? '' : newName,
      });
      setData((prev) => {
        const newCommands = prev.commands.map((c) =>
          c.name === renameTarget.name
            ? { ...c, custom_name: newName === '' ? null : newName }
            : c,
        );
        return { ...prev, commands: newCommands };
      });
      toast.success(newName ? 'تم تغيير اسم الأمر' : 'تم استعادة الاسم الأصلي');
      setRenameTarget(null);
      setRenameValue('');
    } catch (err) {
      if (err.code === 'PLAN_REQUIRED') {
        toast.error('تحتاج خطة Silver أو أعلى');
      } else {
        toast.error(err.message || 'فشل تغيير الاسم');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleResetAll = async () => {
    setResetting(true);
    try {
      await commandsApi.reset(selectedGuildId);
      setData((prev) => ({
        ...prev,
        commands: prev.commands.map((c) => ({
          ...c,
          custom_name: null,
          enabled: true,
        })),
        custom_settings: {},
      }));
      toast.success('تم إعادة كل الأوامر للافتراضي');
      setConfirmReset(false);
    } catch (err) {
      toast.error(err.message || 'فشل الإعادة');
    } finally {
      setResetting(false);
    }
  };

  // ─── Loading ───
  if (!data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-12 rounded-xl" />
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <SettingsPageHeader
        icon={<Terminal />}
        title="الأوامر"
        description="تفعيل وتعطيل أوامر البوت وتخصيص أسمائها"
        plan="free"
        actions={
          stats?.renamed > 0 || stats?.disabled > 0 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmReset(true)}
            >
              <RotateCcw className="w-4 h-4" />
              إعادة الكل للافتراضي
            </Button>
          ) : null
        }
      />

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <Card className="p-4">
            <div className="text-xs text-muted-foreground mb-1">الإجمالي</div>
            <div className="text-2xl font-bold num">{stats.total}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground mb-1">مفعّلة</div>
            <div className="text-2xl font-bold num text-emerald-500">
              {stats.enabled}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground mb-1">معطّلة</div>
            <div className="text-2xl font-bold num text-red-500">
              {stats.disabled}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground mb-1">معاد تسميتها</div>
            <div className="text-2xl font-bold num text-violet-500">
              {stats.renamed}
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="p-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute end-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="ابحث عن أمر بالاسم أو الوصف..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pe-10"
            />
          </div>

          <Select value={activeCategory} onValueChange={setActiveCategory}>
            <SelectTrigger className="sm:w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الفئات</SelectItem>
              {categoriesWithCounts.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.icon} {cat.label} ({cat.count})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* List */}
      {filtered.length === 0 ? (
        <Card className="p-5">
          <EmptyState
            icon={<Terminal />}
            title="لا توجد أوامر"
            description={
              search
                ? 'ما لقينا أوامر تطابق البحث'
                : 'لا توجد أوامر في هذه الفئة'
            }
          />
        </Card>
      ) : (
        <Card className="p-3">
          <div className="space-y-1">
            {filtered.map((cmd) => {
              const tier = TIER_META[cmd.subscriptionTier] || TIER_META.free;
              const isEnabled = cmd.enabled !== false;
              const displayName = cmd.custom_name || cmd.name;
              const cat = categoriesMap[cmd.category];

              return (
                <div
                  key={cmd.name}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-xl transition-colors group',
                    'hover:bg-accent/40',
                    !isEnabled && 'opacity-60',
                  )}
                >
                  {/* Tier badge */}
                  <div
                    className={cn(
                      'w-9 h-9 rounded-lg flex items-center justify-center text-base flex-shrink-0 border',
                      tier.color,
                    )}
                    title={tier.label}
                  >
                    {tier.emoji}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-medium text-sm">
                        /{displayName}
                      </span>
                      {cmd.custom_name && (
                        <Badge
                          variant="outline"
                          className="text-[10px] py-0 h-4 px-1.5 font-mono"
                        >
                          أصلاً: {cmd.name}
                        </Badge>
                      )}
                      {!isEnabled && (
                        <Badge
                          variant="destructive"
                          className="text-[10px] py-0 h-4 px-1.5"
                        >
                          <XCircle className="w-2.5 h-2.5 me-1" />
                          معطّل
                        </Badge>
                      )}
                      {cmd.isSubcommand && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] py-0 h-4 px-1.5"
                        >
                          فرعي
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                      {cmd.description}
                    </div>
                  </div>

                  {/* Category */}
                  {cat && (
                    <div className="hidden md:flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                      <span>{cat.icon}</span>
                      <span>{cat.label}</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <QuickTooltip content={canRename ? 'تغيير الاسم' : 'يحتاج Silver'}>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={
                          canRename
                            ? () => {
                                setRenameTarget(cmd);
                                setRenameValue(cmd.custom_name || '');
                              }
                            : renamePlanGate.gateAction(() => {})
                        }
                      >
                        {canRename ? (
                          <Edit3 className="w-4 h-4" />
                        ) : (
                          <Lock className="w-4 h-4" />
                        )}
                      </Button>
                    </QuickTooltip>
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={() => handleToggle(cmd.name, isEnabled)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Rename Dialog */}
      <Dialog
        open={!!renameTarget}
        onOpenChange={(v) => !v && !saving && setRenameTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تغيير اسم الأمر</DialogTitle>
            <DialogDescription>
              اسم جديد للأمر{' '}
              <span className="font-mono font-bold">/{renameTarget?.name}</span>
              <br />
              <span className="text-xs">اتركه فاضي لاستعادة الاسم الأصلي</span>
            </DialogDescription>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            placeholder={renameTarget?.name || 'الاسم الجديد...'}
            maxLength={32}
            autoFocus
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRenameTarget(null)}
              disabled={saving}
            >
              إلغاء
            </Button>
            <Button onClick={handleRename} disabled={saving}>
              <CheckCheck className="w-4 h-4" />
              {saving ? 'جاري الحفظ...' : 'حفظ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Confirm */}
      <Dialog
        open={confirmReset}
        onOpenChange={(v) => !v && !resetting && setConfirmReset(false)}
      >
        <DialogContent>
          <div className="flex justify-center -mt-4 mb-2">
            <div className="w-16 h-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center">
              <RotateCcw className="w-8 h-8" />
            </div>
          </div>
          <DialogHeader>
            <DialogTitle className="text-center">إعادة كل الأوامر؟</DialogTitle>
            <DialogDescription className="text-center">
              راح يتم استعادة كل الأسماء الأصلية وتفعيل كل الأوامر — ما يمكن
              التراجع
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmReset(false)}
              className="flex-1"
              disabled={resetting}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleResetAll}
              className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              disabled={resetting}
            >
              <RotateCcw className="w-4 h-4" />
              {resetting ? 'جاري الإعادة...' : 'إعادة الكل'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PlanLockModal {...renamePlanGate.lockModalProps} featureName="تغيير أسماء الأوامر" />
    </>
  );
}
import { useEffect, useState, useMemo } from 'react';
import {
  Terminal,
  Search,
  Edit3,
  RotateCcw,
  Lock,
  CheckCheck,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { QuickTooltip } from '@/components/ui/Tooltip';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { SettingsPageHeader } from '@/components/shared/SettingsPageHeader';
import { PlanBadge } from '@/components/shared/PlanBadge';
import { PlanLockModal } from '@/components/shared/PlanLockOverlay';
import { EmptyState } from '@/components/shared/EmptyState';
import { usePlanGate } from '@/hooks/usePlanGate';
import { mock } from '@/lib/mock';
import { PLAN_TIERS, hasAccess } from '@/lib/plans';
import { formatRelativeTime, cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function CommandsPage() {
  const [data, setData] = useState(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [renameTarget, setRenameTarget] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  // Mock current plan = silver للسماح بـ rename
  const currentPlan = PLAN_TIERS.SILVER;
  const renamePlanGate = usePlanGate('commandsRename', currentPlan);

  useEffect(() => {
    mock.commandsList().then(setData);
  }, []);

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.commands.filter((cmd) => {
      if (activeCategory !== 'all' && cmd.category !== activeCategory) return false;
      if (
        search &&
        !cmd.name.toLowerCase().includes(search.toLowerCase()) &&
        !cmd.nameAr.includes(search)
      )
        return false;
      return true;
    });
  }, [data, activeCategory, search]);

  const handleToggle = (cmdId) => {
    setData((prev) => ({
      ...prev,
      commands: prev.commands.map((c) =>
        c.id === cmdId ? { ...c, enabled: !c.enabled } : c,
      ),
    }));
  };

  const handleRename = () => {
    if (!renameValue.trim()) return;
    setData((prev) => ({
      ...prev,
      commands: prev.commands.map((c) =>
        c.id === renameTarget.id ? { ...c, customName: renameValue.trim() } : c,
      ),
    }));
    toast.success('تم تغيير اسم الأمر');
    setRenameTarget(null);
    setRenameValue('');
  };

  const handleResetName = (cmd) => {
    setData((prev) => ({
      ...prev,
      commands: prev.commands.map((c) =>
        c.id === cmd.id ? { ...c, customName: null } : c,
      ),
    }));
    toast.success('تم استرجاع الاسم الأصلي');
  };

  const handleEnableAll = () => {
    setData((prev) => ({
      ...prev,
      commands: prev.commands.map((c) =>
        (activeCategory === 'all' || c.category === activeCategory)
          ? { ...c, enabled: true }
          : c,
      ),
    }));
    toast.success('تم تفعيل كل الأوامر');
  };

  const stats = useMemo(() => {
    if (!data) return { total: 0, enabled: 0, locked: 0 };
    return {
      total: data.commands.length,
      enabled: data.commands.filter((c) => c.enabled).length,
      locked: data.commands.filter((c) => !hasAccess(currentPlan, c.plan)).length,
    };
  }, [data]);

  return (
    <>
      <SettingsPageHeader
        icon={<Terminal />}
        title="الأوامر"
        description="إدارة وتخصيص أوامر البوت"
        actions={
          <Button variant="outline" size="sm" onClick={handleEnableAll}>
            <CheckCheck className="w-4 h-4" />
            تفعيل الكل
          </Button>
        }
      />

      {/* Stats */}
      {data && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Card className="p-4">
            <div className="text-xs text-muted-foreground mb-1">المجموع</div>
            <div className="text-2xl font-bold num">{stats.total}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground mb-1">المفعّلة</div>
            <div className="text-2xl font-bold num text-emerald-500">{stats.enabled}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground mb-1">مقفولة بالخطة</div>
            <div className="text-2xl font-bold num text-amber-500">{stats.locked}</div>
          </Card>
        </div>
      )}

      {/* Search */}
      <Card className="p-4 mb-4">
        <div className="relative">
          <Search className="absolute end-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث في الأوامر..."
            className="pe-10"
          />
        </div>
      </Card>

      {/* Categories */}
      {data && (
        <Tabs value={activeCategory} onValueChange={setActiveCategory} className="mb-4">
          <TabsList variant="underline" className="overflow-x-auto flex-nowrap">
            <TabsTrigger value="all" variant="underline">
              الكل
            </TabsTrigger>
            {data.categories.map((cat) => (
              <TabsTrigger key={cat.id} value={cat.id} variant="underline">
                <span className="me-1">{cat.icon}</span>
                {cat.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      {/* Commands Grid */}
      {!data ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-5">
          <EmptyState icon={<Terminal />} title="لا توجد أوامر" description="جرب فلتر أو بحث آخر" />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((cmd) => {
            const isLocked = !hasAccess(currentPlan, cmd.plan);
            const displayName = cmd.customName || cmd.nameAr;

            return (
              <Card
                key={cmd.id}
                className={cn(
                  'p-4 transition-all',
                  isLocked && 'opacity-60',
                  !cmd.enabled && !isLocked && 'opacity-70',
                )}
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <code className="font-mono text-sm font-bold ltr">/{cmd.name}</code>
                      <span className="text-sm text-muted-foreground">→</span>
                      <span className="font-bold text-sm">{displayName}</span>
                      {cmd.customName && (
                        <Badge variant="lyn" size="sm">
                          مخصص
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {cmd.description}
                    </p>
                  </div>

                  <PlanBadge plan={cmd.plan} size="sm" />
                </div>

                <div className="flex items-center justify-between gap-2 pt-3 border-t border-border">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>
                      <span className="num font-semibold">{cmd.usage}</span> استخدام
                    </span>
                    <span>•</span>
                    <span>{formatRelativeTime(cmd.lastUsed)}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Rename */}
                    <QuickTooltip content="تغيير الاسم (Silver+)">
                      <button
                        onClick={renamePlanGate.gateAction(() => {
                          setRenameTarget(cmd);
                          setRenameValue(cmd.customName || '');
                        })}
                        className="w-8 h-8 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </QuickTooltip>

                    {/* Reset name */}
                    {cmd.customName && (
                      <QuickTooltip content="استرجاع الاسم الأصلي">
                        <button
                          onClick={() => handleResetName(cmd)}
                          className="w-8 h-8 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      </QuickTooltip>
                    )}

                    {/* Toggle */}
                    {isLocked ? (
                      <QuickTooltip content="مقفول بالخطة الحالية">
                        <div className="px-2 py-1 rounded-md bg-muted text-xs flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          مقفول
                        </div>
                      </QuickTooltip>
                    ) : (
                      <Switch
                        checked={cmd.enabled}
                        onCheckedChange={() => handleToggle(cmd.id)}
                        size="sm"
                      />
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Rename Dialog */}
      <Dialog open={!!renameTarget} onOpenChange={() => setRenameTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تغيير اسم الأمر</DialogTitle>
            <DialogDescription>
              الاسم الأصلي:{' '}
              <code className="font-mono ltr">/{renameTarget?.name}</code>
            </DialogDescription>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            placeholder="الاسم الجديد..."
            maxLength={32}
            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameTarget(null)} className="flex-1">
              إلغاء
            </Button>
            <Button onClick={handleRename} disabled={!renameValue.trim()} className="flex-1">
              <Edit3 className="w-4 h-4" />
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PlanLockModal {...renamePlanGate.lockModalProps} />
    </>
  );
}

import { useEffect, useState, useMemo } from 'react';
import {
  History,
  Download,
  Search,
  Filter,
  RotateCcw,
  PartyPopper,
  Shield,
  ScrollText,
  Bot,
  ToggleRight,
  Trash2,
  Ticket,
  Gavel,
  ArrowLeftRight,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { SettingsPageHeader } from '@/components/shared/SettingsPageHeader';
import { PlanLockBanner } from '@/components/shared/PlanLockOverlay';
import { EmptyState } from '@/components/shared/EmptyState';
import { usePlanGate } from '@/hooks/usePlanGate';
import { mock } from '@/lib/mock';
import { PLAN_TIERS } from '@/lib/plans';
import { formatRelativeTime, formatDate, cn } from '@/lib/utils';
import { toast } from 'sonner';

const ICONS = {
  party: PartyPopper,
  shield: Shield,
  logs: ScrollText,
  bot: Bot,
  roles: ToggleRight,
  trash: Trash2,
  ticket: Ticket,
  gavel: Gavel,
};

const ICON_COLORS = {
  party: 'bg-pink-500/10 text-pink-500',
  shield: 'bg-rose-500/10 text-rose-500',
  logs: 'bg-blue-500/10 text-blue-500',
  bot: 'bg-violet-500/10 text-violet-500',
  roles: 'bg-amber-500/10 text-amber-500',
  trash: 'bg-destructive/10 text-destructive',
  ticket: 'bg-cyan-500/10 text-cyan-500',
  gavel: 'bg-emerald-500/10 text-emerald-500',
};

export default function AuditLogPage() {
  const [logs, setLogs] = useState(null);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  const planGate = usePlanGate('auditLog', PLAN_TIERS.GOLD);

  useEffect(() => {
    mock.auditLog().then(setLogs);
  }, []);

  // قائمة الأنواع المتاحة
  const actionTypes = useMemo(() => {
    if (!logs) return [];
    const unique = [...new Set(logs.map((l) => l.action))];
    return unique.map((a) => ({
      id: a,
      label: logs.find((l) => l.action === a).label,
    }));
  }, [logs]);

  const filtered = useMemo(() => {
    if (!logs) return [];
    return logs.filter((l) => {
      if (actionFilter !== 'all' && l.action !== actionFilter) return false;
      if (
        search &&
        !l.username.toLowerCase().includes(search.toLowerCase()) &&
        !l.target.toLowerCase().includes(search.toLowerCase())
      )
        return false;
      return true;
    });
  }, [logs, actionFilter, search]);

  const handleExport = () => {
    toast.success('تم تصدير السجل (CSV)');
  };

  const handleRevert = (log) => {
    toast.success(`تم التراجع عن: ${log.label}`);
    setLogs((prev) => prev.filter((l) => l.id !== log.id));
  };

  return (
    <>
      <SettingsPageHeader
        icon={<History />}
        title="سجل الأنشطة"
        description="كل تغيير في الداش بورد محفوظ هنا"
        plan="gold"
        actions={
          <Button variant="outline" size="sm" onClick={handleExport} disabled={planGate.isLocked}>
            <Download className="w-4 h-4" />
            تصدير CSV
          </Button>
        }
      />

      {planGate.isLocked && (
        <PlanLockBanner
          currentPlan={planGate.currentPlan}
          requiredPlan={planGate.requiredPlan}
          featureName="سجل الأنشطة"
          className="mb-6"
        />
      )}

      {/* Filters */}
      <Card className="p-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute end-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث بالمستخدم أو الهدف..."
              className="pe-10"
            />
          </div>

          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="sm:w-56">
              <Filter className="w-4 h-4 me-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الإجراءات</SelectItem>
              {actionTypes.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Timeline */}
      {!logs ? (
        <Card className="p-5 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="p-5">
          <EmptyState
            icon={<History />}
            title="لا توجد نتائج"
            description={search || actionFilter !== 'all' ? 'جرب فلتر مختلف' : 'لم يتم تسجيل أي نشاط بعد'}
          />
        </Card>
      ) : (
        <Card className="p-5">
          <div className="space-y-3">
            {filtered.map((log) => {
              const Icon = ICONS[log.icon] || History;
              return (
                <div
                  key={log.id}
                  className="flex items-start gap-3 p-3 rounded-xl border border-border hover:border-border/80 transition-colors"
                >
                  <div
                    className={cn(
                      'w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0',
                      ICON_COLORS[log.icon] || 'bg-muted',
                    )}
                  >
                    <Icon className="w-5 h-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 flex-wrap mb-1">
                      <span className="font-medium text-sm">{log.username}</span>
                      <span className="text-sm text-muted-foreground">{log.label}</span>
                      <Badge variant="default" size="sm">
                        {log.target}
                      </Badge>
                    </div>

                    {/* Diff */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2 flex-wrap">
                      <code className="px-1.5 py-0.5 rounded bg-destructive/10 text-destructive ltr">
                        {log.changes.before.enabled ? 'مفعّل' : 'معطّل'}
                      </code>
                      <ArrowLeftRight className="w-3 h-3" />
                      <code className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 ltr">
                        {log.changes.after.enabled ? 'مفعّل' : 'معطّل'}
                      </code>
                    </div>

                    <div className="text-xs text-muted-foreground" title={formatDate(log.createdAt, { hour: '2-digit', minute: '2-digit' })}>
                      {formatRelativeTime(log.createdAt)}
                    </div>
                  </div>

                  {log.reversible && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRevert(log)}
                      className="flex-shrink-0"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      تراجع
                    </Button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between mt-4 pt-3 border-t border-border text-xs text-muted-foreground">
            <span>
              <span className="num">{filtered.length}</span> من <span className="num">{logs.length}</span> سجل
            </span>
          </div>
        </Card>
      )}
    </>
  );
}

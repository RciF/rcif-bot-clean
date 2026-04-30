import { useEffect, useState, useMemo } from 'react';
import {
  Users,
  Search,
  Filter,
  AlertTriangle,
  TrendingUp,
  Calendar,
  MoreVertical,
  Trash2,
  UserMinus,
  Hammer,
  MessageCircle,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Skeleton, SkeletonRow } from '@/components/ui/Skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
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
import { formatRelativeTime, intToHexColor, cn } from '@/lib/utils';
import { toast } from 'sonner';

const FILTER_OPTIONS = [
  { id: 'all', label: 'الكل' },
  { id: 'online', label: 'المتصلون' },
  { id: 'warned', label: 'لديهم تحذيرات' },
  { id: 'staff', label: 'الستاف' },
];

export default function MembersPage() {
  const [members, setMembers] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState([]);
  const [bulkAction, setBulkAction] = useState(null);

  const planGate = usePlanGate('membersHub', PLAN_TIERS.SILVER);

  useEffect(() => {
    mock.membersList().then(setMembers);
  }, []);

  const filtered = useMemo(() => {
    if (!members) return [];
    return members.filter((m) => {
      if (search && !m.username.toLowerCase().includes(search.toLowerCase())) return false;
      if (filter === 'online' && !m.isOnline) return false;
      if (filter === 'warned' && m.warnings === 0) return false;
      if (filter === 'staff' && !['مشرف', 'إداري'].includes(m.topRoleName)) return false;
      return true;
    });
  }, [members, search, filter]);

  const toggleSelect = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const toggleAll = () => {
    if (selected.length === filtered.length) setSelected([]);
    else setSelected(filtered.map((m) => m.id));
  };

  const executeBulk = () => {
    const labels = {
      kick: 'طرد',
      ban: 'حظر',
      message: 'إرسال رسالة DM',
    };
    toast.success(`تم تنفيذ ${labels[bulkAction]} على ${selected.length} عضو`);
    setSelected([]);
    setBulkAction(null);
  };

  return (
    <>
      <SettingsPageHeader
        icon={<Users />}
        title="الأعضاء"
        description="إدارة كل أعضاء سيرفرك من مكان واحد"
        plan="silver"
        actions={
          selected.length > 0 ? (
            <>
              <Badge variant="lyn" size="default">
                {selected.length} محدد
              </Badge>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setBulkAction('message')}
                disabled={planGate.isLocked}
              >
                <MessageCircle className="w-4 h-4" />
                رسالة
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setBulkAction('kick')}
                className="text-amber-500 border-amber-500/30 hover:bg-amber-500/10"
              >
                <UserMinus className="w-4 h-4" />
                طرد
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setBulkAction('ban')}
                className="text-destructive border-destructive/30 hover:bg-destructive/10"
              >
                <Hammer className="w-4 h-4" />
                حظر
              </Button>
            </>
          ) : null
        }
      />

      {planGate.isLocked && (
        <PlanLockBanner
          currentPlan={planGate.currentPlan}
          requiredPlan={planGate.requiredPlan}
          featureName="إدارة الأعضاء"
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
              placeholder="بحث بالاسم أو ID..."
              className="pe-10"
            />
          </div>

          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="sm:w-48">
              <Filter className="w-4 h-4 me-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FILTER_OPTIONS.map((opt) => (
                <SelectItem key={opt.id} value={opt.id}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Table */}
      <Card className="p-5">
        {!members ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Users />}
            title="لا توجد نتائج"
            description="جرب فلتر مختلف أو ابحث بكلمات أخرى"
          />
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 px-3 py-2 mb-2 border-b border-border text-xs font-semibold text-muted-foreground">
              <input
                type="checkbox"
                checked={selected.length === filtered.length && filtered.length > 0}
                onChange={toggleAll}
                className="w-4 h-4 rounded accent-primary"
              />
              <div className="flex-1">العضو</div>
              <div className="w-24 hidden sm:block">الرتبة</div>
              <div className="w-20 hidden md:block text-center">XP</div>
              <div className="w-16 hidden md:block text-center">تحذير</div>
              <div className="w-24 hidden lg:block">آخر نشاط</div>
              <div className="w-9"></div>
            </div>

            {/* Rows */}
            <div className="space-y-1">
              {filtered.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                    selected.includes(m.id) ? 'bg-primary/5' : 'hover:bg-accent/50',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(m.id)}
                    onChange={() => toggleSelect(m.id)}
                    className="w-4 h-4 rounded accent-primary"
                  />

                  {/* Avatar + Username */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-bold text-xs text-muted-foreground">
                        {m.username[0]}
                      </div>
                      {m.isOnline && (
                        <div className="absolute bottom-0 left-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-background" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{m.username}</div>
                      <div className="text-xs text-muted-foreground truncate ltr">
                        ID: {m.id.slice(-6)}
                      </div>
                    </div>
                  </div>

                  {/* Top Role */}
                  <div className="w-24 hidden sm:block">
                    <span
                      className="inline-block px-2 py-0.5 rounded-md text-xs font-medium"
                      style={{
                        background: intToHexColor(m.topRoleColor) + '20',
                        color: intToHexColor(m.topRoleColor),
                      }}
                    >
                      @{m.topRoleName}
                    </span>
                  </div>

                  {/* XP */}
                  <div className="w-20 hidden md:block text-center">
                    <div className="text-sm font-bold lyn-text-gradient num">{m.level}</div>
                    <div className="text-[10px] text-muted-foreground num">{m.xp.toLocaleString()} XP</div>
                  </div>

                  {/* Warnings */}
                  <div className="w-16 hidden md:block text-center">
                    {m.warnings > 0 ? (
                      <Badge variant="warning" size="sm">
                        <AlertTriangle className="w-3 h-3" />
                        {m.warnings}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </div>

                  {/* Last Active */}
                  <div className="w-24 hidden lg:block text-xs text-muted-foreground">
                    {formatRelativeTime(m.lastActive)}
                  </div>

                  {/* Actions */}
                  <button
                    className="w-9 h-9 rounded-lg hover:bg-accent flex items-center justify-center text-muted-foreground transition-colors"
                    aria-label="إجراءات"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-border text-xs text-muted-foreground">
              <span>
                <span className="num">{filtered.length}</span> من <span className="num">{members.length}</span> عضو
              </span>
              {selected.length > 0 && (
                <button
                  onClick={() => setSelected([])}
                  className="text-primary hover:underline"
                >
                  إلغاء التحديد
                </button>
              )}
            </div>
          </>
        )}
      </Card>

      {/* Bulk Confirm */}
      <Dialog open={!!bulkAction} onOpenChange={() => setBulkAction(null)}>
        <DialogContent>
          <div className="flex justify-center -mt-4 mb-2">
            <div className={cn(
              'w-16 h-16 rounded-2xl flex items-center justify-center',
              bulkAction === 'ban' && 'bg-destructive/10 text-destructive',
              bulkAction === 'kick' && 'bg-amber-500/10 text-amber-500',
              bulkAction === 'message' && 'bg-violet-500/10 text-violet-500',
            )}>
              {bulkAction === 'ban' && <Hammer className="w-8 h-8" />}
              {bulkAction === 'kick' && <UserMinus className="w-8 h-8" />}
              {bulkAction === 'message' && <MessageCircle className="w-8 h-8" />}
            </div>
          </div>
          <DialogHeader>
            <DialogTitle className="text-center">
              {bulkAction === 'ban' && 'حظر جماعي؟'}
              {bulkAction === 'kick' && 'طرد جماعي؟'}
              {bulkAction === 'message' && 'رسالة جماعية؟'}
            </DialogTitle>
            <DialogDescription className="text-center">
              راح يتم تنفيذ هذا الإجراء على{' '}
              <span className="font-bold text-foreground num">{selected.length}</span> عضو
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkAction(null)} className="flex-1">
              إلغاء
            </Button>
            <Button
              onClick={executeBulk}
              className={cn(
                'flex-1',
                bulkAction === 'ban' && 'bg-destructive hover:bg-destructive/90 text-destructive-foreground',
              )}
            >
              نعم، تنفيذ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

import { useEffect, useState, useMemo } from 'react';
import {
  History,
  Download,
  Search,
  Filter,
  PartyPopper,
  Shield,
  ScrollText,
  Bot,
  ToggleRight,
  Trash2,
  Ticket,
  Gavel,
  Coins,
  TrendingUp,
  Sparkles,
  Terminal,
  CalendarDays,
  Clock,
  Settings as SettingsIcon,
  ServerCrash,
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
import { useGuildStore } from '@/store/guildStore';
import { settingsApi } from '@/api';
import { PLAN_TIERS } from '@/lib/plans';
import { formatRelativeTime, formatDate, cn } from '@/lib/utils';
import { toast } from 'sonner';

// ════════════════════════════════════════════════════════════
//  ACTION CATEGORY MAP
//  الـ action يجي بصيغة "welcome.update", "protection.toggle"
//  نأخذ البادئة (قبل النقطة) لتحديد الأيقونة والصنف
// ════════════════════════════════════════════════════════════

const CATEGORY_CONFIG = {
  welcome:    { icon: PartyPopper,  color: 'bg-pink-500/10 text-pink-500',         label: 'الترحيب' },
  protection: { icon: Shield,       color: 'bg-rose-500/10 text-rose-500',         label: 'الحماية' },
  logs:       { icon: ScrollText,   color: 'bg-blue-500/10 text-blue-500',         label: 'السجلات' },
  ai:         { icon: Bot,          color: 'bg-violet-500/10 text-violet-500',     label: 'الذكاء الاصطناعي' },
  xp:         { icon: TrendingUp,   color: 'bg-emerald-500/10 text-emerald-500',   label: 'المستويات' },
  economy:    { icon: Coins,        color: 'bg-amber-500/10 text-amber-500',       label: 'الاقتصاد' },
  tickets:    { icon: Ticket,       color: 'bg-cyan-500/10 text-cyan-500',         label: 'التذاكر' },
  moderation: { icon: Gavel,        color: 'bg-orange-500/10 text-orange-500',     label: 'الإشراف' },
  warnings:   { icon: Gavel,        color: 'bg-orange-500/10 text-orange-500',     label: 'التحذيرات' },
  bans:       { icon: Gavel,        color: 'bg-red-500/10 text-red-500',           label: 'الحظر' },
  mutes:      { icon: Gavel,        color: 'bg-yellow-500/10 text-yellow-500',     label: 'الكتم' },
  'role-panels': { icon: ToggleRight, color: 'bg-purple-500/10 text-purple-500',   label: 'لوحات الرتب' },
  events:     { icon: CalendarDays, color: 'bg-pink-500/10 text-pink-500',         label: 'الفعاليات' },
  scheduler:  { icon: Clock,        color: 'bg-indigo-500/10 text-indigo-500',     label: 'المُجدول' },
  embed:      { icon: Sparkles,     color: 'bg-violet-500/10 text-violet-500',     label: 'الإيمبيد' },
  commands:   { icon: Terminal,     color: 'bg-slate-500/10 text-slate-400',       label: 'الأوامر' },
  prefix:     { icon: Terminal,     color: 'bg-slate-500/10 text-slate-400',       label: 'البريفكس' },
};

const ACTION_LABELS = {
  update:      'حدّث',
  toggle:      'بدّل تفعيل',
  enable:      'فعّل',
  disable:     'عطّل',
  delete:      'حذف',
  delete_all:  'مسح الكل',
  reset:       'إعادة ضبط',
  reset_all:   'إعادة ضبط الكل',
  create:      'أنشأ',
  send:        'أرسل',
  template_save:   'حفظ قالب',
  template_delete: 'حذف قالب',
  panel_deploy:    'نشر لوحة',
  give:        'منح',
  unban:       'فك حظر',
  unmute:      'فك كتم',
  lockdown:    'إغلاق',
  unlock:      'فتح',
  link:        'ربط',
  unlink:      'فك ربط',
  approve:     'قبول',
  reject:      'رفض',
};

const FALLBACK_CATEGORY = {
  icon: SettingsIcon,
  color: 'bg-muted text-muted-foreground',
  label: 'إعدادات',
};

/**
 * تحويل action key إلى عرض بشري
 *   "welcome.update" → { category: "welcome", actionLabel: "حدّث الترحيب" }
 *   "protection.lockdown" → { category: "protection", actionLabel: "إغلاق الحماية" }
 */
function parseAction(action) {
  if (!action || typeof action !== 'string') {
    return { category: null, actionLabel: action || 'غير معروف' };
  }
  const [categoryKey, actionKey] = action.split('.');
  const category = CATEGORY_CONFIG[categoryKey];
  const verb = ACTION_LABELS[actionKey] || actionKey || '';

  const actionLabel = category
    ? `${verb} ${category.label}`.trim()
    : action;

  return {
    category: category || FALLBACK_CATEGORY,
    categoryKey,
    actionLabel,
  };
}

// ════════════════════════════════════════════════════════════
//  CSV Export
// ════════════════════════════════════════════════════════════

function exportToCSV(logs) {
  const header = ['Date', 'User', 'Action', 'Target', 'Old Value', 'New Value'];
  const rows = logs.map((l) => [
    new Date(l.created_at).toISOString(),
    l.username || l.user_id,
    l.action,
    l.target || '',
    l.old_value ? JSON.stringify(l.old_value).replace(/"/g, '""') : '',
    l.new_value ? JSON.stringify(l.new_value).replace(/"/g, '""') : '',
  ]);

  const csv = [header, ...rows]
    .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  // إضافة BOM عشان Excel يفتح UTF-8 بشكل صحيح
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ════════════════════════════════════════════════════════════
//  PAGE
// ════════════════════════════════════════════════════════════

export default function AuditLogPage() {
  const { selectedGuildId } = useGuildStore();
  const [logs, setLogs] = useState(null);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [error, setError] = useState(null);

  const planGate = usePlanGate('auditLog', PLAN_TIERS.GOLD);

  // ─── Load logs ───
  useEffect(() => {
    if (!selectedGuildId) {
      setLogs([]);
      return;
    }

    let mounted = true;
    setLogs(null);
    setError(null);

    settingsApi
      .auditLog(selectedGuildId, { limit: 200 })
      .then((data) => {
        if (!mounted) return;
        setLogs(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (!mounted) return;
        // 403 PLAN_REQUIRED - الباك اند يطلب خطة GOLD
        if (err.code === 'PLAN_REQUIRED') {
          setLogs([]);
          // لا نظهر toast — الـ PlanLockBanner يعرض الرسالة
        } else {
          setError(err);
          setLogs([]);
          toast.error(err.message || 'فشل تحميل السجل');
        }
      });

    return () => { mounted = false; };
  }, [selectedGuildId]);

  // ─── Action types المتاحة (للفلتر) ───
  const actionTypes = useMemo(() => {
    if (!logs?.length) return [];
    const unique = [...new Set(logs.map((l) => l.action).filter(Boolean))];
    return unique.map((a) => {
      const { actionLabel } = parseAction(a);
      return { id: a, label: actionLabel };
    }).sort((a, b) => a.label.localeCompare(b.label, 'ar'));
  }, [logs]);

  // ─── Filtered logs ───
  const filtered = useMemo(() => {
    if (!logs) return [];
    return logs.filter((l) => {
      if (actionFilter !== 'all' && l.action !== actionFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const matches =
          (l.username || '').toLowerCase().includes(q) ||
          (l.user_id || '').toLowerCase().includes(q) ||
          (l.target || '').toLowerCase().includes(q) ||
          (l.action || '').toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [logs, actionFilter, search]);

  const handleExport = () => {
    if (!filtered.length) {
      toast.error('لا توجد بيانات للتصدير');
      return;
    }
    try {
      exportToCSV(filtered);
      toast.success(`تم تصدير ${filtered.length} سجل (CSV)`);
    } catch (err) {
      toast.error('فشل التصدير');
    }
  };

  // ─── Empty guild state ───
  if (!selectedGuildId) {
    return (
      <>
        <SettingsPageHeader
          icon={<History />}
          title="سجل الأنشطة"
          description="كل تغيير في الداش بورد محفوظ هنا"
          plan="gold"
        />
        <Card className="p-8">
          <EmptyState
            icon={<ServerCrash />}
            title="اختر سيرفر أولاً"
            description="ارجع لصفحة السيرفرات واختر سيرفر للاطلاع على سجله"
          />
        </Card>
      </>
    );
  }

  return (
    <>
      <SettingsPageHeader
        icon={<History />}
        title="سجل الأنشطة"
        description="كل تغيير في الداش بورد محفوظ هنا"
        plan="gold"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={planGate.isLocked || !filtered.length}
          >
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
              placeholder="بحث بالمستخدم أو الإجراء..."
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
      {logs === null ? (
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
            description={
              search || actionFilter !== 'all'
                ? 'جرب فلتر مختلف'
                : 'لم يتم تسجيل أي نشاط بعد — سيتم تسجيل التعديلات تلقائياً عند حفظ أي إعدادات'
            }
          />
        </Card>
      ) : (
        <Card className="p-5">
          <div className="space-y-3">
            {filtered.map((log) => {
              const { category, actionLabel } = parseAction(log.action);
              const Icon = category.icon;
              return (
                <div
                  key={log.id}
                  className="flex items-start gap-3 p-3 rounded-xl border border-border hover:border-border/80 transition-colors"
                >
                  <div
                    className={cn(
                      'w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0',
                      category.color,
                    )}
                  >
                    <Icon className="w-5 h-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 flex-wrap mb-1">
                      <span className="font-medium text-sm">
                        {log.username || `User ${log.user_id?.slice(0, 6) || '?'}`}
                      </span>
                      <span className="text-sm text-muted-foreground">{actionLabel}</span>
                      {log.target && (
                        <Badge variant="default" size="sm">
                          {log.target}
                        </Badge>
                      )}
                    </div>

                    {/* Action key (raw) — tiny, للمطورين */}
                    <div className="font-mono text-[10px] text-muted-foreground/60 ltr mb-1.5">
                      {log.action}
                    </div>

                    <div
                      className="text-xs text-muted-foreground"
                      title={formatDate(log.created_at, { hour: '2-digit', minute: '2-digit' })}
                    >
                      {formatRelativeTime(log.created_at)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between mt-4 pt-3 border-t border-border text-xs text-muted-foreground">
            <span>
              <span className="num">{filtered.length}</span> من{' '}
              <span className="num">{logs.length}</span> سجل
            </span>
            {logs.length === 200 && (
              <span className="text-muted-foreground/60">
                (آخر 200 إدخال)
              </span>
            )}
          </div>
        </Card>
      )}
    </>
  );
}
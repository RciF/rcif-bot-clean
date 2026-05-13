import { useState } from 'react';
import {
  UserPlus,
  Plus,
  Trash2,
  Clock,
  ShieldCheck,
  Bot as BotIcon,
  User as UserIcon,
  Users as UsersIcon,
  Info,
  AlertTriangle,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import { Input } from '@/components/ui/Input';
import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { Separator } from '@/components/ui/Separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { SettingsPageHeader } from '@/components/shared/SettingsPageHeader';
import { SaveBar } from '@/components/shared/SaveBar';
import { PlanLockBanner, PlanLockModal } from '@/components/shared/PlanLockOverlay';
import { EmptyState } from '@/components/shared/EmptyState';
import { RolePicker } from '@/components/shared/RolePicker';
import { QuickTooltip } from '@/components/ui/Tooltip';
import { useGuildSettings } from '@/hooks/useGuildSettings';
import { usePlanGate } from '@/hooks/usePlanGate';
import { useGuildResources } from '@/hooks/useGuildResources';
import { PLAN_TIERS } from '@/lib/plans';
import { settingsApi } from '@/api';
import { cn } from '@/lib/utils';

// ────────────────────────────────────────────────────────────
//  Type config
// ────────────────────────────────────────────────────────────

const TYPE_CONFIG = {
  human: {
    label: 'البشر فقط',
    icon: UserIcon,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    description: 'تُعطى للأعضاء العاديين فقط',
  },
  bot: {
    label: 'البوتات فقط',
    icon: BotIcon,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    description: 'تُعطى للبوتات فقط عند إضافتها',
  },
  both: {
    label: 'الكل',
    icon: UsersIcon,
    color: 'text-violet-500',
    bg: 'bg-violet-500/10',
    description: 'تُعطى لكل من ينضم (بشر + بوتات)',
  },
};

// ────────────────────────────────────────────────────────────
//  Page
// ────────────────────────────────────────────────────────────

export default function AutoRolePage() {
  const { data, setData, updateField, isLoading, isSaving, isDirty, save, reset } =
    useGuildSettings({
      section: 'auto-role',
      fetcher: settingsApi.getAutoRole,
      saver: settingsApi.saveAutoRole,
    });

  const planGate = usePlanGate('auto-role', PLAN_TIERS.SILVER);
  const { roles } = useGuildResources();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 rounded-2xl" />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (!data) return null;

  const handleSave = planGate.gateAction(save);

  const assignments = Array.isArray(data.assignments) ? data.assignments : [];

  // Helpers
  const addAssignment = (roleId, type = 'human') => {
    if (!roleId) return;

    // ما نسمح بنفس الرتبة + نفس النوع مرتين
    const exists = assignments.some(
      (a) => a.role_id === roleId && a.type === type,
    );
    if (exists) return;

    if (assignments.length >= 25) return; // حد أقصى

    updateField('assignments', [...assignments, { role_id: roleId, type }]);
  };

  const removeAssignment = (index) => {
    updateField(
      'assignments',
      assignments.filter((_, i) => i !== index),
    );
  };

  const updateAssignmentType = (index, type) => {
    updateField(
      'assignments',
      assignments.map((a, i) => (i === index ? { ...a, type } : a)),
    );
  };

  // الرتب اللي مش مضافة بعد (للـ picker)
  const usedRoleIds = new Set(assignments.map((a) => `${a.role_id}:${a.type}`));

  return (
    <>
      <SettingsPageHeader
        icon={<UserPlus />}
        title="الرتبة التلقائية"
        description="إعطاء رتب تلقائياً للأعضاء الجدد عند انضمامهم"
        plan="silver"
      />

      {planGate.isLocked && (
        <PlanLockBanner
          currentPlan={planGate.currentPlan}
          requiredPlan={planGate.requiredPlan}
          featureName="نظام الرتبة التلقائية"
          className="mb-6"
        />
      )}

      {/* ── Master Toggle ── */}
      <Card className="p-5 mb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div
              className={cn(
                'w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0',
                data.enabled ? 'lyn-gradient lyn-glow' : 'bg-muted',
              )}
            >
              <UserPlus
                className={cn(
                  'w-5 h-5',
                  data.enabled ? 'text-white' : 'text-muted-foreground',
                )}
              />
            </div>
            <div className="flex-1">
              <h3 className="font-bold mb-1">تفعيل الرتبة التلقائية</h3>
              <p className="text-sm text-muted-foreground">
                البوت يعطي الرتب المحددة تلقائياً لكل عضو جديد
              </p>
            </div>
          </div>
          <Switch
            checked={!!data.enabled}
            onCheckedChange={(v) => updateField('enabled', v)}
            size="lg"
          />
        </div>
      </Card>

      {/* ── Advanced Options ── */}
      <Card
        className={cn(
          'p-5 mb-4 space-y-4',
          !data.enabled && 'opacity-50 pointer-events-none',
        )}
      >
        <h3 className="font-bold text-sm flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          خيارات متقدمة
        </h3>

        {/* Delay */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <label className="text-sm font-medium">تأخير قبل الإعطاء</label>
              <QuickTooltip content="مفيد ضد Raids — البوت ينتظر قبل ما يعطي الرتب">
                <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
              </QuickTooltip>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                max={300}
                value={data.delay_seconds ?? 0}
                onChange={(e) =>
                  updateField(
                    'delay_seconds',
                    Math.max(0, Math.min(parseInt(e.target.value) || 0, 300)),
                  )
                }
                className="w-20 text-center"
              />
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                ثانية
              </span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            من 0 إلى 300 ثانية. لو في raid، البوت ينتظر فيقدر anti-raid يكتم/يطرد قبل ما تعطى الرتبة.
          </p>
        </div>

        <Separator />

        {/* Require Verified */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <h4 className="font-medium text-sm">يشترط التحقق</h4>
              <Badge variant="secondary" size="sm">
                Membership Screening
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              لو السيرفر يستخدم نظام التحقق من ديسكورد، البوت ينتظر يكمّل التحقق قبل ما يعطي الرتبة
            </p>
          </div>
          <Switch
            checked={!!data.require_verified}
            onCheckedChange={(v) => updateField('require_verified', v)}
          />
        </div>
      </Card>

      {/* ── Roles List ── */}
      <Card
        className={cn(
          'p-5',
          !data.enabled && 'opacity-50 pointer-events-none',
        )}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold mb-0.5">الرتب التلقائية</h3>
            <p className="text-xs text-muted-foreground">
              <span className="num font-semibold">{assignments.length}</span> من{' '}
              <span className="num">25</span> رتبة
            </p>
          </div>
        </div>

        {/* Empty state */}
        {assignments.length === 0 ? (
          <EmptyState
            icon={UserPlus}
            title="لا توجد رتب تلقائية"
            description="أضف رتبة من الأسفل لتعطى للأعضاء الجدد"
          />
        ) : (
          <div className="space-y-2 mb-4">
            {assignments.map((a, i) => {
              const role = roles?.find((r) => r.id === a.role_id);
              const typeConf = TYPE_CONFIG[a.type] || TYPE_CONFIG.human;
              const TypeIcon = typeConf.icon;

              return (
                <div
                  key={`${a.role_id}-${a.type}-${i}`}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  {/* Role color dot */}
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{
                      backgroundColor: role?.color
                        ? `#${role.color.toString(16).padStart(6, '0')}`
                        : '#99aab5',
                    }}
                  />

                  {/* Role name */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {role ? `@${role.name}` : (
                        <span className="text-destructive flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          رتبة محذوفة
                        </span>
                      )}
                    </div>
                    {role?.managed && (
                      <div className="text-[10px] text-amber-500 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        رتبة مُدارة — لن تعمل
                      </div>
                    )}
                  </div>

                  {/* Type selector */}
                  <Select
                    value={a.type}
                    onValueChange={(v) => updateAssignmentType(i, v)}
                  >
                    <SelectTrigger className="w-36">
                      <SelectValue>
                        <div className="flex items-center gap-2">
                          <TypeIcon className={cn('w-3.5 h-3.5', typeConf.color)} />
                          <span className="text-xs">{typeConf.label}</span>
                        </div>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TYPE_CONFIG).map(([key, conf]) => {
                        const Icon = conf.icon;
                        return (
                          <SelectItem key={key} value={key}>
                            <div className="flex items-center gap-2">
                              <Icon className={cn('w-3.5 h-3.5', conf.color)} />
                              <span>{conf.label}</span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>

                  {/* Delete */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeAssignment(i)}
                    className="text-destructive hover:bg-destructive/10 flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {/* Add row */}
        {assignments.length < 25 && (
          <AddRoleRow
            roles={roles || []}
            usedRoleIds={usedRoleIds}
            onAdd={addAssignment}
          />
        )}
      </Card>

      {/* ── Info card ── */}
      <Card className="p-4 mt-4 bg-blue-500/5 border-blue-500/20">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm space-y-1.5">
            <p className="font-medium">ملاحظات مهمة:</p>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc pr-4">
              <li>تأكد رتبة البوت أعلى من الرتب اللي ضفتها هنا</li>
              <li>الرتب المُدارة (لبوتات الدمج) لا يمكن إعطاؤها يدوياً</li>
              <li>البوت يحتاج صلاحية «إدارة الرتب» (Manage Roles)</li>
              <li>الحد الأقصى: 25 رتبة</li>
            </ul>
          </div>
        </div>
      </Card>

      <SaveBar
        isDirty={isDirty}
        isSaving={isSaving}
        onSave={handleSave}
        onReset={reset}
      />

      <PlanLockModal
        {...planGate.lockModalProps}
        featureName="نظام الرتبة التلقائية"
      />
    </>
  );
}

// ────────────────────────────────────────────────────────────
//  Add Role Row
// ────────────────────────────────────────────────────────────

function AddRoleRow({ roles, usedRoleIds, onAdd }) {
  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedType, setSelectedType] = useState('human');

  const handleAdd = () => {
    if (!selectedRole) return;
    // منع إضافة رتبة + نوع موجود مسبقاً
    if (usedRoleIds.has(`${selectedRole}:${selectedType}`)) return;
    onAdd(selectedRole, selectedType);
    setSelectedRole(null);
  };

  // تحقق هل الاختيار الحالي مستخدم؟
  const alreadyUsed =
    selectedRole && usedRoleIds.has(`${selectedRole}:${selectedType}`);

  return (
    <div className="border-t border-border pt-4 mt-2">
      <div className="text-xs font-medium text-muted-foreground mb-2">
        إضافة رتبة جديدة
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1">
          <RolePicker
            value={selectedRole}
            onChange={setSelectedRole}
            placeholder="اختر رتبة..."
            excludeManaged
            excludeEveryone
          />
        </div>
        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(TYPE_CONFIG).map(([key, conf]) => {
              const Icon = conf.icon;
              return (
                <SelectItem key={key} value={key}>
                  <div className="flex items-center gap-2">
                    <Icon className={cn('w-3.5 h-3.5', conf.color)} />
                    <span>{conf.label}</span>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        <Button
          onClick={handleAdd}
          disabled={!selectedRole || alreadyUsed}
          className="sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة</span>
        </Button>
      </div>
      {alreadyUsed && (
        <p className="text-xs text-amber-500 mt-2">
          هذه الرتبة مضافة مسبقاً بنفس النوع
        </p>
      )}
    </div>
  );
}
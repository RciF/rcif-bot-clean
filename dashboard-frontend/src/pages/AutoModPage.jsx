import { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Plus,
  Trash2,
  Link2,
  AtSign,
  Smile,
  Type,
  Copy as CopyIcon,
  Sparkles,
  AlertTriangle,
  Info,
  Filter as FilterIcon,
  Hash,
  Users as UsersIcon,
  Shield,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton';
import { Separator } from '@/components/ui/Separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { SettingsPageHeader } from '@/components/shared/SettingsPageHeader';
import { SaveBar } from '@/components/shared/SaveBar';
import { PlanLockBanner, PlanLockModal } from '@/components/shared/PlanLockOverlay';
import { EmptyState } from '@/components/shared/EmptyState';
import { ChannelPicker } from '@/components/shared/ChannelPicker';
import { RolePicker } from '@/components/shared/RolePicker';
import { useGuildSettings } from '@/hooks/useGuildSettings';
import { usePlanGate } from '@/hooks/usePlanGate';
import { useGuildStore } from '@/store/guildStore';
import { PLAN_TIERS } from '@/lib/plans';
import { apiClient } from '@/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ────────────────────────────────────────────────────────────
//  Filter definitions
// ────────────────────────────────────────────────────────────

const FILTER_DEFS = [
  {
    key: 'bad_words',
    label: 'الكلمات السيئة',
    description: 'كشف الكلمات المسيئة (عربي + إنجليزي)',
    icon: ShieldAlert,
    color: 'red',
    fields: [
      { key: 'use_default', type: 'boolean', label: 'استخدام القائمة الافتراضية', defaultValue: true },
    ],
  },
  {
    key: 'links',
    label: 'الروابط',
    description: 'منع الروابط الخارجية (مع whitelist)',
    icon: Link2,
    color: 'blue',
    fields: [
      { key: 'whitelist', type: 'tags', label: 'النطاقات المسموحة', placeholder: 'example.com', defaultValue: [] },
    ],
  },
  {
    key: 'invites',
    label: 'دعوات Discord',
    description: 'منع روابط دعوات Discord',
    icon: Hash,
    color: 'purple',
    fields: [],
  },
  {
    key: 'caps',
    label: 'الكابيتال',
    description: 'كشف النصوص بالكابيتال (الإنجليزية فقط)',
    icon: Type,
    color: 'amber',
    fields: [
      { key: 'threshold', type: 'number', label: 'نسبة الكابيتال %', min: 50, max: 100, defaultValue: 70 },
      { key: 'min_length', type: 'number', label: 'الحد الأدنى لطول النص', min: 5, max: 100, defaultValue: 10 },
    ],
  },
  {
    key: 'mass_mentions',
    label: 'منشن جماعي',
    description: 'منع المنشن الجماعي + @everyone',
    icon: AtSign,
    color: 'orange',
    fields: [
      { key: 'max', type: 'number', label: 'الحد الأقصى للمنشن', min: 2, max: 20, defaultValue: 5 },
    ],
  },
  {
    key: 'emojis',
    label: 'الإيموجي الزيادة',
    description: 'كشف الرسائل المليانة إيموجي',
    icon: Smile,
    color: 'yellow',
    fields: [
      { key: 'max', type: 'number', label: 'الحد الأقصى', min: 3, max: 50, defaultValue: 10 },
    ],
  },
  {
    key: 'duplicate',
    label: 'الرسائل المكررة',
    description: 'كشف نفس الرسالة عدة مرات',
    icon: CopyIcon,
    color: 'cyan',
    fields: [
      { key: 'max', type: 'number', label: 'عدد التكرارات', min: 2, max: 10, defaultValue: 3 },
      { key: 'min_length', type: 'number', label: 'الحد الأدنى للطول', min: 3, max: 50, defaultValue: 5 },
    ],
  },
  {
    key: 'zalgo',
    label: 'النصوص المشوهة',
    description: 'كشف نصوص zalgo (z̴͉a̷l̷g̸o̴)',
    icon: AlertTriangle,
    color: 'pink',
    fields: [
      { key: 'max', type: 'number', label: 'الحد الأقصى', min: 3, max: 50, defaultValue: 5 },
    ],
  },
];

// ────────────────────────────────────────────────────────────
//  Page
// ────────────────────────────────────────────────────────────

export default function AutoModPage() {
  const { selectedGuildId } = useGuildStore();
  const { data, updateField, isLoading, isSaving, isDirty, save, reset } =
    useGuildSettings({
      section: 'automod',
      fetcher: (g) => apiClient.get(`/api/guild/${g}/automod`),
      saver: (g, d) => apiClient.put(`/api/guild/${g}/automod`, d),
    });

  const planGate = usePlanGate('automod', PLAN_TIERS.SILVER);
  const [tab, setTab] = useState('filters');

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

  return (
    <>
      <SettingsPageHeader
        icon={<ShieldAlert />}
        title="الإشراف التلقائي"
        description="فلترة المحتوى المسيء تلقائياً + عقوبات تصاعدية"
        plan="silver"
      />

      {planGate.isLocked && (
        <PlanLockBanner
          currentPlan={planGate.currentPlan}
          requiredPlan={planGate.requiredPlan}
          featureName="نظام الإشراف التلقائي"
          className="mb-6"
        />
      )}

      {/* ── Master Toggle ── */}
      <Card className="p-5 mb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={cn(
              'w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0',
              data.enabled ? 'lyn-gradient lyn-glow' : 'bg-muted',
            )}>
              <ShieldAlert className={cn(
                'w-5 h-5',
                data.enabled ? 'text-white' : 'text-muted-foreground',
              )} />
            </div>
            <div className="flex-1">
              <h3 className="font-bold mb-1">تفعيل الإشراف التلقائي</h3>
              <p className="text-sm text-muted-foreground">
                البوت يحذف الرسائل المخالفة ويطبّق عقوبات تلقائية
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

      {/* ── Tabs ── */}
      <div className={cn(!data.enabled && 'opacity-50 pointer-events-none')}>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-4 w-full">
            <TabsTrigger value="filters" className="flex-1">
              <FilterIcon className="w-4 h-4 ml-1.5" />
              الفلاتر
            </TabsTrigger>
            <TabsTrigger value="words" className="flex-1">
              <Type className="w-4 h-4 ml-1.5" />
              الكلمات المخصصة
            </TabsTrigger>
            <TabsTrigger value="whitelist" className="flex-1">
              <Shield className="w-4 h-4 ml-1.5" />
              الاستثناءات
            </TabsTrigger>
            <TabsTrigger value="violations" className="flex-1">
              <AlertTriangle className="w-4 h-4 ml-1.5" />
              السجل
            </TabsTrigger>
          </TabsList>

          {/* ── Filters Tab ── */}
          <TabsContent value="filters" className="space-y-3">
            {/* Log channel */}
            <Card className="p-4">
              <label className="text-sm font-bold mb-2 block">قناة اللوق</label>
              <p className="text-xs text-muted-foreground mb-2">
                مكان إرسال إشعارات المخالفات
              </p>
              <ChannelPicker
                value={data.log_channel}
                onChange={(v) => updateField('log_channel', v)}
                placeholder="بدون لوق"
                type="text"
              />
            </Card>

            {/* All filters */}
            {FILTER_DEFS.map((def) => (
              <FilterCard
                key={def.key}
                def={def}
                config={data.filters?.[def.key] || {}}
                onChange={(newConfig) => {
                  updateField('filters', {
                    ...(data.filters || {}),
                    [def.key]: newConfig,
                  });
                }}
              />
            ))}
          </TabsContent>

          {/* ── Custom Words Tab ── */}
          <TabsContent value="words">
            <CustomWordsTab guildId={selectedGuildId} planGate={planGate} />
          </TabsContent>

          {/* ── Whitelist Tab ── */}
          <TabsContent value="whitelist" className="space-y-4">
            <WhitelistTab data={data} updateField={updateField} />
          </TabsContent>

          {/* ── Violations Tab ── */}
          <TabsContent value="violations">
            <ViolationsTab guildId={selectedGuildId} />
          </TabsContent>
        </Tabs>
      </div>

      <SaveBar
        isDirty={isDirty}
        isSaving={isSaving}
        onSave={handleSave}
        onReset={reset}
      />

      <PlanLockModal {...planGate.lockModalProps} featureName="الإشراف التلقائي" />
    </>
  );
}

// ────────────────────────────────────────────────────────────
//  Filter Card
// ────────────────────────────────────────────────────────────

function FilterCard({ def, config, onChange }) {
  const Icon = def.icon;
  const enabled = config.enabled === true;

  const updateConfig = (key, value) => {
    onChange({ ...config, [key]: value });
  };

  return (
    <Card className={cn(
      'p-4 transition-colors',
      enabled && 'border-primary/30',
    )}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
            enabled ? `bg-${def.color}-500/10` : 'bg-muted',
          )}>
            <Icon className={cn(
              'w-5 h-5',
              enabled ? `text-${def.color}-500` : 'text-muted-foreground',
            )} />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-sm">{def.label}</h4>
            <p className="text-xs text-muted-foreground">{def.description}</p>
          </div>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={(v) => updateConfig('enabled', v)}
        />
      </div>

      {/* Filter-specific fields */}
      {enabled && def.fields.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border space-y-3">
          {def.fields.map((field) => (
            <FilterField
              key={field.key}
              field={field}
              value={config[field.key] ?? field.defaultValue}
              onChange={(v) => updateConfig(field.key, v)}
            />
          ))}
        </div>
      )}
    </Card>
  );
}

// ────────────────────────────────────────────────────────────
//  Filter Field (number/boolean/tags)
// ────────────────────────────────────────────────────────────

function FilterField({ field, value, onChange }) {
  if (field.type === 'number') {
    return (
      <div className="flex items-center justify-between gap-3">
        <label className="text-xs font-medium">{field.label}</label>
        <Input
          type="number"
          min={field.min}
          max={field.max}
          value={value || field.defaultValue}
          onChange={(e) => {
            const v = Math.max(field.min, Math.min(parseInt(e.target.value) || field.defaultValue, field.max));
            onChange(v);
          }}
          className="w-24 text-center"
        />
      </div>
    );
  }

  if (field.type === 'boolean') {
    return (
      <div className="flex items-center justify-between gap-3">
        <label className="text-xs font-medium">{field.label}</label>
        <Switch checked={value === true} onCheckedChange={onChange} />
      </div>
    );
  }

  if (field.type === 'tags') {
    return <TagsField field={field} value={value || []} onChange={onChange} />;
  }

  return null;
}

function TagsField({ field, value, onChange }) {
  const [input, setInput] = useState('');
  const tags = Array.isArray(value) ? value : [];

  const add = () => {
    const v = input.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
    if (!v || tags.includes(v)) {
      setInput('');
      return;
    }
    onChange([...tags, v]);
    setInput('');
  };

  const remove = (t) => onChange(tags.filter((x) => x !== t));

  return (
    <div>
      <label className="text-xs font-medium block mb-1.5">{field.label}</label>
      <div className="flex gap-2 mb-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder={field.placeholder}
          className="flex-1"
        />
        <Button size="sm" variant="secondary" onClick={add} disabled={!input.trim()}>
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <Badge key={t} variant="secondary" className="gap-1">
              <span className="ltr">{t}</span>
              <button onClick={() => remove(t)} className="hover:text-destructive">
                <Trash2 className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
//  Custom Words Tab
// ────────────────────────────────────────────────────────────

function CustomWordsTab({ guildId, planGate }) {
  const [words, setWords] = useState(null);
  const [newWord, setNewWord] = useState('');
  const [adding, setAdding] = useState(false);

  const load = async () => {
    if (!guildId) return;
    try {
      const res = await apiClient.get(`/api/guild/${guildId}/automod/words`);
      setWords(res.words || []);
    } catch {
      setWords([]);
    }
  };

  useEffect(() => { load(); }, [guildId]);

  const add = planGate.gateAction(async () => {
    const w = newWord.trim();
    if (!w) return;
    setAdding(true);
    try {
      await apiClient.post(`/api/guild/${guildId}/automod/words`, { word: w, type: 'banned' });
      toast.success('تمت إضافة الكلمة');
      setNewWord('');
      load();
    } catch (err) {
      toast.error(err.message || 'فشلت الإضافة');
    } finally {
      setAdding(false);
    }
  });

  const remove = async (id) => {
    try {
      await apiClient.delete(`/api/guild/${guildId}/automod/words/${id}`);
      toast.success('تم الحذف');
      load();
    } catch (err) {
      toast.error(err.message || 'فشل الحذف');
    }
  };

  return (
    <Card className="p-4">
      <div className="mb-4">
        <h3 className="font-bold mb-1">كلمات مخصصة</h3>
        <p className="text-xs text-muted-foreground">
          أضف كلمات خاصة بسيرفرك. الكلمات الموجودة في القائمة الافتراضية تُحظر تلقائياً.
        </p>
      </div>

      {/* Add input */}
      <div className="flex gap-2 mb-4">
        <Input
          value={newWord}
          onChange={(e) => setNewWord(e.target.value.slice(0, 100))}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder="اكتب الكلمة..."
          maxLength={100}
          className="flex-1"
        />
        <Button onClick={add} disabled={!newWord.trim() || adding} loading={adding}>
          <Plus className="w-4 h-4" />
          <span>إضافة</span>
        </Button>
      </div>

      {/* List */}
      {words === null ? (
        <Skeleton className="h-32 rounded-xl" />
      ) : words.length === 0 ? (
        <EmptyState
          icon={Type}
          title="لا توجد كلمات مخصصة"
          description="أضف كلمات خاصة لتُحظر في سيرفرك"
        />
      ) : (
        <div className="space-y-1.5 max-h-96 overflow-y-auto">
          {words.map((w) => (
            <div key={w.id} className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Badge variant={w.type === 'banned' ? 'destructive' : 'secondary'} size="sm">
                  {w.type === 'banned' ? 'محظورة' : 'تحذير'}
                </Badge>
                <code className="text-sm truncate">{w.word}</code>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => remove(w.id)}
                className="text-destructive h-7 w-7"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 text-xs text-muted-foreground flex items-center gap-1.5">
        <Info className="w-3.5 h-3.5" />
        <span>الحد الأقصى: 500 كلمة • <span className="num">{words?.length || 0}</span> مضافة</span>
      </div>
    </Card>
  );
}

// ────────────────────────────────────────────────────────────
//  Whitelist Tab
// ────────────────────────────────────────────────────────────

function WhitelistTab({ data, updateField }) {
  const wl = data.whitelist || { roles: [], channels: [], users: [] };
  const updateWl = (key, value) => {
    updateField('whitelist', { ...wl, [key]: value });
  };

  return (
    <>
      <Card className="p-4">
        <h3 className="font-bold mb-1 flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-500" />
          رتب مستثناة
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          الأعضاء اللي عندهم هذي الرتب لن يتأثروا بالإشراف التلقائي
        </p>
        <MultiPicker
          type="role"
          values={wl.roles}
          onChange={(v) => updateWl('roles', v)}
          placeholder="اختر رتبة..."
        />
      </Card>

      <Card className="p-4">
        <h3 className="font-bold mb-1 flex items-center gap-2">
          <Hash className="w-4 h-4 text-blue-500" />
          قنوات مستثناة
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          الرسائل في هذي القنوات لن تُفحص
        </p>
        <MultiPicker
          type="channel"
          values={wl.channels}
          onChange={(v) => updateWl('channels', v)}
          placeholder="اختر قناة..."
        />
      </Card>

      <Card className="p-4 bg-blue-500/5 border-blue-500/20">
        <div className="flex items-start gap-2 text-xs">
          <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-medium">ملاحظات:</p>
            <ul className="text-muted-foreground space-y-0.5 list-disc pr-4">
              <li>الأدمن والمشرفين (Manage Messages) مستثنون تلقائياً</li>
              <li>البوتات الأخرى مستثناة تلقائياً</li>
            </ul>
          </div>
        </div>
      </Card>
    </>
  );
}

function MultiPicker({ type, values, onChange, placeholder }) {
  const [current, setCurrent] = useState(null);

  const add = () => {
    if (!current || values.includes(current)) return;
    onChange([...values, current]);
    setCurrent(null);
  };

  const remove = (id) => onChange(values.filter((v) => v !== id));

  return (
    <div>
      <div className="flex gap-2 mb-2">
        <div className="flex-1">
          {type === 'role' ? (
            <RolePicker value={current} onChange={setCurrent} placeholder={placeholder} excludeEveryone />
          ) : (
            <ChannelPicker value={current} onChange={setCurrent} placeholder={placeholder} type="text" />
          )}
        </div>
        <Button size="sm" onClick={add} disabled={!current}>
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.map((id) => (
            <Badge key={id} variant="secondary" className="gap-1">
              {type === 'role' ? `<@&${id}>` : `<#${id}>`}
              <button onClick={() => remove(id)} className="hover:text-destructive">
                <Trash2 className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
//  Violations Tab
// ────────────────────────────────────────────────────────────

function ViolationsTab({ guildId }) {
  const [data, setData] = useState(null);

  const load = async () => {
    if (!guildId) return;
    try {
      const res = await apiClient.get(`/api/guild/${guildId}/automod/violations`);
      setData(res);
    } catch {
      setData({ violations: [], stats: { total: 0, last_24h: 0, last_7d: 0 } });
    }
  };

  useEffect(() => { load(); }, [guildId]);

  if (data === null) {
    return <Skeleton className="h-64 rounded-xl" />;
  }

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground mb-1">آخر 24 ساعة</div>
          <div className="text-2xl font-bold num text-amber-500">{data.stats.last_24h}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground mb-1">آخر 7 أيام</div>
          <div className="text-2xl font-bold num text-orange-500">{data.stats.last_7d}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground mb-1">إجمالي</div>
          <div className="text-2xl font-bold num">{data.stats.total}</div>
        </Card>
      </div>

      {/* List */}
      <Card className="p-4">
        <h3 className="font-bold mb-3">آخر المخالفات</h3>
        {data.violations.length === 0 ? (
          <EmptyState
            icon={AlertTriangle}
            title="لا توجد مخالفات"
            description="السيرفر نظيف! 🎉"
          />
        ) : (
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {data.violations.map((v) => (
              <div key={v.id} className="p-3 rounded-lg bg-muted/30 border border-border">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <code className="text-xs">{v.user_id}</code>
                    <Badge variant={v.action === 'mute' ? 'destructive' : 'secondary'} size="sm">
                      {v.action === 'mute' ? '🔇 كتم' : '⚠️ تحذير'}
                    </Badge>
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(v.created_at).toLocaleString('ar-SA')}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mb-1">{v.filter_type}</div>
                {v.content && (
                  <code className="text-[10px] block bg-background p-1.5 rounded mt-1 max-h-20 overflow-hidden">
                    {v.content.length > 200 ? v.content.slice(0, 200) + '...' : v.content}
                  </code>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}
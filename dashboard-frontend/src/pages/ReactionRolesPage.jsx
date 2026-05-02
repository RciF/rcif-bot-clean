import { useState, useEffect } from 'react';
import {
  ToggleRight,
  Plus,
  Edit3,
  Trash2,
  Hash,
  Users,
  Eye,
  X,
  Wand2,
  Palette,
  Send,
  ArrowRight,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { Separator } from '@/components/ui/Separator';
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
import { PlanLockBanner, PlanLockModal } from '@/components/shared/PlanLockOverlay';
import { EmptyState } from '@/components/shared/EmptyState';
import { ChannelPicker } from '@/components/shared/ChannelPicker';
import { RolePicker } from '@/components/shared/RolePicker';
import { EmojiPicker } from '@/components/shared/EmojiPicker';
import { usePlanGate } from '@/hooks/usePlanGate';
import { mock } from '@/lib/mock';
import { PLAN_TIERS } from '@/lib/plans';
import { formatRelativeTime, intToHexColor, hexToIntColor, cn } from '@/lib/utils';
import { toast } from 'sonner';

const STYLE_COLORS = {
  primary: '#5865F2',
  secondary: '#4F545C',
  success: '#2D7D46',
  danger: '#D83C3E',
};

const BUTTON_STYLES = [
  { value: 'primary', label: 'أزرق' },
  { value: 'secondary', label: 'رمادي' },
  { value: 'success', label: 'أخضر' },
  { value: 'danger', label: 'أحمر' },
];

const NEW_PANEL_DEFAULT = {
  title: 'لوحة جديدة',
  description: 'اضغط على الأزرار للحصول على الرتب',
  channelId: null,
  color: 0x9b59b6,
  exclusive: false,
  buttons: [],
};

export default function ReactionRolesPage() {
  const [panels, setPanels] = useState(null);
  const [editingPanel, setEditingPanel] = useState(null);
  const [previewPanel, setPreviewPanel] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const planGate = usePlanGate('reactionRoles', PLAN_TIERS.SILVER);

  useEffect(() => {
    mock.rolePanels().then(setPanels);
  }, []);

  const handleDelete = () => {
    setPanels((prev) => prev.filter((p) => p.id !== confirmDelete.id));
    setConfirmDelete(null);
    toast.success('تم حذف اللوحة');
  };

  const handleSavePanel = (panel) => {
    if (panel.id) {
      setPanels((prev) => prev.map((p) => (p.id === panel.id ? panel : p)));
      toast.success('تم حفظ التعديلات');
    } else {
      const newPanel = {
        ...panel,
        id: `panel-${Date.now()}`,
        messageId: `msg-${Date.now()}`,
        createdAt: new Date().toISOString(),
        channelName: 'جديد',
      };
      setPanels((prev) => [...prev, newPanel]);
      toast.success('تم إنشاء اللوحة');
    }
    setEditingPanel(null);
  };

  return (
    <>
      <SettingsPageHeader
        icon={<ToggleRight />}
        title="لوحات الرتب"
        description="لوحات تفاعلية للأعضاء لاختيار رتبهم"
        plan="silver"
        actions={
          <Button onClick={planGate.gateAction(() => setEditingPanel({ ...NEW_PANEL_DEFAULT }))}>
            <Plus className="w-4 h-4" />
            لوحة جديدة
          </Button>
        }
      />

      {planGate.isLocked && (
        <PlanLockBanner
          currentPlan={planGate.currentPlan}
          requiredPlan={planGate.requiredPlan}
          featureName="لوحات الرتب"
          className="mb-6"
        />
      )}

      {!panels ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : panels.length === 0 ? (
        <Card className="p-5">
          <EmptyState
            icon={<ToggleRight />}
            title="لا توجد لوحات بعد"
            description="ابدأ بإنشاء لوحة رتب جديدة عشان الأعضاء يقدرون يختارون رتبهم"
            action={
              <Button onClick={planGate.gateAction(() => setEditingPanel({ ...NEW_PANEL_DEFAULT }))}>
                <Plus className="w-4 h-4" />
                إنشاء أول لوحة
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {panels.map((panel) => (
            <Card key={panel.id} className="p-5 hover:border-border/80 transition-colors">
              <div className="flex items-start gap-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: intToHexColor(panel.color) + '20', color: intToHexColor(panel.color) }}
                >
                  <ToggleRight className="w-6 h-6" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-bold">{panel.title}</h3>
                    <Badge variant="default" size="sm">
                      <Users className="w-3 h-3" />
                      <span className="num">{panel.buttons.length}</span> رتب
                    </Badge>
                    {panel.exclusive && <Badge variant="warning" size="sm">حصري</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-1 mb-2">{panel.description}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1">
                      <Hash className="w-3 h-3" />
                      {panel.channelName}
                    </span>
                    <span>•</span>
                    <span>منذ {formatRelativeTime(panel.createdAt)}</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {panel.buttons.slice(0, 5).map((btn, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-white"
                        style={{ background: STYLE_COLORS[btn.style] }}
                      >
                        <span>{btn.emoji}</span>
                        <span>{btn.label}</span>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => setPreviewPanel(panel)}>
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={planGate.gateAction(() => setEditingPanel(panel))}>
                    <Edit3 className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(panel)} className="hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <PlanLockModal {...planGate.lockModalProps} />

      {/* Designer Modal */}
      {editingPanel && (
        <PanelDesigner
          panel={editingPanel}
          onSave={handleSavePanel}
          onClose={() => setEditingPanel(null)}
        />
      )}

      {/* Preview Modal */}
      <Dialog open={!!previewPanel} onOpenChange={() => setPreviewPanel(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>معاينة اللوحة</DialogTitle>
            <DialogDescription>هذا شكل اللوحة في ديسكورد</DialogDescription>
          </DialogHeader>

          {previewPanel && (
            <div className="rounded-lg bg-[#36393f] p-4 text-white">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-violet-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                  L
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="font-semibold text-violet-300">Lyn</span>
                    <span className="text-xs bg-violet-500 text-white px-1.5 py-0.5 rounded">BOT</span>
                  </div>
                  <div
                    className="rounded border-s-4 bg-[#2f3136] p-3"
                    style={{ borderInlineStartColor: intToHexColor(previewPanel.color) }}
                  >
                    <div className="font-bold text-base mb-1">{previewPanel.title}</div>
                    <div className="text-sm text-gray-300">{previewPanel.description}</div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {previewPanel.buttons.map((btn, i) => (
                      <button
                        key={i}
                        className="px-3 py-1.5 rounded text-sm font-medium text-white"
                        style={{ background: STYLE_COLORS[btn.style] }}
                      >
                        <span className="me-1">{btn.emoji}</span>
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent>
          <div className="flex justify-center -mt-4 mb-2">
            <div className="w-16 h-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center">
              <Trash2 className="w-8 h-8" />
            </div>
          </div>
          <DialogHeader>
            <DialogTitle className="text-center">حذف اللوحة؟</DialogTitle>
            <DialogDescription className="text-center">
              راح يتم حذف لوحة <span className="font-bold text-foreground">{confirmDelete?.title}</span> نهائياً
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)} className="flex-1">إلغاء</Button>
            <Button onClick={handleDelete} className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              <Trash2 className="w-4 h-4" />
              حذف نهائياً
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ════════════════════════════════════════════════════════════
//  Panel Designer
// ════════════════════════════════════════════════════════════

function PanelDesigner({ panel, onSave, onClose }) {
  const [draft, setDraft] = useState(panel);

  const update = (key, value) => setDraft((p) => ({ ...p, [key]: value }));

  const addButton = () => {
    if (draft.buttons.length >= 25) return;
    update('buttons', [
      ...draft.buttons,
      { roleId: null, label: 'رتبة', emoji: '🎮', style: 'primary' },
    ]);
  };

  const removeButton = (idx) => {
    update('buttons', draft.buttons.filter((_, i) => i !== idx));
  };

  const updateButton = (idx, field, value) => {
    update(
      'buttons',
      draft.buttons.map((b, i) => (i === idx ? { ...b, [field]: value } : b)),
    );
  };

  const moveButton = (from, to) => {
    if (to < 0 || to >= draft.buttons.length) return;
    const next = [...draft.buttons];
    [next[from], next[to]] = [next[to], next[from]];
    update('buttons', next);
  };

  const canSave = draft.title && draft.channelId && draft.buttons.length > 0 && draft.buttons.every((b) => b.roleId);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-primary" />
            {panel.id ? 'تعديل اللوحة' : 'إنشاء لوحة جديدة'}
          </DialogTitle>
          <DialogDescription>صمم لوحة الرتب وشاهد المعاينة على اليمين</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Editor */}
          <div className="space-y-4">
            {/* Embed Settings */}
            <div className="space-y-3">
              <h3 className="font-bold text-sm">الإيمبيد</h3>

              <div>
                <label className="text-xs font-medium mb-1.5 block">العنوان</label>
                <Input
                  value={draft.title}
                  onChange={(e) => update('title', e.target.value)}
                  maxLength={256}
                />
              </div>

              <div>
                <label className="text-xs font-medium mb-1.5 block">الوصف</label>
                <textarea
                  value={draft.description}
                  onChange={(e) => update('description', e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm resize-y"
                  maxLength={2000}
                />
              </div>

              <div>
                <label className="text-xs font-medium mb-1.5 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5" />
                  اللون
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={intToHexColor(draft.color)}
                    onChange={(e) => update('color', hexToIntColor(e.target.value))}
                    className="w-10 h-9 rounded-lg border border-border cursor-pointer"
                  />
                  <Input
                    value={intToHexColor(draft.color)}
                    onChange={(e) => update('color', hexToIntColor(e.target.value))}
                    className="flex-1 num"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium mb-1.5 block">القناة</label>
                <ChannelPicker
                  value={draft.channelId}
                  onChange={(v) => update('channelId', v)}
                  types={[0, 5]}
                />
              </div>

              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/40">
                <Switch
                  checked={draft.exclusive}
                  onCheckedChange={(v) => update('exclusive', v)}
                />
                <div className="flex-1">
                  <div className="text-sm font-medium">حصري</div>
                  <div className="text-xs text-muted-foreground">
                    العضو يقدر يأخذ رتبة وحدة بس من اللوحة
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Buttons */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-sm">الأزرار ({draft.buttons.length}/25)</h3>
                <Button size="sm" onClick={addButton} disabled={draft.buttons.length >= 25}>
                  <Plus className="w-3.5 h-3.5" />
                  زر
                </Button>
              </div>

              <div className="space-y-2">
                {draft.buttons.map((btn, idx) => (
                  <div key={idx} className="rounded-xl border border-border p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-muted-foreground w-6 text-center num">
                        {idx + 1}
                      </span>
                      <div className="flex-1 grid grid-cols-[80px_1fr] gap-2">
                        <EmojiPicker
                          value={btn.emoji}
                          onChange={(v) => updateButton(idx, 'emoji', v)}
                        />
                        <Input
                          value={btn.label}
                          onChange={(e) => updateButton(idx, 'label', e.target.value)}
                          placeholder="نص الزر"
                          maxLength={80}
                        />
                      </div>
                      <button
                        onClick={() => removeButton(idx)}
                        className="w-8 h-8 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive flex items-center justify-center transition-colors flex-shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <RolePicker
                      value={btn.roleId}
                      onChange={(v) => updateButton(idx, 'roleId', v)}
                      placeholder="اختر الرتبة..."
                    />

                    <div className="flex items-center gap-2">
                      <Select
                        value={btn.style}
                        onValueChange={(v) => updateButton(idx, 'style', v)}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {BUTTON_STYLES.map((s) => (
                            <SelectItem key={s.value} value={s.value}>
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded"
                                  style={{ background: STYLE_COLORS[s.value] }}
                                />
                                {s.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => moveButton(idx, idx - 1)}
                          disabled={idx === 0}
                          className="w-8 h-8 rounded-lg hover:bg-accent disabled:opacity-30 flex items-center justify-center text-muted-foreground"
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => moveButton(idx, idx + 1)}
                          disabled={idx === draft.buttons.length - 1}
                          className="w-8 h-8 rounded-lg hover:bg-accent disabled:opacity-30 flex items-center justify-center text-muted-foreground"
                        >
                          ↓
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {draft.buttons.length === 0 && (
                  <div className="text-center py-4 text-sm text-muted-foreground border-2 border-dashed border-border rounded-xl">
                    اضغط "+ زر" لإضافة أول رتبة
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="lg:sticky lg:top-0 lg:self-start space-y-3">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-muted-foreground" />
              <h3 className="font-bold text-sm">معاينة مباشرة</h3>
            </div>

            <div className="rounded-lg bg-[#36393f] p-4 text-white">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-violet-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                  L
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="font-semibold text-violet-300">Lyn</span>
                    <span className="text-xs bg-violet-500 text-white px-1.5 py-0.5 rounded">BOT</span>
                  </div>
                  <div
                    className="rounded border-s-4 bg-[#2f3136] p-3"
                    style={{ borderInlineStartColor: intToHexColor(draft.color) }}
                  >
                    <div className="font-bold text-base mb-1">{draft.title}</div>
                    <div className="text-sm text-gray-300">{draft.description}</div>
                  </div>
                  {draft.buttons.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {draft.buttons.map((btn, i) => (
                        <button
                          key={i}
                          className="px-3 py-1.5 rounded text-sm font-medium text-white"
                          style={{ background: STYLE_COLORS[btn.style] }}
                        >
                          <span className="me-1">{btn.emoji}</span>
                          {btn.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="flex-1">
            إلغاء
          </Button>
          <Button onClick={() => onSave(draft)} disabled={!canSave} className="flex-1">
            <Send className="w-4 h-4" />
            {panel.id ? 'حفظ التعديلات' : 'إنشاء ونشر'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

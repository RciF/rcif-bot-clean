import { useState } from 'react';
import { Wand2, Plus, X, Eye, Palette } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Separator } from '@/components/ui/Separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { intToHexColor, hexToIntColor } from '@/lib/utils';
import { cn } from '@/lib/utils';

const BUTTON_STYLES = [
  { value: 'primary', label: 'أزرق (Primary)', color: '#5865F2' },
  { value: 'secondary', label: 'رمادي (Secondary)', color: '#4F545C' },
  { value: 'success', label: 'أخضر (Success)', color: '#2D7D46' },
  { value: 'danger', label: 'أحمر (Danger)', color: '#D83C3E' },
];

export function TicketsDesignerTab({ data, updateField, setData }) {
  const [editingButtonId, setEditingButtonId] = useState(null);

  const updatePanel = (path, value) => updateField(`panel.${path}`, value);

  const addButton = () => {
    if (data.panel.buttons.length >= 5) return;
    const newButton = {
      id: Date.now(),
      label: 'زر جديد',
      emoji: '🎫',
      style: 'primary',
      category: 'general',
    };
    setData((prev) => ({
      ...prev,
      panel: { ...prev.panel, buttons: [...prev.panel.buttons, newButton] },
    }));
    setEditingButtonId(newButton.id);
  };

  const removeButton = (id) => {
    setData((prev) => ({
      ...prev,
      panel: { ...prev.panel, buttons: prev.panel.buttons.filter((b) => b.id !== id) },
    }));
  };

  const updateButton = (id, field, value) => {
    setData((prev) => ({
      ...prev,
      panel: {
        ...prev.panel,
        buttons: prev.panel.buttons.map((b) => (b.id === id ? { ...b, [field]: value } : b)),
      },
    }));
  };

  const getStyleColor = (style) =>
    BUTTON_STYLES.find((s) => s.value === style)?.color || '#5865F2';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* ── Editor (يسار) ── */}
      <div className="space-y-4 order-2 lg:order-1">
        {/* Embed Editor */}
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-500 flex items-center justify-center">
              <Wand2 className="w-5 h-5" />
            </div>
            <h3 className="font-bold">إعدادات اللوحة</h3>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-2 block">العنوان</label>
              <Input
                value={data.panel?.title || ''}
                onChange={(e) => updatePanel('title', e.target.value)}
                placeholder="🎫 لوحة التذاكر"
                maxLength={256}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">الوصف</label>
              <textarea
                value={data.panel?.description || ''}
                onChange={(e) => updatePanel('description', e.target.value)}
                placeholder="اضغط على الزر المناسب لفتح تذكرة"
                rows={3}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm resize-y"
                maxLength={2000}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 flex items-center gap-2">
                <Palette className="w-4 h-4 text-muted-foreground" />
                لون الإيمبيد
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={intToHexColor(data.panel?.color || 0x9b59b6)}
                  onChange={(e) => updatePanel('color', hexToIntColor(e.target.value))}
                  className="w-12 h-10 rounded-lg border border-border cursor-pointer"
                />
                <Input
                  value={intToHexColor(data.panel?.color || 0x9b59b6)}
                  onChange={(e) => updatePanel('color', hexToIntColor(e.target.value))}
                  className="flex-1 num"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Buttons Editor */}
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="font-bold">الأزرار ({data.panel?.buttons?.length || 0}/5)</h3>
            <Button
              size="sm"
              onClick={addButton}
              disabled={data.panel?.buttons?.length >= 5}
            >
              <Plus className="w-4 h-4" />
              إضافة زر
            </Button>
          </div>

          <div className="space-y-2">
            {data.panel?.buttons?.map((btn) => (
              <div key={btn.id} className="rounded-xl border border-border p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Input
                    value={btn.emoji}
                    onChange={(e) => updateButton(btn.id, 'emoji', e.target.value)}
                    className="w-14 text-center text-lg"
                    maxLength={4}
                  />
                  <Input
                    value={btn.label}
                    onChange={(e) => updateButton(btn.id, 'label', e.target.value)}
                    className="flex-1"
                    placeholder="نص الزر"
                    maxLength={80}
                  />
                  <button
                    onClick={() => removeButton(btn.id)}
                    className="w-9 h-9 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive flex items-center justify-center transition-colors flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <Select
                  value={btn.style}
                  onValueChange={(v) => updateButton(btn.id, 'style', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BUTTON_STYLES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded"
                            style={{ background: s.color }}
                          />
                          {s.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}

            {(!data.panel?.buttons || data.panel.buttons.length === 0) && (
              <div className="text-center py-6 text-sm text-muted-foreground">
                ما فيه أزرار — اضغط "إضافة زر" للبدء
              </div>
            )}
          </div>

          <Separator className="my-4" />

          <Button variant="default" className="w-full" disabled>
            نشر اللوحة في القناة (قيد البناء)
          </Button>
        </Card>
      </div>

      {/* ── Preview (يمين) ── */}
      <div className="order-1 lg:order-2 lg:sticky lg:top-4 lg:self-start">
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Eye className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-bold text-sm">معاينة مباشرة</h3>
          </div>

          {/* Discord Embed Preview */}
          <div className="rounded-lg bg-[#36393f] p-4 text-white">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-violet-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                L
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="font-semibold text-violet-300">Lyn</span>
                  <span className="text-xs bg-violet-500 text-white px-1.5 py-0.5 rounded">
                    BOT
                  </span>
                </div>

                {/* Embed */}
                <div
                  className="rounded border-s-4 bg-[#2f3136] p-3"
                  style={{
                    borderInlineStartColor: intToHexColor(data.panel?.color || 0x9b59b6),
                  }}
                >
                  {data.panel?.title && (
                    <div className="font-bold text-base mb-1">{data.panel.title}</div>
                  )}
                  {data.panel?.description && (
                    <div className="text-sm text-gray-300 whitespace-pre-wrap">
                      {data.panel.description}
                    </div>
                  )}
                </div>

                {/* Buttons */}
                {data.panel?.buttons?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {data.panel.buttons.map((btn) => (
                      <button
                        key={btn.id}
                        className="px-3 py-1.5 rounded text-sm font-medium text-white"
                        style={{ background: getStyleColor(btn.style) }}
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

          <p className="text-xs text-muted-foreground mt-3 text-center">
            هذا شكل اللوحة في ديسكورد
          </p>
        </Card>
      </div>
    </div>
  );
}

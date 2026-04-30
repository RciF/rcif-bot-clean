import { useState, useEffect } from 'react';
import {
  Sparkles,
  Eye,
  Send,
  Save,
  Plus,
  X,
  Image as ImageIcon,
  Hash,
  FolderOpen,
  Trash2,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { Separator } from '@/components/ui/Separator';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { SettingsPageHeader } from '@/components/shared/SettingsPageHeader';
import { EmbedPreview } from '@/components/shared/EmbedPreview';
import { EmptyState } from '@/components/shared/EmptyState';
import { mock } from '@/lib/mock';
import { intToHexColor, hexToIntColor, cn } from '@/lib/utils';
import { toast } from 'sonner';

const COLOR_PRESETS = [
  { name: 'بنفسجي Lyn', value: 0x9b59b6 },
  { name: 'وردي', value: 0xe91e63 },
  { name: 'أزرق', value: 0x3498db },
  { name: 'أخضر', value: 0x2ecc71 },
  { name: 'أحمر', value: 0xe74c3c },
  { name: 'برتقالي', value: 0xf39c12 },
  { name: 'أصفر', value: 0xf1c40f },
  { name: 'سماوي', value: 0x1abc9c },
];

const DEFAULT_EMBED = {
  title: '',
  description: '',
  color: 0x9b59b6,
  footer: '',
  author: { name: '', iconUrl: '' },
  image: '',
  thumbnail: '',
  fields: [],
  timestamp: false,
};

export default function EmbedBuilderPage() {
  const [embed, setEmbed] = useState(DEFAULT_EMBED);
  const [templates, setTemplates] = useState(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [templateName, setTemplateName] = useState('');

  useEffect(() => {
    mock.embedTemplates().then(setTemplates);
  }, []);

  const updateEmbed = (path, value) => {
    setEmbed((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      const keys = path.split('.');
      let target = next;
      for (let i = 0; i < keys.length - 1; i++) target = target[keys[i]];
      target[keys[keys.length - 1]] = value;
      return next;
    });
  };

  const addField = () => {
    if (embed.fields.length >= 25) return;
    setEmbed((prev) => ({
      ...prev,
      fields: [...prev.fields, { name: 'حقل جديد', value: 'القيمة', inline: false }],
    }));
  };

  const removeField = (idx) => {
    setEmbed((prev) => ({
      ...prev,
      fields: prev.fields.filter((_, i) => i !== idx),
    }));
  };

  const updateField = (idx, key, value) => {
    setEmbed((prev) => ({
      ...prev,
      fields: prev.fields.map((f, i) => (i === idx ? { ...f, [key]: value } : f)),
    }));
  };

  const loadTemplate = (template) => {
    setEmbed({ ...DEFAULT_EMBED, ...template.data });
    setShowTemplates(false);
    toast.success(`تم تحميل قالب "${template.name}"`);
  };

  const handleSend = () => {
    setShowSendDialog(false);
    toast.success('تم إرسال الإيمبيد للقناة');
  };

  const handleSaveTemplate = () => {
    if (!templateName.trim()) return;
    setTemplates((prev) => [
      ...prev,
      { id: Date.now(), name: templateName, data: embed },
    ]);
    setTemplateName('');
    setShowSaveDialog(false);
    toast.success('تم حفظ القالب');
  };

  const deleteTemplate = (id) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    toast.success('تم حذف القالب');
  };

  const reset = () => {
    setEmbed(DEFAULT_EMBED);
    toast.info('تم إعادة التعيين');
  };

  return (
    <>
      <SettingsPageHeader
        icon={<Sparkles />}
        title="منشئ الإيمبيد"
        description="صمم رسائل احترافية وأرسلها لأي قناة"
        plan="free"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setShowTemplates(true)}>
              <FolderOpen className="w-4 h-4" />
              القوالب
            </Button>
            <Button size="sm" onClick={() => setShowSendDialog(true)}>
              <Send className="w-4 h-4" />
              إرسال
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ── Editor (يسار) ── */}
        <div className="space-y-4 order-2 lg:order-1">
          {/* Basic Fields */}
          <Card className="p-5 space-y-4">
            <h3 className="font-bold">المحتوى الأساسي</h3>
            <Separator />

            <div>
              <label className="text-sm font-medium mb-2 block">العنوان</label>
              <Input
                value={embed.title}
                onChange={(e) => updateEmbed('title', e.target.value)}
                placeholder="عنوان الإيمبيد"
                maxLength={256}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">الوصف</label>
              <textarea
                value={embed.description}
                onChange={(e) => updateEmbed('description', e.target.value)}
                placeholder="محتوى الإيمبيد... يدعم Markdown"
                rows={5}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm resize-y"
                maxLength={4000}
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                <span className="num">{embed.description.length}</span> / 4000
              </p>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Footer</label>
              <Input
                value={embed.footer}
                onChange={(e) => updateEmbed('footer', e.target.value)}
                placeholder="نص يظهر تحت الإيمبيد"
                maxLength={2048}
              />
            </div>
          </Card>

          {/* Color */}
          <Card className="p-5">
            <h3 className="font-bold mb-3">اللون</h3>
            <div className="flex items-center gap-2 mb-3">
              <input
                type="color"
                value={intToHexColor(embed.color)}
                onChange={(e) => updateEmbed('color', hexToIntColor(e.target.value))}
                className="w-12 h-10 rounded-lg border border-border cursor-pointer"
              />
              <Input
                value={intToHexColor(embed.color)}
                onChange={(e) => updateEmbed('color', hexToIntColor(e.target.value))}
                className="flex-1 num"
              />
            </div>
            <div className="grid grid-cols-4 gap-2">
              {COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => updateEmbed('color', preset.value)}
                  className={cn(
                    'h-9 rounded-lg border-2 transition-all',
                    embed.color === preset.value ? 'border-foreground scale-110' : 'border-transparent',
                  )}
                  style={{ background: intToHexColor(preset.value) }}
                  title={preset.name}
                />
              ))}
            </div>
          </Card>

          {/* Author */}
          <Card className="p-5 space-y-3">
            <h3 className="font-bold">المؤلف (Author)</h3>
            <Separator />
            <Input
              value={embed.author?.name || ''}
              onChange={(e) => updateEmbed('author.name', e.target.value)}
              placeholder="اسم المؤلف"
              maxLength={256}
            />
            <Input
              value={embed.author?.iconUrl || ''}
              onChange={(e) => updateEmbed('author.iconUrl', e.target.value)}
              placeholder="رابط أيقونة المؤلف (اختياري)"
            />
          </Card>

          {/* Images */}
          <Card className="p-5 space-y-3">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-muted-foreground" />
              <h3 className="font-bold">الصور</h3>
            </div>
            <Separator />

            <div>
              <label className="text-sm font-medium mb-2 block">الصورة الكبيرة (Image)</label>
              <Input
                value={embed.image}
                onChange={(e) => updateEmbed('image', e.target.value)}
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">الصورة الصغيرة (Thumbnail)</label>
              <Input
                value={embed.thumbnail}
                onChange={(e) => updateEmbed('thumbnail', e.target.value)}
                placeholder="https://..."
              />
            </div>
          </Card>

          {/* Fields */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3 gap-3">
              <h3 className="font-bold">
                الحقول ({embed.fields.length}/25)
              </h3>
              <Button
                size="sm"
                variant="outline"
                onClick={addField}
                disabled={embed.fields.length >= 25}
              >
                <Plus className="w-4 h-4" />
                إضافة حقل
              </Button>
            </div>

            <div className="space-y-2">
              {embed.fields.map((field, idx) => (
                <div key={idx} className="rounded-xl border border-border p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      value={field.name}
                      onChange={(e) => updateField(idx, 'name', e.target.value)}
                      placeholder="اسم الحقل"
                      className="flex-1"
                      maxLength={256}
                    />
                    <button
                      onClick={() => removeField(idx)}
                      className="w-9 h-9 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive flex items-center justify-center transition-colors flex-shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <textarea
                    value={field.value}
                    onChange={(e) => updateField(idx, 'value', e.target.value)}
                    placeholder="قيمة الحقل"
                    rows={2}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm resize-y"
                    maxLength={1024}
                  />
                  <div className="flex items-center gap-2 text-xs">
                    <Switch
                      size="sm"
                      checked={field.inline}
                      onCheckedChange={(v) => updateField(idx, 'inline', v)}
                    />
                    <span className="text-muted-foreground">في نفس الصف (Inline)</span>
                  </div>
                </div>
              ))}

              {embed.fields.length === 0 && (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  ما فيه حقول بعد
                </div>
              )}
            </div>
          </Card>

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={reset} className="flex-1">
              إعادة تعيين
            </Button>
            <Button variant="outline" onClick={() => setShowSaveDialog(true)} className="flex-1">
              <Save className="w-4 h-4" />
              حفظ كقالب
            </Button>
          </div>
        </div>

        {/* ── Preview (يمين) ── */}
        <div className="order-1 lg:order-2 lg:sticky lg:top-4 lg:self-start space-y-4">
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Eye className="w-4 h-4 text-muted-foreground" />
              <h3 className="font-bold text-sm">معاينة مباشرة</h3>
            </div>
            <EmbedPreview embed={embed} username="Lyn" avatarLetter="L" />
            <p className="text-xs text-muted-foreground mt-3 text-center">
              هذا شكل الإيمبيد في ديسكورد
            </p>
          </Card>
        </div>
      </div>

      {/* Templates Dialog */}
      <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>القوالب المحفوظة</DialogTitle>
            <DialogDescription>اختر قالباً لتحميله في المحرر</DialogDescription>
          </DialogHeader>

          {!templates ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          ) : templates.length === 0 ? (
            <EmptyState
              icon={<FolderOpen />}
              title="لا توجد قوالب"
              description="احفظ إيمبيداتك المتكررة كقوالب لاستخدامها لاحقاً"
              size="sm"
            />
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {templates.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-border/80 transition-colors"
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{
                      background: intToHexColor(t.data.color || 0x9b59b6) + '20',
                    }}
                  >
                    <Sparkles
                      className="w-5 h-5"
                      style={{ color: intToHexColor(t.data.color || 0x9b59b6) }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{t.name}</div>
                    <div className="text-xs text-muted-foreground line-clamp-1">
                      {t.data.title || t.data.description?.slice(0, 50) || 'بدون عنوان'}
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => loadTemplate(t)}>
                    تحميل
                  </Button>
                  <button
                    onClick={() => deleteTemplate(t.id)}
                    className="w-9 h-9 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive flex items-center justify-center transition-colors flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Send Dialog */}
      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إرسال الإيمبيد</DialogTitle>
            <DialogDescription>اختر القناة اللي بتنشر فيها</DialogDescription>
          </DialogHeader>
          <div className="border-2 border-dashed border-border rounded-xl p-4 text-center text-xs text-muted-foreground my-2">
            <Hash className="w-6 h-6 mx-auto mb-2" />
            ChannelPicker قيد البناء
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSendDialog(false)} className="flex-1">
              إلغاء
            </Button>
            <Button onClick={handleSend} className="flex-1">
              <Send className="w-4 h-4" />
              إرسال
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save Template Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>حفظ كقالب</DialogTitle>
            <DialogDescription>احفظ الإيمبيد لاستخدامه لاحقاً</DialogDescription>
          </DialogHeader>
          <Input
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="اسم القالب..."
            maxLength={50}
            onKeyDown={(e) => e.key === 'Enter' && handleSaveTemplate()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)} className="flex-1">
              إلغاء
            </Button>
            <Button onClick={handleSaveTemplate} disabled={!templateName.trim()} className="flex-1">
              <Save className="w-4 h-4" />
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

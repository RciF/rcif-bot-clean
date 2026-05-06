import { useState, useEffect } from 'react';
import {
  Sparkles,
  Eye,
  Send,
  Save,
  Plus,
  X,
  Image as ImageIcon,
  FolderOpen,
  Trash2,
  Loader2,
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
import { ChannelPicker } from '@/components/shared/ChannelPicker';
import { useGuildStore } from '@/store/guildStore';
import { settingsApi } from '@/api';
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
  const { selectedGuildId } = useGuildStore();

  const [embed, setEmbed] = useState(DEFAULT_EMBED);
  const [templates, setTemplates] = useState(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [sendChannel, setSendChannel] = useState(null);
  const [sending, setSending] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // ─── Load templates ───
  const loadTemplates = async () => {
    if (!selectedGuildId) {
      setTemplates([]);
      return;
    }
    try {
      const rows = await settingsApi.getEmbedTemplates(selectedGuildId);
      setTemplates(Array.isArray(rows) ? rows : []);
    } catch (err) {
      setTemplates([]);
      toast.error(err.message || 'فشل تحميل القوالب');
    }
  };

  useEffect(() => {
    let mounted = true;
    if (!selectedGuildId) {
      setTemplates([]);
      return;
    }
    setTemplates(null);
    settingsApi
      .getEmbedTemplates(selectedGuildId)
      .then((rows) => {
        if (!mounted) return;
        setTemplates(Array.isArray(rows) ? rows : []);
      })
      .catch((err) => {
        if (!mounted) return;
        setTemplates([]);
        toast.error(err.message || 'فشل تحميل القوالب');
      });
    return () => { mounted = false; };
  }, [selectedGuildId]);

  // ─── Embed updates ───
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
    setEmbed((prev) => ({ ...prev, fields: prev.fields.filter((_, i) => i !== idx) }));
  };

  const updateField = (idx, key, value) => {
    setEmbed((prev) => ({
      ...prev,
      fields: prev.fields.map((f, i) => (i === idx ? { ...f, [key]: value } : f)),
    }));
  };

  // ─── Template actions ───
  const loadTemplate = (template) => {
    // backend يرجع template.data كـ JSONB (ممكن يجي string أو object)
    let data = template.data;
    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch { data = {}; }
    }
    setEmbed({ ...DEFAULT_EMBED, ...(data || {}) });
    setShowTemplates(false);
    toast.success(`تم تحميل قالب "${template.name}"`);
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim() || !selectedGuildId) return;
    setSavingTemplate(true);
    try {
      const result = await settingsApi.saveEmbedTemplate(selectedGuildId, {
        name: templateName.trim(),
        data: embed,
      });
      setTemplates((prev) => [result, ...(prev || [])]);
      setTemplateName('');
      setShowSaveDialog(false);
      toast.success('تم حفظ القالب');
    } catch (err) {
      toast.error(err.message || 'فشل الحفظ');
    } finally {
      setSavingTemplate(false);
    }
  };

  const deleteTemplate = async (id) => {
    if (!selectedGuildId) return;
    setDeletingId(id);
    try {
      await settingsApi.deleteEmbedTemplate(selectedGuildId, id);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      toast.success('تم حذف القالب');
    } catch (err) {
      toast.error(err.message || 'فشل الحذف');
    } finally {
      setDeletingId(null);
    }
  };

  // ─── Send to channel ───
  const handleSend = async () => {
    if (!sendChannel || !selectedGuildId) return;
    setSending(true);
    try {
      await settingsApi.sendEmbed(selectedGuildId, {
        channel_id: sendChannel,
        embed,
      });
      toast.success('تم إرسال الإيمبيد للقناة');
      setShowSendDialog(false);
      setSendChannel(null);
    } catch (err) {
      toast.error(err.message || 'فشل الإرسال');
    } finally {
      setSending(false);
    }
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
        <div className="space-y-4 order-2 lg:order-1">
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

          <Card className="p-5">
            <div className="flex items-center justify-between mb-3 gap-3">
              <h3 className="font-bold">
                الحقول (<span className="num">{embed.fields.length}</span>/25)
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

          <div className="flex gap-2">
            <Button variant="outline" onClick={reset} className="flex-1">
              إعادة تعيين
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowSaveDialog(true)}
              className="flex-1"
            >
              <Save className="w-4 h-4" />
              حفظ كقالب
            </Button>
          </div>
        </div>

        <div className="order-1 lg:order-2 lg:sticky lg:top-4 lg:self-start space-y-4">
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Eye className="w-4 h-4 text-muted-foreground" />
              <h3 className="font-bold text-sm">معاينة مباشرة</h3>
            </div>
            <EmbedPreview embed={embed} username="Lyn" avatarLetter="L" />
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

          {templates === null ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          ) : templates.length === 0 ? (
            <EmptyState
              icon={<FolderOpen />}
              title="لا توجد قوالب"
              description="احفظ إيمبيد جديد كقالب علشان تستخدمه لاحقاً"
              size="sm"
            />
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {templates.map((t) => {
                let data = t.data;
                if (typeof data === 'string') {
                  try { data = JSON.parse(data); } catch { data = {}; }
                }
                const color = data?.color || 0x9b59b6;
                return (
                  <div
                    key={t.id}
                    className="flex items-center gap-3 p-3 rounded-xl border border-border"
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: intToHexColor(color) + '20' }}
                    >
                      <Sparkles
                        className="w-5 h-5"
                        style={{ color: intToHexColor(color) }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{t.name}</div>
                      <div className="text-xs text-muted-foreground line-clamp-1">
                        {data?.title || data?.description?.slice(0, 50) || 'بدون عنوان'}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => loadTemplate({ ...t, data })}
                    >
                      تحميل
                    </Button>
                    <button
                      onClick={() => deleteTemplate(t.id)}
                      disabled={deletingId === t.id}
                      className="w-9 h-9 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive flex items-center justify-center transition-colors flex-shrink-0 disabled:opacity-50"
                    >
                      {deletingId === t.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                );
              })}
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
          <ChannelPicker
            value={sendChannel}
            onChange={setSendChannel}
            types={[0, 5]}
            placeholder="اختر قناة..."
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSendDialog(false)}
              className="flex-1"
              disabled={sending}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleSend}
              disabled={!sendChannel || sending}
              className="flex-1"
            >
              <Send className="w-4 h-4" />
              {sending ? 'جاري الإرسال...' : 'إرسال'}
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
            disabled={savingTemplate}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSaveDialog(false)}
              className="flex-1"
              disabled={savingTemplate}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleSaveTemplate}
              disabled={!templateName.trim() || savingTemplate}
              className="flex-1"
            >
              <Save className="w-4 h-4" />
              {savingTemplate ? 'جاري الحفظ...' : 'حفظ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
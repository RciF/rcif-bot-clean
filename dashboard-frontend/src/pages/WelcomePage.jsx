import { useState } from 'react';
import { PartyPopper, MessageSquare, LogOut, Send } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import { Input } from '@/components/ui/Input';
import { Separator } from '@/components/ui/Separator';
import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton';
import { SettingsPageHeader } from '@/components/shared/SettingsPageHeader';
import { SaveBar } from '@/components/shared/SaveBar';
import { PlanLockBanner, PlanLockModal } from '@/components/shared/PlanLockOverlay';
import { EmbedPreview } from '@/components/shared/EmbedPreview';
import { VariablesHelper } from '@/components/shared/VariablesHelper';
import { ChannelPicker } from '@/components/shared/ChannelPicker';
import { useGuildSettings } from '@/hooks/useGuildSettings';
import { usePlanGate } from '@/hooks/usePlanGate';
import { PLAN_TIERS } from '@/lib/plans';
import { intToHexColor, cn } from '@/lib/utils';
import { toast } from 'sonner';
import { settingsApi } from '@/api';
import { useGuildStore } from '@/store/guildStore';

// المتغيرات الفعلية اللي بوت Lyn يدعمها (من events/logs/guildMemberAdd.js)
const VARIABLES = [
  { key: '{user}',     label: 'منشن العضو',  example: '@أحمد'         },
  { key: '{username}', label: 'اسم العضو',    example: 'أحمد'          },
  { key: '{server}',   label: 'اسم السيرفر',  example: 'سيرفر التطوير' },
  { key: '{count}',    label: 'رقم العضو',    example: '1247'          },
];

const replacePreviewVars = (txt) => {
  if (!txt) return txt;
  return txt
    .replace(/{user}/g, '@أنت')
    .replace(/{username}/g, 'أنت')
    .replace(/{server}/g, 'سيرفر التطوير')
    .replace(/{count}/g, '1,247');
};

export default function WelcomePage() {
  const [activeTab, setActiveTab] = useState('welcome');
  const { selectedGuildId } = useGuildStore();

  const { data, updateField, isLoading, isSaving, isDirty, save, reset } =
    useGuildSettings({ section: 'welcome' });

  const planGate = usePlanGate('welcome', PLAN_TIERS.SILVER);

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

  const handleTest = async () => {
    try {
      await settingsApi.testWelcome(selectedGuildId);
      toast.success('تم إرسال رسالة اختبار!');
    } catch (err) {
      if (err?.code === 'PLAN_REQUIRED') {
        toast.error('تحتاج خطة Silver أو أعلى');
      } else {
        toast.error(err?.message || 'فشل الاختبار');
      }
    }
  };

  const embedPreviewData =
    data.type === 'embed'
      ? {
          title: replacePreviewVars(data.embed?.title),
          description: replacePreviewVars(data.embed?.description),
          color: data.embed?.color ? intToHexColor(data.embed.color) : '#9b59b6',
          footer: { text: replacePreviewVars(data.embed?.footer) },
        }
      : null;

  return (
    <>
      <SettingsPageHeader
        icon={<PartyPopper />}
        title="نظام الترحيب"
        description="رسائل ترحيب ووداع مخصصة للأعضاء"
        plan="silver"
      />

      {planGate.isLocked && (
        <PlanLockBanner
          currentPlan={planGate.currentPlan}
          requiredPlan={planGate.requiredPlan}
          featureName="نظام الترحيب"
          className="mb-6"
        />
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList variant="pills" className="mb-4">
          <TabsTrigger value="welcome" variant="pills">
            <MessageSquare className="w-4 h-4" />
            <span>الترحيب</span>
          </TabsTrigger>
          <TabsTrigger value="leave" variant="pills">
            <LogOut className="w-4 h-4" />
            <span>الوداع</span>
          </TabsTrigger>
        </TabsList>

        {/* ── Welcome Tab ── */}
        <TabsContent value="welcome">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="space-y-4">
              {/* Toggle */}
              <Card className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold">تفعيل الترحيب</h3>
                    <p className="text-sm text-muted-foreground">
                      إرسال رسالة عند انضمام أعضاء جدد
                    </p>
                  </div>
                  <Switch
                    checked={data.enabled}
                    onCheckedChange={(v) => updateField('enabled', v)}
                    size="lg"
                  />
                </div>
              </Card>

              {/* Channel + Type + Message */}
              <Card
                className={cn(
                  'p-5 space-y-4',
                  !data.enabled && 'opacity-50 pointer-events-none',
                )}
              >
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    قناة الترحيب
                  </label>
                  <ChannelPicker
                    value={data.welcome_channel_id}
                    onChange={(v) => updateField('welcome_channel_id', v)}
                    types={[0, 5]}
                  />
                </div>

                <Separator />

                {/* Mention user */}
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-sm">منشن العضو</h4>
                    <p className="text-xs text-muted-foreground">
                      البوت يعمل ping للعضو الجديد فوق الرسالة
                    </p>
                  </div>
                  <Switch
                    checked={data.mention_user !== false}
                    onCheckedChange={(v) => updateField('mention_user', v)}
                  />
                </div>

                <Separator />

                {/* Message Type */}
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    نوع الرسالة
                  </label>
                  <div className="flex gap-2">
                    {['text', 'embed'].map((t) => (
                      <button
                        key={t}
                        onClick={() => updateField('type', t)}
                        className={cn(
                          'flex-1 py-2 rounded-xl border text-sm font-medium transition-all',
                          data.type === t
                            ? 'lyn-gradient text-white border-transparent'
                            : 'border-border hover:border-primary/50',
                        )}
                      >
                        {t === 'text' ? 'نص بسيط' : 'Embed'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Text message */}
                {data.type === 'text' && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      رسالة الترحيب
                    </label>
                    <textarea
                      rows={3}
                      value={data.welcome_message || ''}
                      onChange={(e) =>
                        updateField('welcome_message', e.target.value)
                      }
                      placeholder="أهلاً {user} في {server}! 🎉"
                      className="w-full rounded-xl bg-input border border-border px-3 py-2 text-sm focus:outline-none focus:border-primary/50 resize-none"
                    />
                    <VariablesHelper
                      variables={VARIABLES}
                      onInsert={(k) =>
                        updateField(
                          'welcome_message',
                          (data.welcome_message || '') + k,
                        )
                      }
                    />
                  </div>
                )}

                {/* Embed message */}
                {data.type === 'embed' && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium mb-1 block">
                        العنوان
                      </label>
                      <Input
                        value={data.embed?.title || ''}
                        onChange={(e) =>
                          updateField('embed.title', e.target.value)
                        }
                        placeholder="مرحباً {user}! 👋"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">
                        الوصف
                      </label>
                      <textarea
                        rows={3}
                        value={data.embed?.description || ''}
                        onChange={(e) =>
                          updateField('embed.description', e.target.value)
                        }
                        placeholder="أهلاً وسهلاً في {server}"
                        className="w-full rounded-xl bg-input border border-border px-3 py-2 text-sm focus:outline-none focus:border-primary/50 resize-none"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">
                        الفوتر
                      </label>
                      <Input
                        value={data.embed?.footer || ''}
                        onChange={(e) =>
                          updateField('embed.footer', e.target.value)
                        }
                        placeholder="العضو رقم {count}"
                      />
                    </div>
                    <VariablesHelper
                      variables={VARIABLES}
                      onInsert={(k) =>
                        updateField(
                          'embed.description',
                          (data.embed?.description || '') + k,
                        )
                      }
                    />
                  </div>
                )}

                {/* Test Button */}
                <Button
                  variant="outline"
                  onClick={handleTest}
                  className="w-full gap-2"
                  disabled={!data.enabled}
                >
                  <Send className="w-4 h-4" />
                  اختبر الرسالة
                </Button>
              </Card>
            </div>

            {/* Preview */}
            <div className="hidden xl:block">
              {embedPreviewData ? (
                <EmbedPreview embed={embedPreviewData} />
              ) : (
                <Card className="p-5">
                  <div className="text-xs text-muted-foreground mb-2">
                    معاينة
                  </div>
                  <div className="p-4 rounded-xl bg-muted/30 text-sm whitespace-pre-wrap">
                    {replacePreviewVars(data.welcome_message) ||
                      'رسالة الترحيب ستظهر هنا...'}
                  </div>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── Leave Tab ── */}
        <TabsContent value="leave">
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold">رسالة الوداع</h3>
                <p className="text-sm text-muted-foreground">
                  تُرسل عند مغادرة أعضاء
                </p>
              </div>
              <Switch
                checked={data.leave_enabled}
                onCheckedChange={(v) => updateField('leave_enabled', v)}
              />
            </div>

            <Separator />

            <div
              className={cn(
                !data.leave_enabled && 'opacity-50 pointer-events-none',
              )}
            >
              <label className="text-sm font-medium mb-2 block">
                قناة الوداع
              </label>
              <ChannelPicker
                value={data.goodbye_channel_id}
                onChange={(v) => updateField('goodbye_channel_id', v)}
                types={[0, 5]}
              />
            </div>

            <div
              className={cn(
                !data.leave_enabled && 'opacity-50 pointer-events-none',
              )}
            >
              <label className="text-sm font-medium mb-2 block">
                رسالة الوداع
              </label>
              <textarea
                rows={3}
                value={data.goodbye_message || ''}
                onChange={(e) => updateField('goodbye_message', e.target.value)}
                placeholder="👋 وداعاً {username}، نشتاقك"
                className="w-full rounded-xl bg-input border border-border px-3 py-2 text-sm focus:outline-none focus:border-primary/50 resize-none"
              />
              <VariablesHelper
                variables={VARIABLES}
                onInsert={(k) =>
                  updateField(
                    'goodbye_message',
                    (data.goodbye_message || '') + k,
                  )
                }
              />
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <SaveBar
        isDirty={isDirty}
        isSaving={isSaving}
        onSave={handleSave}
        onReset={reset}
      />

      <PlanLockModal {...planGate.lockModalProps} featureName="نظام الترحيب" />
    </>
  );
}
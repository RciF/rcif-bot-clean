import { useState } from 'react';
import { PartyPopper, MessageSquare, LogOut, Eye, Send } from 'lucide-react';
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
import { mock } from '@/lib/mock';
import { PLAN_TIERS } from '@/lib/plans';
import { intToHexColor, hexToIntColor, cn } from '@/lib/utils';
import { toast } from 'sonner';

const VARIABLES = [
  { key: '{user}', label: 'منشن العضو', example: '@أحمد' },
  { key: '{username}', label: 'اسم العضو', example: 'أحمد' },
  { key: '{server}', label: 'اسم السيرفر', example: 'سيرفر التطوير' },
  { key: '{count}', label: 'رقم العضو', example: '1247' },
  { key: '{date}', label: 'التاريخ', example: '30/4/2026' },
  { key: '{duration}', label: 'مدة بقائه (للوداع)', example: '3 أشهر' },
];

const replacePreviewVars = (txt) => {
  if (!txt) return txt;
  return txt
    .replace(/{user}/g, '@أنت')
    .replace(/{username}/g, 'أنت')
    .replace(/{server}/g, 'سيرفر التطوير')
    .replace(/{count}/g, '1,247')
    .replace(/{date}/g, '30/4/2026')
    .replace(/{duration}/g, '3 أشهر');
};

export default function WelcomePage() {
  const [activeTab, setActiveTab] = useState('welcome');

  const { data, setData, updateField, isLoading, isSaving, isDirty, save, reset } =
    useGuildSettings({ section: 'welcome', fetcher: mock.welcomeSettings });

  const planGate = usePlanGate('welcome', PLAN_TIERS.SILVER);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-start gap-4 pb-6 mb-6 border-b border-border">
          <Skeleton className="w-12 h-12 rounded-2xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (!data) return null;

  const handleSave = planGate.gateAction(save);
  const handleTest = () => toast.success('تم إرسال رسالة اختبار للقناة');

  return (
    <>
      <SettingsPageHeader
        icon={<PartyPopper />}
        title="رسائل الترحيب والوداع"
        description="رحّب بالأعضاء الجدد ووداع المغادرين"
        plan="silver"
        actions={
          <Button variant="outline" size="sm" onClick={handleTest}>
            <Send className="w-4 h-4" />
            اختبار
          </Button>
        }
      />

      {planGate.isLocked && (
        <PlanLockBanner
          currentPlan={planGate.currentPlan}
          requiredPlan={planGate.requiredPlan}
          featureName="نظام الترحيب"
          className="mb-6"
        />
      )}

      <Card className="p-5 mb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div
              className={cn(
                'w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0',
                data.enabled ? 'lyn-gradient lyn-glow' : 'bg-muted',
              )}
            >
              <PartyPopper
                className={cn('w-5 h-5', data.enabled ? 'text-white' : 'text-muted-foreground')}
              />
            </div>
            <div className="flex-1">
              <h3 className="font-bold mb-1">تفعيل الترحيب والوداع</h3>
              <p className="text-sm text-muted-foreground">
                إرسال رسائل ترحيب للأعضاء الجدد ورسائل وداع للمغادرين
              </p>
            </div>
          </div>
          <Switch
            checked={data.enabled}
            onCheckedChange={(v) => updateField('enabled', v)}
            size="lg"
          />
        </div>
      </Card>

      <div className={cn(!data.enabled && 'opacity-50 pointer-events-none')}>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList variant="pills" className="flex-wrap gap-2">
            <TabsTrigger value="welcome" variant="pills">
              <PartyPopper className="w-4 h-4" />
              <span>الترحيب</span>
            </TabsTrigger>
            <TabsTrigger value="leave" variant="pills">
              <LogOut className="w-4 h-4" />
              <span>الوداع</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="welcome">
            <WelcomeTab data={data} updateField={updateField} setData={setData} />
          </TabsContent>
          <TabsContent value="leave">
            <LeaveTab data={data} updateField={updateField} />
          </TabsContent>
        </Tabs>
      </div>

      <SaveBar
        isDirty={isDirty}
        isSaving={isSaving}
        onSave={handleSave}
        onReset={reset}
        locked={planGate.isLocked}
        onLockedClick={planGate.openLockModal}
      />
      <PlanLockModal {...planGate.lockModalProps} />
    </>
  );
}

// ────────────────────────────────────────────────────────────
//  Welcome Tab
// ────────────────────────────────────────────────────────────

function WelcomeTab({ data, updateField }) {
  const isEmbed = data.type === 'embed';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="space-y-4">
        <Card className="p-5">
          <div className="mb-4">
            <h3 className="font-bold mb-1">إعدادات الترحيب</h3>
            <p className="text-sm text-muted-foreground">قناة الترحيب ونوع الرسالة</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">قناة الترحيب</label>
              <ChannelPicker
                value={data.welcomeChannel}
                onChange={(v) => updateField('welcomeChannel', v)}
                types={[0, 5]}
                placeholder="اختر قناة الترحيب..."
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">نوع الرسالة</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'text', label: 'نص بسيط', icon: MessageSquare },
                  { id: 'embed', label: 'Embed كامل', icon: Eye },
                ].map((t) => {
                  const Icon = t.icon;
                  const isSelected = data.type === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => updateField('type', t.id)}
                      className={cn(
                        'p-3 rounded-xl border-2 transition-all flex items-center gap-2 justify-center',
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-border bg-card hover:border-border/80',
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-sm font-medium">{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40">
              <Switch
                checked={data.mentionUser}
                onCheckedChange={(v) => updateField('mentionUser', v)}
              />
              <div className="flex-1">
                <div className="text-sm font-medium">منشن العضو</div>
                <div className="text-xs text-muted-foreground">
                  يظهر إشعار للعضو لما يدخل
                </div>
              </div>
            </div>
          </div>
        </Card>

        {!isEmbed ? (
          <Card className="p-5">
            <h3 className="font-bold mb-3">نص الرسالة</h3>
            <textarea
              value={data.text?.content || ''}
              onChange={(e) => updateField('text.content', e.target.value)}
              placeholder="أهلاً {user} في {server}!"
              rows={4}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm resize-y mb-3"
              maxLength={2000}
            />
            <VariablesHelper variables={VARIABLES} />
          </Card>
        ) : (
          <Card className="p-5 space-y-4">
            <h3 className="font-bold">محتوى الإيمبيد</h3>
            <Separator />

            <div>
              <label className="text-sm font-medium mb-2 block">العنوان</label>
              <Input
                value={data.embed?.title || ''}
                onChange={(e) => updateField('embed.title', e.target.value)}
                placeholder="مرحباً {user}! 👋"
                maxLength={256}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">الوصف</label>
              <textarea
                value={data.embed?.description || ''}
                onChange={(e) => updateField('embed.description', e.target.value)}
                placeholder="أهلاً وسهلاً في **{server}**"
                rows={4}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm resize-y"
                maxLength={4000}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Footer</label>
              <Input
                value={data.embed?.footer || ''}
                onChange={(e) => updateField('embed.footer', e.target.value)}
                placeholder="العضو رقم {count}"
                maxLength={2048}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">لون الإيمبيد</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={intToHexColor(data.embed?.color || 0x9b59b6)}
                  onChange={(e) => updateField('embed.color', hexToIntColor(e.target.value))}
                  className="w-12 h-10 rounded-lg border border-border cursor-pointer"
                />
                <Input
                  value={intToHexColor(data.embed?.color || 0x9b59b6)}
                  onChange={(e) => updateField('embed.color', hexToIntColor(e.target.value))}
                  className="flex-1 num"
                />
              </div>
            </div>

            <VariablesHelper variables={VARIABLES} />
          </Card>
        )}
      </div>

      <div className="lg:sticky lg:top-4 lg:self-start">
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Eye className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-bold text-sm">معاينة مباشرة</h3>
          </div>

          <EmbedPreview
            embed={isEmbed ? data.embed : {}}
            text={!isEmbed ? data.text?.content : null}
            replacePlaceholders={replacePreviewVars}
            avatarLetter="L"
            username="Lyn"
          />

          <p className="text-xs text-muted-foreground mt-3 text-center">
            هذا شكل الرسالة لما يدخل عضو جديد
          </p>
        </Card>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
//  Leave Tab
// ────────────────────────────────────────────────────────────

function LeaveTab({ data, updateField }) {
  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="font-bold mb-1">رسائل الوداع</h3>
            <p className="text-sm text-muted-foreground">إرسال رسالة لما يغادر عضو السيرفر</p>
          </div>
          <Switch
            checked={data.leaveEnabled}
            onCheckedChange={(v) => updateField('leaveEnabled', v)}
            size="lg"
          />
        </div>

        {data.leaveEnabled && (
          <div className="space-y-4 animate-lyn-fade-up">
            <Separator />

            <div>
              <label className="text-sm font-medium mb-2 block">قناة الوداع</label>
              <ChannelPicker
                value={data.leaveChannel}
                onChange={(v) => updateField('leaveChannel', v)}
                types={[0, 5]}
                placeholder="اختر قناة الوداع..."
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">نص الرسالة</label>
              <textarea
                value={data.leaveMessage?.content || ''}
                onChange={(e) => updateField('leaveMessage.content', e.target.value)}
                placeholder="👋 وداعاً {username}، كنت معنا {duration}"
                rows={3}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm resize-y mb-3"
                maxLength={2000}
              />
              <VariablesHelper variables={VARIABLES} />
            </div>
          </div>
        )}
      </Card>

      {data.leaveEnabled && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Eye className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-bold text-sm">معاينة الوداع</h3>
          </div>
          <EmbedPreview
            text={data.leaveMessage?.content}
            replacePlaceholders={replacePreviewVars}
            avatarLetter="L"
            username="Lyn"
          />
        </Card>
      )}
    </div>
  );
}

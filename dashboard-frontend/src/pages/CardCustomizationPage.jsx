/**
 * ═══════════════════════════════════════════════════════════
 *  Card Customization Page — صفحة تخصيص البطاقة الأسطورية
 *  المسار: dashboard-frontend/src/pages/CardCustomizationPage.jsx
 *
 *  ✨ الصفحة الرئيسية للمستخدم — تشمل:
 *   - معاينة لحظية للبطاقة (sticky في الأعلى)
 *   - 4 تبويبات: الخلفية / الألوان / الشارات / التأثيرات
 *   - حفظ تلقائي مع debounce
 *   - حالة الاشتراك (الفئة + المتبقي + زر ترقية)
 *   - بانر "اشترك الآن" للمستخدمين المجانيين
 * ═══════════════════════════════════════════════════════════
 */

import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Palette,
  Image as ImageIcon,
  Award,
  Sparkles,
  RotateCcw,
  Save,
  Crown,
  Clock,
  Lock,
  CheckCircle2,
  ExternalLink,
  Gift,
  Loader2,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { SettingsPageHeader } from '@/components/shared/SettingsPageHeader';
import { PageLoading } from '@/components/shared/PageLoading';
import { useAuthStore } from '@/store/authStore';
import { CardPreview } from '@/components/card/CardPreview';
import { TierBadge, TierBadgeLarge } from '@/components/card/TierBadge';
import { BackgroundPicker } from '@/components/card/BackgroundPicker';
import { ThemePicker } from '@/components/card/ThemePicker';
import { BadgePicker } from '@/components/card/BadgePicker';
import { EffectsPicker } from '@/components/card/EffectsPicker';
import {
  useCardMe,
  useSaveCardSettings,
  useResetCardSettings,
} from '@/hooks/useCardData';
import { getTier, formatDaysLeft } from '@/lib/cardPlans';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ════════════════════════════════════════════════════════════
//  PAGE
// ════════════════════════════════════════════════════════════

export default function CardCustomizationPage() {
  const { user } = useAuthStore();

  const { data: cardData, isLoading } = useCardMe();
  const { mutate: saveSettings, isPending: isSaving } = useSaveCardSettings();
  const { mutate: resetSettings, isPending: isResetting } = useResetCardSettings();

  const [activeTab, setActiveTab] = useState('background');
  const [showResetDialog, setShowResetDialog] = useState(false);

  // ─── State محلي للإعدادات (للمعاينة اللحظية) ───
  const [localSettings, setLocalSettings] = useState(null);

  // ─── ضبط الـ state المحلي عند تحميل البيانات ───
  useEffect(() => {
    if (cardData?.settings) {
      setLocalSettings({
        background_id: cardData.settings.background_id || 'default',
        custom_background_url: cardData.settings.custom_background_url || null,
        theme_id: cardData.settings.theme_id || 'amber',
        custom_colors: cardData.settings.custom_colors || {},
        badges: Array.isArray(cardData.settings.badges)
          ? cardData.settings.badges
          : [],
        effects:
          typeof cardData.settings.effects === 'object'
            ? cardData.settings.effects
            : {},
      });
    }
  }, [cardData?.settings]);

  // ─── isDirty: هل في تغييرات غير محفوظة؟ ───
  const isDirty = useMemo(() => {
    if (!cardData?.settings || !localSettings) return false;
    const original = cardData.settings;
    return (
      localSettings.background_id !== (original.background_id || 'default') ||
      localSettings.custom_background_url !==
        (original.custom_background_url || null) ||
      localSettings.theme_id !== (original.theme_id || 'amber') ||
      JSON.stringify(localSettings.custom_colors) !==
        JSON.stringify(original.custom_colors || {}) ||
      JSON.stringify(localSettings.badges) !==
        JSON.stringify(original.badges || []) ||
      JSON.stringify(localSettings.effects) !==
        JSON.stringify(original.effects || {})
    );
  }, [localSettings, cardData?.settings]);

  // ════════════════════════════════════════════
  //  Loading
  // ════════════════════════════════════════════

  if (isLoading || !localSettings) {
    return <PageLoading variant="default" />;
  }

  const currentTier = cardData?.currentTier || 'free';
  const subscription = cardData?.subscription;
  const tierData = getTier(currentTier);
  const isPremium = currentTier !== 'free';

  // ════════════════════════════════════════════
  //  Handlers
  // ════════════════════════════════════════════

  const handleSave = () => {
    saveSettings(localSettings, {
      onSuccess: () => {
        // الـ hook يحدّث الـ cache تلقائياً
      },
    });
  };

  const handleReset = () => {
    resetSettings(null, {
      onSuccess: () => {
        setShowResetDialog(false);
      },
    });
  };

  const updateField = (key, value) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
  };

  // ════════════════════════════════════════════
  //  Render
  // ════════════════════════════════════════════

  return (
    <>
      <SettingsPageHeader
        icon={<Palette />}
        title="تخصيص بطاقة المستوى"
        description="صمّم بطاقتك الأسطورية الخاصة"
        actions={
          <div className="flex items-center gap-2">
            <TierBadge tier={currentTier} size="md" />
          </div>
        }
      />

      {/* ═══════════════════════════════════════════
         بانر حالة الاشتراك
      ═══════════════════════════════════════════ */}
      <SubscriptionStatusBanner
        subscription={subscription}
        currentTier={currentTier}
        isPremium={isPremium}
      />

      {/* ═══════════════════════════════════════════
         معاينة البطاقة (Sticky)
      ═══════════════════════════════════════════ */}
      <div className="sticky top-0 z-20 -mx-6 px-6 py-4 mb-6 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-500" />
            معاينة لحظية
          </h3>

          {isDirty && (
            <Badge
              variant="default"
              size="sm"
              className="bg-amber-500/15 text-amber-600 dark:text-amber-400 animate-pulse"
            >
              تغييرات غير محفوظة
            </Badge>
          )}
        </div>

        <CardPreview
          settings={localSettings}
          tier={currentTier}
          userAvatarUrl={user?.avatar_url}
          previewData={{
            username: user?.username || user?.global_name || 'You',
            level: 12,
            rank: 1,
            currentXP: 1240,
            requiredXP: 3000,
            totalXP: 4240,
            progressPercent: 41,
          }}
        />
      </div>

      {/* ═══════════════════════════════════════════
         شريط الحفظ
      ═══════════════════════════════════════════ */}
      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <div className="flex items-center gap-2">
          <Button
            onClick={handleSave}
            disabled={!isDirty || isSaving}
            size="default"
            className="lyn-gradient text-white"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                جاري الحفظ...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                حفظ التغييرات
              </>
            )}
          </Button>

          {isDirty && (
            <Button
              onClick={() => {
                if (cardData?.settings) {
                  setLocalSettings({
                    background_id: cardData.settings.background_id || 'default',
                    custom_background_url:
                      cardData.settings.custom_background_url || null,
                    theme_id: cardData.settings.theme_id || 'amber',
                    custom_colors: cardData.settings.custom_colors || {},
                    badges: Array.isArray(cardData.settings.badges)
                      ? cardData.settings.badges
                      : [],
                    effects:
                      typeof cardData.settings.effects === 'object'
                        ? cardData.settings.effects
                        : {},
                  });
                }
              }}
              variant="outline"
              size="default"
            >
              تراجع
            </Button>
          )}
        </div>

        {isPremium && (
          <Button
            onClick={() => setShowResetDialog(true)}
            variant="outline"
            size="default"
            className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
          >
            <RotateCcw className="w-4 h-4" />
            إعادة تعيين
          </Button>
        )}
      </div>

      {/* ═══════════════════════════════════════════
         التبويبات
      ═══════════════════════════════════════════ */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList variant="pills" className="flex-wrap gap-2 mb-6">
          <TabsTrigger value="background" variant="pills">
            <ImageIcon className="w-4 h-4" />
            <span>الخلفية</span>
          </TabsTrigger>

          <TabsTrigger value="theme" variant="pills">
            <Palette className="w-4 h-4" />
            <span>الألوان</span>
          </TabsTrigger>

          <TabsTrigger value="badges" variant="pills">
            <Award className="w-4 h-4" />
            <span>الشارات</span>
            {tierData.features.badges > 0 && (
              <Badge variant="outline" size="sm" className="ms-1">
                {localSettings.badges.length}/{tierData.features.badges}
              </Badge>
            )}
          </TabsTrigger>

          <TabsTrigger value="effects" variant="pills">
            <Sparkles className="w-4 h-4" />
            <span>التأثيرات</span>
            {tierData.features.effects > 0 && (
              <Badge variant="outline" size="sm" className="ms-1">
                {
                  Object.entries(localSettings.effects).filter(([_, v]) => !!v)
                    .length
                }
                /{tierData.features.effects}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ─── الخلفية ─── */}
        <TabsContent value="background">
          <Card className="p-5">
            {currentTier === 'free' ? (
              <FreeFeatureLock featureName="تخصيص الخلفية" />
            ) : (
              <BackgroundPicker
                currentBackgroundId={localSettings.background_id}
                customBackgroundUrl={localSettings.custom_background_url}
                userTier={currentTier}
                onSelect={(bgId) => {
                  updateField('background_id', bgId);
                  updateField('custom_background_url', null);
                }}
                onCustomUrl={(url) => {
                  updateField('custom_background_url', url);
                  if (url) updateField('background_id', 'default');
                }}
              />
            )}
          </Card>
        </TabsContent>

        {/* ─── الألوان ─── */}
        <TabsContent value="theme">
          <Card className="p-5">
            {currentTier === 'free' ? (
              <FreeFeatureLock featureName="تخصيص الألوان" />
            ) : (
              <ThemePicker
                currentThemeId={localSettings.theme_id}
                customColors={localSettings.custom_colors}
                userTier={currentTier}
                onSelectTheme={(themeId) => {
                  updateField('theme_id', themeId);
                  updateField('custom_colors', {});
                }}
                onCustomColors={(colors) => {
                  updateField('custom_colors', colors || {});
                }}
              />
            )}
          </Card>
        </TabsContent>

        {/* ─── الشارات ─── */}
        <TabsContent value="badges">
          <Card className="p-5">
            <BadgePicker
              selectedBadges={localSettings.badges}
              userTier={currentTier}
              onChange={(badges) => updateField('badges', badges)}
            />
          </Card>
        </TabsContent>

        {/* ─── التأثيرات ─── */}
        <TabsContent value="effects">
          <Card className="p-5">
            <EffectsPicker
              effects={localSettings.effects}
              userTier={currentTier}
              onChange={(effects) => updateField('effects', effects)}
            />
          </Card>
        </TabsContent>
      </Tabs>

      {/* ═══════════════════════════════════════════
         Dialog: إعادة التعيين
      ═══════════════════════════════════════════ */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-red-500" />
              إعادة تعيين البطاقة
            </DialogTitle>
            <DialogDescription>
              هل أنت متأكد من إعادة جميع إعدادات بطاقتك للشكل الافتراضي؟
              <br />
              سيتم حذف الخلفية والألوان والشارات والتأثيرات.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              onClick={() => setShowResetDialog(false)}
              variant="outline"
              disabled={isResetting}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleReset}
              variant="destructive"
              disabled={isResetting}
            >
              {isResetting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  جاري التعيين...
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4" />
                  تأكيد الإعادة
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ════════════════════════════════════════════════════════════
//  Subscription Status Banner
// ════════════════════════════════════════════════════════════

function SubscriptionStatusBanner({ subscription, currentTier, isPremium }) {
  // ─── المجاني — بانر اشترك الآن ───
  if (!isPremium) {
    return (
      <Card className="relative overflow-hidden mb-6 border-2 border-violet-500/30 bg-gradient-to-br from-violet-500/10 via-pink-500/10 to-violet-500/10">
        <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />

        <div className="relative p-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center flex-shrink-0">
            <Crown className="w-7 h-7 text-white" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg mb-1 flex items-center gap-2 flex-wrap">
              ✨ افتح كل المميزات الأسطورية
            </h3>
            <p className="text-sm text-muted-foreground">
              اشترك من <span className="font-bold text-foreground">$1.99/شهر</span>{' '}
              فقط واحصل على خلفيات، ألوان مخصصة، شارات، وتأثيرات بصرية مذهلة
            </p>
          </div>

          <Button
            asChild
            size="lg"
            className="lyn-gradient text-white flex-shrink-0 lyn-glow"
          >
            <Link to="/dashboard/card/subscription">
              <Sparkles className="w-4 h-4" />
              اشترك الآن
            </Link>
          </Button>
        </div>
      </Card>
    );
  }

  // ─── المشترك — بانر معلومات الاشتراك ───
  const daysLeft = subscription?.days_left || 0;
  const isExpiringSoon = daysLeft > 0 && daysLeft <= 7;
  const isGift = subscription?.is_gift;

  return (
    <Card
      className={cn(
        'mb-6 p-5 border-2',
        currentTier === 'legendary' &&
          'border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-amber-500/10',
        currentTier === 'advanced' && 'border-slate-400/40 bg-slate-400/5',
        currentTier === 'basic' && 'border-amber-700/40 bg-amber-700/5',
      )}
    >
      <div className="flex items-start gap-4 flex-wrap sm:flex-nowrap">
        <TierBadgeLarge tier={currentTier} className="flex-1 min-w-[200px]" />

        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          {isGift && (
            <Badge
              variant="default"
              className="bg-pink-500/15 text-pink-500 border-pink-500/30"
            >
              <Gift className="w-3.5 h-3.5" />
              اشتراك هدية
            </Badge>
          )}

          <div className="flex items-center gap-2 text-sm">
            <Clock
              className={cn(
                'w-4 h-4',
                isExpiringSoon ? 'text-amber-500' : 'text-muted-foreground',
              )}
            />
            <span
              className={cn(
                'font-bold',
                isExpiringSoon && 'text-amber-500',
              )}
            >
              {formatDaysLeft(daysLeft)}
            </span>
          </div>

          {isExpiringSoon && (
            <Button asChild size="sm" variant="outline">
              <Link to="/dashboard/card/subscription">
                جدّد الآن
              </Link>
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

// ════════════════════════════════════════════════════════════
//  Free Feature Lock
// ════════════════════════════════════════════════════════════

function FreeFeatureLock({ featureName }) {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-violet-500/20 to-pink-500/20 flex items-center justify-center mb-4">
        <Lock className="w-8 h-8 text-violet-500" />
      </div>

      <h3 className="font-bold text-lg mb-2">{featureName} متاحة للمشتركين</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
        اشترك الآن واحصل على تجربة تخصيص أسطورية كاملة من $1.99/شهر فقط
      </p>

      <Button asChild size="lg" className="lyn-gradient text-white">
        <Link to="/dashboard/card/subscription">
          <Sparkles className="w-4 h-4" />
          استعرض الفئات
        </Link>
      </Button>
    </div>
  );
}
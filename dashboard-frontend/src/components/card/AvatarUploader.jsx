/**
 * ═══════════════════════════════════════════════════════════
 *  Avatar Uploader — رفع صورة شخصية مخصصة
 *  المسار: dashboard-frontend/src/components/card/AvatarUploader.jsx
 *
 *  ✨ متاح للمتقدمة والأسطورية فقط
 *  - رفع رابط صورة (Imgur, Discord CDN, إلخ)
 *  - معاينة قبل التطبيق
 *  - زر للرجوع لصورة Discord
 * ═══════════════════════════════════════════════════════════
 */

import { useState, useEffect } from 'react';
import {
  Upload,
  Image as ImageIcon,
  X,
  Lock,
  Check,
  RotateCcw,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';

/**
 * @param {object} props
 * @param {string} props.currentAvatarUrl - الرابط الحالي للصورة المخصصة (null = صورة Discord)
 * @param {string} props.userTier - 'free' | 'basic' | 'advanced' | 'legendary'
 * @param {(url: string|null) => void} props.onChange
 */
export function AvatarUploader({
  currentAvatarUrl = null,
  userTier = 'free',
  onChange,
  className,
}) {
  const { user } = useAuthStore();

  const canUpload = userTier === 'advanced' || userTier === 'legendary';
  const discordAvatarUrl = user?.avatar_url || null;

  const [draftUrl, setDraftUrl] = useState(currentAvatarUrl || '');
  const [previewUrl, setPreviewUrl] = useState(currentAvatarUrl || '');
  const [error, setError] = useState('');
  const [previewLoaded, setPreviewLoaded] = useState(false);
  const [previewError, setPreviewError] = useState(false);

  useEffect(() => {
    setDraftUrl(currentAvatarUrl || '');
    setPreviewUrl(currentAvatarUrl || '');
    setError('');
    setPreviewError(false);
    setPreviewLoaded(false);
  }, [currentAvatarUrl]);

  // ─── تحقق من الرابط ───
  const validateUrl = (url) => {
    if (!url.trim()) {
      return { valid: false, error: 'الرابط مطلوب' };
    }

    if (!/^https?:\/\//i.test(url)) {
      return { valid: false, error: 'الرابط يجب أن يبدأ بـ http:// أو https://' };
    }

    if (!/\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url)) {
      return {
        valid: false,
        error: 'الرابط يجب أن ينتهي بـ .jpg / .png / .gif / .webp',
      };
    }

    return { valid: true };
  };

  // ─── معاينة (بدون حفظ) ───
  const handlePreview = () => {
    const check = validateUrl(draftUrl);
    if (!check.valid) {
      setError(check.error);
      return;
    }

    setError('');
    setPreviewUrl(draftUrl);
    setPreviewLoaded(false);
    setPreviewError(false);
  };

  // ─── تطبيق (حفظ) ───
  const handleApply = () => {
    const check = validateUrl(draftUrl);
    if (!check.valid) {
      setError(check.error);
      return;
    }

    setError('');
    onChange?.(draftUrl);
  };

  // ─── إعادة لصورة Discord ───
  const handleReset = () => {
    setDraftUrl('');
    setPreviewUrl('');
    setError('');
    onChange?.(null);
  };

  // ─── ميزة غير متاحة ───
  if (!canUpload) {
    return (
      <Card className={cn('p-8 text-center border-2 border-dashed', className)}>
        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-violet-500/20 to-pink-500/20 flex items-center justify-center mb-4">
          <Lock className="w-8 h-8 text-violet-500" />
        </div>

        <h3 className="font-bold text-lg mb-2">الصورة الشخصية المخصصة</h3>
        <p className="text-sm text-muted-foreground mb-2">
          استبدل صورة Discord بصورة شخصية مخصصة لبطاقتك
        </p>
        <p className="text-xs text-muted-foreground mb-5">
          متاحة في الفئة المتقدمة والأسطورية
        </p>

        <Badge
          variant="default"
          className="bg-gradient-to-r from-violet-500/15 to-pink-500/15 text-violet-500"
        >
          <Sparkles className="w-3 h-3" />
          ترقّ للحصول على هذه الميزة
        </Badge>
      </Card>
    );
  }

  const isUsingCustom = !!currentAvatarUrl;

  return (
    <div className={cn('space-y-5', className)}>
      {/* ═══ معاينة الصور ═══ */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <ImageIcon className="w-4 h-4 text-violet-500" />
          <h4 className="font-semibold text-sm">معاينة الصور</h4>
          {isUsingCustom && (
            <Badge variant="default" size="sm" className="bg-violet-500/15 text-violet-500">
              مخصصة نشطة
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* ─── صورة Discord (الأصلية) ─── */}
          <div className="text-center">
            <div className="relative inline-block mb-2">
              <div
                className={cn(
                  'w-24 h-24 rounded-full border-4 overflow-hidden transition-all',
                  !isUsingCustom
                    ? 'border-primary ring-4 ring-primary/30 scale-105'
                    : 'border-border opacity-60',
                )}
              >
                {discordAvatarUrl ? (
                  <img
                    src={discordAvatarUrl}
                    alt="Discord Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-violet-500/20 to-pink-500/20 flex items-center justify-center text-2xl">
                    👤
                  </div>
                )}
              </div>

              {!isUsingCustom && (
                <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-primary flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
            <p className="text-xs font-bold">صورة Discord</p>
            <p className="text-[10px] text-muted-foreground">
              {!isUsingCustom ? 'النشطة حالياً' : 'الافتراضية'}
            </p>
          </div>

          {/* ─── الصورة المخصصة ─── */}
          <div className="text-center">
            <div className="relative inline-block mb-2">
              <div
                className={cn(
                  'w-24 h-24 rounded-full border-4 overflow-hidden transition-all',
                  isUsingCustom && !previewError
                    ? 'border-primary ring-4 ring-primary/30 scale-105'
                    : 'border-dashed border-border opacity-60',
                )}
              >
                {previewUrl && !previewError ? (
                  <img
                    src={previewUrl}
                    alt="Custom Avatar"
                    className={cn(
                      'w-full h-full object-cover transition-opacity',
                      previewLoaded ? 'opacity-100' : 'opacity-0',
                    )}
                    onLoad={() => setPreviewLoaded(true)}
                    onError={() => setPreviewError(true)}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center">
                    {previewError ? (
                      <AlertCircle className="w-6 h-6 text-rose-500" />
                    ) : (
                      <Upload className="w-6 h-6 text-muted-foreground" />
                    )}
                  </div>
                )}

                {previewUrl && !previewLoaded && !previewError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-card/50">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>

              {isUsingCustom && !previewError && (
                <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-primary flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
            <p className="text-xs font-bold">صورة مخصصة</p>
            <p className="text-[10px] text-muted-foreground">
              {previewError
                ? 'فشل التحميل'
                : isUsingCustom
                ? 'النشطة حالياً'
                : previewUrl
                ? 'معاينة'
                : 'لا توجد'}
            </p>
          </div>
        </div>
      </Card>

      {/* ═══ رفع رابط الصورة ═══ */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Upload className="w-4 h-4 text-violet-500" />
          <h4 className="font-semibold text-sm">رابط الصورة</h4>
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="https://i.imgur.com/your-image.png"
            value={draftUrl}
            onChange={(e) => {
              setDraftUrl(e.target.value);
              setError('');
            }}
            className="font-mono text-xs"
            dir="ltr"
          />
          <Button onClick={handlePreview} size="default" variant="outline">
            <ImageIcon className="w-4 h-4" />
            معاينة
          </Button>
        </div>

        {error && (
          <div className="flex items-start gap-2 text-xs text-rose-500 bg-rose-500/10 border border-rose-500/30 rounded-lg p-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {previewError && (
          <div className="flex items-start gap-2 text-xs text-rose-500 bg-rose-500/10 border border-rose-500/30 rounded-lg p-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>فشل تحميل الصورة. تأكد من صحة الرابط.</span>
          </div>
        )}

        {previewLoaded && !previewError && draftUrl !== currentAvatarUrl && (
          <div className="flex items-center justify-between gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
            <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
              <Check className="w-4 h-4" />
              <span>الصورة محمّلة بنجاح. اضغط "تطبيق" للحفظ.</span>
            </div>
            <Button
              onClick={handleApply}
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Check className="w-3 h-3" />
              تطبيق
            </Button>
          </div>
        )}

        {/* ─── زر الإعادة لصورة Discord ─── */}
        {isUsingCustom && (
          <Button
            onClick={handleReset}
            variant="outline"
            size="sm"
            className="w-full"
          >
            <RotateCcw className="w-4 h-4" />
            استخدام صورة Discord
          </Button>
        )}

        {/* ─── معلومات مساعدة ─── */}
        <div className="space-y-2 pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground">
            💡 <strong>كيف ترفع صورة؟</strong>
          </p>
          <ul className="text-xs text-muted-foreground space-y-1 mr-4 list-disc">
            <li>
              <strong>Imgur</strong>: ارفع على{' '}
              <span className="text-violet-500 underline" dir="ltr">
                imgur.com
              </span>{' '}
              ثم انسخ رابط مباشر بنهاية .png
            </li>
            <li>
              <strong>Discord</strong>: ارفع الصورة في قناة، اضغط right-click عليها واختر "Copy Link"
            </li>
            <li>
              الصورة الأمثل: <strong>مربعة</strong> بدقة 256×256 أو أعلى
            </li>
            <li>الصيغ المدعومة: JPG, PNG, GIF, WEBP</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}
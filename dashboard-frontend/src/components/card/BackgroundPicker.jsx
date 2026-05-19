/**
 * ═══════════════════════════════════════════════════════════
 *  Background Picker v2 — اختيار خلفية البطاقة بتصميم محسّن
 *  المسار: dashboard-frontend/src/components/card/BackgroundPicker.jsx
 * ═══════════════════════════════════════════════════════════
 */

import { useState } from 'react';
import { Check, Lock, Upload, X, ImageOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import { BACKGROUNDS, tierMeetsRequirement } from '@/lib/cardAssets';
import { getTier } from '@/lib/cardPlans';

export function BackgroundPicker({
  currentBackgroundId = 'default',
  customBackgroundUrl = null,
  userTier = 'free',
  onSelect,
  onCustomUrl,
  className,
}) {
  const [customUrl, setCustomUrl] = useState(customBackgroundUrl || '');
  const [urlError, setUrlError] = useState('');

  const canCustomBg = userTier === 'advanced' || userTier === 'legendary';

  const available = BACKGROUNDS.filter((bg) =>
    tierMeetsRequirement(userTier, bg.minTier),
  );
  const locked = BACKGROUNDS.filter(
    (bg) => !tierMeetsRequirement(userTier, bg.minTier),
  );

  const handleApplyCustomUrl = () => {
    if (!customUrl.trim()) {
      onCustomUrl?.(null);
      setUrlError('');
      return;
    }

    const valid = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)/i.test(customUrl);
    if (!valid) {
      setUrlError('الرابط يجب أن ينتهي بـ .jpg / .png / .gif / .webp');
      return;
    }

    setUrlError('');
    onCustomUrl?.(customUrl);
  };

  const handleClearCustomUrl = () => {
    setCustomUrl('');
    setUrlError('');
    onCustomUrl?.(null);
  };

  const hasCustomBg = !!customBackgroundUrl;

  return (
    <div className={cn('space-y-5', className)}>
      {/* ═══ خلفية شخصية مرفوعة ═══ */}
      {canCustomBg && (
        <Card className="p-4 space-y-3 relative overflow-hidden">
          {/* ─── معاينة الخلفية المخصصة الحالية ─── */}
          {hasCustomBg && (
            <div
              className="absolute inset-0 opacity-10 pointer-events-none"
              style={{
                backgroundImage: `url(${customBackgroundUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
          )}

          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Upload className="w-4 h-4 text-violet-500" />
              <span className="font-semibold text-sm">خلفية شخصية</span>
            </div>
            <Badge variant="default" size="sm" className="bg-violet-500/15 text-violet-500">
              متاح في فئتك
            </Badge>
          </div>

          <div className="relative flex gap-2">
            <Input
              placeholder="https://example.com/my-bg.png"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              className="font-mono text-xs"
              dir="ltr"
            />
            <Button onClick={handleApplyCustomUrl} size="default">
              تطبيق
            </Button>
            {hasCustomBg && (
              <Button onClick={handleClearCustomUrl} size="default" variant="outline">
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          {urlError && (
            <p className="relative text-xs text-red-500">{urlError}</p>
          )}

          <p className="relative text-xs text-muted-foreground">
            ارفع الصورة على Imgur أو خدمة استضافة، ثم انسخ الرابط هنا.
            دقة مقترحة: 1600×400
          </p>
        </Card>
      )}

      {/* ═══ الخلفيات المتاحة ═══ */}
      <div>
        <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
          <span>الخلفيات الجاهزة</span>
          <Badge variant="outline" size="sm">
            {available.length} متاحة
          </Badge>
        </h4>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {available.map((bg) => (
            <BackgroundCard
              key={bg.id}
              bg={bg}
              isSelected={!hasCustomBg && currentBackgroundId === bg.id}
              disabled={false}
              onClick={() => {
                onSelect?.(bg.id);
                onCustomUrl?.(null);
              }}
            />
          ))}
        </div>
      </div>

      {/* ═══ الخلفيات المقفولة ═══ */}
      {locked.length > 0 && (
        <div>
          <h4 className="font-semibold text-sm mb-3 flex items-center gap-2 text-muted-foreground">
            <Lock className="w-4 h-4" />
            <span>تحتاج ترقية</span>
            <Badge variant="outline" size="sm">
              {locked.length} مقفولة
            </Badge>
          </h4>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {locked.map((bg) => (
              <BackgroundCard key={bg.id} bg={bg} isSelected={false} disabled={true} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  Background Card — مع loading state وerror handling
// ════════════════════════════════════════════════════════════

function BackgroundCard({ bg, isSelected, disabled, onClick }) {
  const requiredTier = getTier(bg.minTier);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  return (
    <button
      onClick={!disabled ? onClick : undefined}
      disabled={disabled}
      className={cn(
        'group relative aspect-video rounded-xl overflow-hidden border-2 transition-all',
        isSelected
          ? 'border-primary ring-2 ring-primary/50 scale-[1.02]'
          : 'border-border hover:border-primary/50 hover:scale-[1.01]',
        disabled && 'opacity-50 cursor-not-allowed',
      )}
    >
      {/* ─── خلفية placeholder وقت التحميل ─── */}
      {!imageLoaded && !imageError && bg.url && (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-900 animate-pulse flex items-center justify-center">
          <span className="text-2xl opacity-50">{bg.emoji}</span>
        </div>
      )}

      {/* ─── الصورة ─── */}
      {bg.url && !imageError ? (
        <img
          src={bg.url}
          alt={bg.name}
          className={cn(
            'w-full h-full object-cover transition-opacity duration-300',
            imageLoaded ? 'opacity-100' : 'opacity-0',
          )}
          loading="lazy"
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
        />
      ) : bg.url && imageError ? (
        <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-900 flex flex-col items-center justify-center gap-1">
          <ImageOff className="w-6 h-6 text-muted-foreground/50" />
          <span className="text-[10px] text-muted-foreground">فشل التحميل</span>
        </div>
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 flex items-center justify-center">
          <span className="text-3xl">{bg.emoji}</span>
          {bg.id === 'default' && (
            <Badge
              variant="default"
              size="sm"
              className="absolute top-1.5 left-1.5 bg-blue-500/80 text-white text-[9px] px-1.5"
            >
              FREE
            </Badge>
          )}
        </div>
      )}

      {/* ─── Overlay دائم ─── */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

      {/* ─── الاسم ─── */}
      <div className="absolute bottom-0 inset-x-0 p-2 text-right z-10">
        <p className="text-xs font-bold text-white truncate drop-shadow-lg">
          {bg.emoji} {bg.name}
        </p>
      </div>

      {/* ─── علامة الاختيار ─── */}
      {isSelected && (
        <div className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-lg z-20">
          <Check className="w-4 h-4 text-white" />
        </div>
      )}

      {/* ─── القفل ─── */}
      {disabled && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px] flex flex-col items-center justify-center gap-1 z-20">
          <Lock className="w-5 h-5 text-white" />
          <span className="text-[10px] font-bold text-white">
            {requiredTier.icon} {requiredTier.name}
          </span>
        </div>
      )}
    </button>
  );
}
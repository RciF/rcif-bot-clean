/**
 * ═══════════════════════════════════════════════════════════
 *  Theme Picker — اختيار ألوان البطاقة
 *  المسار: dashboard-frontend/src/components/card/ThemePicker.jsx
 *
 *  - ثيمات جاهزة (5-12 حسب الفئة)
 *  - Color Picker مخصص (Advanced/Legendary فقط)
 * ═══════════════════════════════════════════════════════════
 */

import { useState, useEffect } from 'react';
import { Check, Lock, Palette, RotateCcw } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { THEMES, tierMeetsRequirement } from '@/lib/cardAssets';
import { getTier } from '@/lib/cardPlans';

/**
 * @param {string} props.currentThemeId
 * @param {object} props.customColors - { accent, secondary, bg, bgCard }
 * @param {string} props.userTier
 * @param {(themeId: string) => void} props.onSelectTheme
 * @param {(colors: object|null) => void} props.onCustomColors
 */
export function ThemePicker({
  currentThemeId = 'amber',
  customColors = {},
  userTier = 'free',
  onSelectTheme,
  onCustomColors,
  className,
}) {
  const canCustomColors = userTier === 'advanced' || userTier === 'legendary';
  const hasCustomColors =
    customColors && Object.keys(customColors).length > 0 && customColors.accent;

  const available = THEMES.filter((t) =>
    tierMeetsRequirement(userTier, t.minTier),
  );
  const locked = THEMES.filter((t) => !tierMeetsRequirement(userTier, t.minTier));

  return (
    <div className={cn('space-y-5', className)}>
      {/* ═══════════════════════════════════════════
         Color Picker مخصص (Advanced/Legendary فقط)
      ═══════════════════════════════════════════ */}
      {canCustomColors && (
        <CustomColorsPicker
          customColors={customColors}
          onChange={onCustomColors}
        />
      )}

      {/* ═══════════════════════════════════════════
         الثيمات الجاهزة
      ═══════════════════════════════════════════ */}
      <div>
        <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
          <span>الثيمات الجاهزة</span>
          <Badge variant="outline" size="sm">
            {available.length} متاح
          </Badge>
        </h4>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {available.map((theme) => (
            <ThemeCard
              key={theme.id}
              theme={theme}
              isSelected={!hasCustomColors && currentThemeId === theme.id}
              disabled={false}
              onClick={() => {
                onSelectTheme?.(theme.id);
                onCustomColors?.(null);
              }}
            />
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════
         الثيمات المقفولة
      ═══════════════════════════════════════════ */}
      {locked.length > 0 && (
        <div>
          <h4 className="font-semibold text-sm mb-3 flex items-center gap-2 text-muted-foreground">
            <Lock className="w-4 h-4" />
            <span>تحتاج ترقية</span>
            <Badge variant="outline" size="sm">
              {locked.length} مقفول
            </Badge>
          </h4>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {locked.map((theme) => (
              <ThemeCard key={theme.id} theme={theme} disabled={true} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  Theme Card
// ════════════════════════════════════════════════════════════

function ThemeCard({ theme, isSelected, disabled, onClick }) {
  const requiredTier = getTier(theme.minTier);

  return (
    <button
      onClick={!disabled ? onClick : undefined}
      disabled={disabled}
      className={cn(
        'group relative aspect-square rounded-xl overflow-hidden border-2 transition-all',
        isSelected
          ? 'border-primary ring-2 ring-primary/50 scale-[1.05]'
          : 'border-border hover:border-primary/50',
        disabled && 'opacity-50 cursor-not-allowed',
      )}
      style={{ background: theme.colors.bgCard }}
    >
      {/* ─── معاينة الألوان (gradient bars) ─── */}
      <div className="absolute inset-0 flex flex-col">
        <div
          className="flex-1"
          style={{
            background: `linear-gradient(135deg, ${theme.colors.accent}, ${theme.colors.secondary})`,
          }}
        />
        <div className="h-1/3" style={{ background: theme.colors.bgCard }} />
      </div>

      {/* ─── اسم الثيم ─── */}
      <div className="absolute bottom-1 inset-x-0 text-center">
        <span className="text-[10px] font-bold text-white drop-shadow-lg">
          {theme.emoji} {theme.name}
        </span>
      </div>

      {/* ─── علامة الاختيار ─── */}
      {isSelected && (
        <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
          <Check className="w-3 h-3 text-white" />
        </div>
      )}

      {/* ─── القفل ─── */}
      {disabled && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex flex-col items-center justify-center gap-0.5">
          <Lock className="w-4 h-4 text-white" />
          <span className="text-[9px] font-bold text-white">
            {requiredTier.icon}
          </span>
        </div>
      )}
    </button>
  );
}

// ════════════════════════════════════════════════════════════
//  Custom Colors Picker (Advanced/Legendary)
// ════════════════════════════════════════════════════════════

function CustomColorsPicker({ customColors, onChange }) {
  const [colors, setColors] = useState({
    accent: customColors?.accent || '#f59e0b',
    secondary: customColors?.secondary || '#fbbf24',
    bg: customColors?.bg || '#0d1117',
    bgCard: customColors?.bgCard || '#161b22',
  });

  useEffect(() => {
    setColors({
      accent: customColors?.accent || '#f59e0b',
      secondary: customColors?.secondary || '#fbbf24',
      bg: customColors?.bg || '#0d1117',
      bgCard: customColors?.bgCard || '#161b22',
    });
  }, [customColors]);

  const handleChange = (key, value) => {
    const updated = { ...colors, [key]: value };
    setColors(updated);
    onChange?.(updated);
  };

  const handleClear = () => {
    onChange?.(null);
  };

  const hasActive =
    customColors && Object.keys(customColors).length > 0 && customColors.accent;

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-violet-500" />
          <span className="font-semibold text-sm">ألوان مخصصة</span>
          <Badge variant="default" size="sm" className="bg-violet-500/15 text-violet-500">
            متاح في فئتك
          </Badge>
        </div>

        {hasActive && (
          <Button onClick={handleClear} size="sm" variant="outline">
            <RotateCcw className="w-3 h-3" />
            مسح
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <ColorInput
          label="اللون الأساسي"
          value={colors.accent}
          onChange={(v) => handleChange('accent', v)}
        />
        <ColorInput
          label="اللون الثانوي"
          value={colors.secondary}
          onChange={(v) => handleChange('secondary', v)}
        />
        <ColorInput
          label="خلفية البطاقة"
          value={colors.bg}
          onChange={(v) => handleChange('bg', v)}
        />
        <ColorInput
          label="خلفية الداخل"
          value={colors.bgCard}
          onChange={(v) => handleChange('bgCard', v)}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        💡 اختر ألوانك المفضلة. التغييرات تنعكس لحظياً في المعاينة.
      </p>
    </Card>
  );
}

function ColorInput({ label, value, onChange }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 rounded-lg cursor-pointer border border-border"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 text-xs font-mono bg-background border border-border rounded-lg px-2 py-1.5 uppercase"
          dir="ltr"
          maxLength={7}
        />
      </div>
    </div>
  );
}
/**
 * ═══════════════════════════════════════════════════════════
 *  Theme Picker v2 — اختيار ألوان البطاقة بمعاينات أحلى
 *  المسار: dashboard-frontend/src/components/card/ThemePicker.jsx
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
      {canCustomColors && (
        <CustomColorsPicker
          customColors={customColors}
          onChange={onCustomColors}
        />
      )}

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
//  Theme Card — معاينة محسّنة
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
          : 'border-border hover:border-primary/50 hover:scale-[1.02]',
        disabled && 'opacity-50 cursor-not-allowed',
      )}
      style={{ background: theme.colors.bg }}
    >
      {/* ─── المعاينة الكبيرة (gradient) ─── */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, ${theme.colors.accent}, ${theme.colors.secondary})`,
        }}
      />

      {/* ─── طبقة شفافة لتغميق النصف السفلي ─── */}
      <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/80 to-transparent" />

      {/* ─── شريط XP وهمي معاينة ─── */}
      <div className="absolute bottom-7 inset-x-2">
        <div className="h-1.5 bg-black/40 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: '60%',
              background: `linear-gradient(to right, ${theme.colors.accent}, ${theme.colors.secondary})`,
            }}
          />
        </div>
      </div>

      {/* ─── الاسم ─── */}
      <div className="absolute bottom-1 inset-x-0 text-center">
        <span className="text-[10px] font-bold text-white drop-shadow-lg">
          {theme.emoji} {theme.name}
        </span>
      </div>

      {/* ─── علامة الاختيار ─── */}
      {isSelected && (
        <div
          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-lg z-10"
          style={{ boxShadow: `0 0 16px ${theme.colors.accent}aa` }}
        >
          <Check className="w-3.5 h-3.5 text-white" />
        </div>
      )}

      {/* ─── القفل ─── */}
      {disabled && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px] flex flex-col items-center justify-center gap-0.5 z-10">
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
//  Custom Colors Picker
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
    <Card className="p-4 space-y-4 relative overflow-hidden">
      {/* ─── خلفية معاينة الألوان المخصصة ─── */}
      {hasActive && (
        <div
          className="absolute -top-12 -right-12 w-40 h-40 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{
            background: `linear-gradient(135deg, ${colors.accent}, ${colors.secondary})`,
          }}
        />
      )}

      <div className="relative flex items-center justify-between">
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

      <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-3">
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

      <p className="relative text-xs text-muted-foreground">
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
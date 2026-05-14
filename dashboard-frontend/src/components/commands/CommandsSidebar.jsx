/**
 * ═══════════════════════════════════════════════════════════
 *  CommandsSidebar — Sidebar كامل
 *
 *  يحتوي:
 *  - حقل بحث
 *  - Tier filter (الكل / مجاني / فضي / ذهبي / ماسي)
 *  - Quick filters (مع اختصارات / المفعّلة / المعطّلة / مغير الاسم)
 *  - قائمة الفئات
 * ═══════════════════════════════════════════════════════════
 */

import { Search, Tag, CheckCircle2, XCircle, Edit3, X } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

// ─── Tier metadata ───
const TIERS = [
  { id: null,      label: 'كل المستويات', emoji: '🌐', color: 'text-muted-foreground' },
  { id: 'free',    label: 'مجاني',         emoji: '🆓', color: 'text-slate-400' },
  { id: 'silver',  label: 'فضي',           emoji: '🥈', color: 'text-zinc-300' },
  { id: 'gold',    label: 'ذهبي',          emoji: '🥇', color: 'text-amber-400' },
  { id: 'diamond', label: 'ماسي',          emoji: '💎', color: 'text-sky-400' },
];

export function CommandsSidebar({
  categories,
  commands,
  activeCategory,
  setActiveCategory,
  searchQuery,
  setSearchQuery,
  quickFilter,
  setQuickFilter,
  tierFilter,
  setTierFilter,
}) {
  // ─── حساب العدّادات ───
  const categoryCounts = commands.reduce((acc, cmd) => {
    acc[cmd.category] = (acc[cmd.category] || 0) + 1;
    return acc;
  }, {});

  const tierCounts = commands.reduce((acc, cmd) => {
    const tier = cmd.subscriptionTier || 'free';
    acc[tier] = (acc[tier] || 0) + 1;
    return acc;
  }, {});

  const withAliasesCount = commands.filter(
    (c) => (c.aliases?.length || 0) > 0,
  ).length;
  const renamedCount = commands.filter((c) => !!c.custom_name).length;
  const disabledCount = commands.filter((c) => c.enabled === false).length;

  // ─── ترتيب الفئات ───
  const sortedCategories = Object.values(categories || {}).sort(
    (a, b) => (a.order || 99) - (b.order || 99),
  );

  return (
    <Card className="p-4 space-y-4 lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
      {/* ─── Search ─── */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="ابحث عن أمر..."
          className="pr-10 pl-10"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="مسح البحث"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ─── Tier Filter ─── */}
      <div className="space-y-1">
        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-2 mb-1.5">
          مستوى الاشتراك
        </div>

        {TIERS.map((tier) => {
          const isActive = tierFilter === tier.id;
          const count = tier.id ? (tierCounts[tier.id] || 0) : commands.length;

          if (tier.id && count === 0) return null;

          return (
            <button
              key={tier.id ?? 'all-tiers'}
              onClick={() => setTierFilter(tier.id)}
              className={cn(
                'w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg text-sm transition-all',
                isActive
                  ? 'bg-primary/15 text-primary border border-primary/30'
                  : 'hover:bg-accent text-muted-foreground border border-transparent',
              )}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm">{tier.emoji}</span>
                <span className={cn('text-xs', isActive && tier.color)}>{tier.label}</span>
              </div>
              <Badge variant="outline" size="sm" className="num text-[10px]">
                {count}
              </Badge>
            </button>
          );
        })}
      </div>

      {/* ─── Quick Filters ─── */}
      <div className="space-y-1">
        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-2 mb-1.5">
          فلترة سريعة
        </div>

        <FilterButton
          active={quickFilter === 'with-aliases'}
          onClick={() => setQuickFilter(quickFilter === 'with-aliases' ? null : 'with-aliases')}
          icon={Tag}
          label="مع اختصارات"
          count={withAliasesCount}
          activeClass="bg-pink-500/15 text-pink-500 border-pink-500/30"
        />

        <FilterButton
          active={quickFilter === 'renamed'}
          onClick={() => setQuickFilter(quickFilter === 'renamed' ? null : 'renamed')}
          icon={Edit3}
          label="مغيّر الاسم"
          count={renamedCount}
          activeClass="bg-violet-500/15 text-violet-500 border-violet-500/30"
        />

        <FilterButton
          active={quickFilter === 'enabled'}
          onClick={() => setQuickFilter(quickFilter === 'enabled' ? null : 'enabled')}
          icon={CheckCircle2}
          label="المفعّلة فقط"
          activeClass="bg-emerald-500/15 text-emerald-500 border-emerald-500/30"
        />

        <FilterButton
          active={quickFilter === 'disabled'}
          onClick={() => setQuickFilter(quickFilter === 'disabled' ? null : 'disabled')}
          icon={XCircle}
          label="المعطّلة فقط"
          count={disabledCount}
          activeClass="bg-rose-500/15 text-rose-500 border-rose-500/30"
        />
      </div>

      {/* ─── Categories ─── */}
      <div className="space-y-1">
        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-2 mb-1.5">
          الفئات
        </div>

        {/* "الكل" */}
        <button
          onClick={() => setActiveCategory(null)}
          className={cn(
            'w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm transition-all',
            !activeCategory
              ? 'lyn-gradient text-white lyn-glow'
              : 'hover:bg-accent text-muted-foreground',
          )}
        >
          <div className="flex items-center gap-2">
            <span className="text-base">📋</span>
            <span className="font-medium">الكل</span>
          </div>
          <Badge
            variant={!activeCategory ? 'outline' : 'default'}
            size="sm"
            className={cn('num', !activeCategory && 'border-white/30 text-white')}
          >
            {commands.length}
          </Badge>
        </button>

        {/* فئات */}
        {sortedCategories.map((cat) => {
          const count = categoryCounts[cat.id] || 0;
          if (count === 0) return null;

          const isActive = activeCategory === cat.id;

          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(isActive ? null : cat.id)}
              className={cn(
                'w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm transition-all',
                isActive
                  ? 'lyn-gradient text-white lyn-glow'
                  : 'hover:bg-accent text-muted-foreground',
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base flex-shrink-0">{cat.icon}</span>
                <span className="font-medium truncate">{cat.label}</span>
              </div>
              <Badge
                variant={isActive ? 'outline' : 'default'}
                size="sm"
                className={cn('num flex-shrink-0', isActive && 'border-white/30 text-white')}
              >
                {count}
              </Badge>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

// ─── Helper: filter button ───
function FilterButton({ active, onClick, icon: Icon, label, count, activeClass }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm transition-all',
        active
          ? `${activeClass} border`
          : 'hover:bg-accent text-muted-foreground border border-transparent',
      )}
    >
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4" />
        <span>{label}</span>
      </div>
      {count !== undefined && count > 0 && (
        <Badge variant="outline" size="sm" className="num">
          {count}
        </Badge>
      )}
    </button>
  );
}
/**
 * ═══════════════════════════════════════════════════════════
 *  CommandsList — قائمة الأوامر مع كل الفلاتر
 *
 *  يفلتر حسب:
 *  - search (في الاسم، الوصف، الاختصارات)
 *  - category
 *  - quick filter (with-aliases, renamed, enabled, disabled)
 *  - tier filter
 * ═══════════════════════════════════════════════════════════
 */

import { useMemo } from 'react';
import { Search } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { CommandCard } from './CommandCard';
import { EmptyState } from '@/components/shared/EmptyState';

export function CommandsList({
  commands,
  categories,
  guildPlan,
  canRename,
  searchQuery,
  activeCategory,
  quickFilter,
  tierFilter,
  onToggle,
  onRename,
  onAddAlias,
  onRemoveAlias,
}) {
  // ─── فلترة الأوامر ───
  const filteredCommands = useMemo(() => {
    let result = commands;

    // 1) Category
    if (activeCategory) {
      result = result.filter((cmd) => cmd.category === activeCategory);
    }

    // 2) Tier
    if (tierFilter) {
      result = result.filter(
        (cmd) => (cmd.subscriptionTier || 'free') === tierFilter,
      );
    }

    // 3) Quick filter
    if (quickFilter === 'with-aliases') {
      result = result.filter((cmd) => (cmd.aliases?.length || 0) > 0);
    } else if (quickFilter === 'renamed') {
      result = result.filter((cmd) => !!cmd.custom_name);
    } else if (quickFilter === 'enabled') {
      result = result.filter((cmd) => cmd.enabled !== false);
    } else if (quickFilter === 'disabled') {
      result = result.filter((cmd) => cmd.enabled === false);
    }

    // 4) Search (last — أكثر تكلفة)
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((cmd) => {
        const name = cmd.name?.toLowerCase() || '';
        const customName = cmd.custom_name?.toLowerCase() || '';
        const desc = cmd.description?.toLowerCase() || '';
        const aliasesMatch = (cmd.aliases || []).some((a) =>
          a.toLowerCase().includes(q),
        );
        return (
          name.includes(q) ||
          customName.includes(q) ||
          desc.includes(q) ||
          aliasesMatch
        );
      });
    }

    return result;
  }, [commands, activeCategory, tierFilter, quickFilter, searchQuery]);

  // ─── تجميع حسب الفئة (لو ما فيه active category) ───
  const grouped = useMemo(() => {
    if (activeCategory) {
      return [{ category: null, commands: filteredCommands }];
    }

    const groups = {};
    for (const cmd of filteredCommands) {
      const catId = cmd.category || 'other';
      if (!groups[catId]) groups[catId] = [];
      groups[catId].push(cmd);
    }

    const sortedCategoryIds = Object.keys(groups).sort((a, b) => {
      const aOrder = categories[a]?.order ?? 99;
      const bOrder = categories[b]?.order ?? 99;
      return aOrder - bOrder;
    });

    return sortedCategoryIds.map((catId) => ({
      category: categories[catId] || { id: catId, label: catId, icon: '📁' },
      commands: groups[catId],
    }));
  }, [filteredCommands, activeCategory, categories]);

  // ─── Empty state ───
  if (filteredCommands.length === 0) {
    return (
      <Card className="p-5">
        <EmptyState
          icon={<Search />}
          title="ما فيه أوامر تطابق البحث"
          description={
            searchQuery
              ? `لم نجد أي أمر يطابق "${searchQuery}"`
              : 'جرب تغيير الفلاتر'
          }
        />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {grouped.map(({ category, commands: groupCommands }, idx) => (
        <div key={category?.id || idx}>
          {/* Category header (لو ما فيه active category) */}
          {category && (
            <div className="flex items-center gap-2 mb-3 px-1">
              <span className="text-xl">{category.icon}</span>
              <h2 className="font-bold text-base">{category.label}</h2>
              <span className="text-xs text-muted-foreground num">
                ({groupCommands.length})
              </span>
            </div>
          )}

          {/* Commands */}
          <div className="space-y-3">
            {groupCommands.map((cmd) => (
              <CommandCard
                key={cmd.name}
                command={cmd}
                guildPlan={guildPlan}
                canRename={canRename}
                onToggle={onToggle}
                onRename={onRename}
                onAddAlias={onAddAlias}
                onRemoveAlias={onRemoveAlias}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
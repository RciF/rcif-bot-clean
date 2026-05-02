import { useState, useMemo, useEffect, useRef } from 'react';
import { Search, X, Check, ChevronDown, ShieldCheck } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { mock } from '@/lib/mock';
import { intToHexColor, cn } from '@/lib/utils';

/**
 * RolePicker — اختيار رتبة (single أو multiple)
 *
 * @example
 *   <RolePicker value={roleId} onChange={setRoleId} />
 *   <RolePicker value={roles} onChange={setRoles} multiple excludeManaged />
 */

export function RolePicker({
  value,
  onChange,
  multiple = false,
  excludeManaged = true,
  excludeEveryone = true,
  placeholder = 'اختر رتبة...',
  disabled = false,
  className,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [roles, setRoles] = useState(null);
  const containerRef = useRef(null);

  useEffect(() => {
    mock.guildRoles().then(setRoles);
  }, []);

  useEffect(() => {
    const handleClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const filtered = useMemo(() => {
    if (!roles) return [];
    let list = roles;
    if (excludeManaged) list = list.filter((r) => !r.managed);
    if (excludeEveryone) list = list.filter((r) => r.name !== '@everyone');
    if (search) list = list.filter((r) => r.name.includes(search));
    return list.sort((a, b) => b.position - a.position);
  }, [roles, search, excludeManaged, excludeEveryone]);

  const selectedIds = multiple ? value || [] : value ? [value] : [];

  const selectedRoles = useMemo(() => {
    if (!roles) return [];
    return roles.filter((r) => selectedIds.includes(r.id));
  }, [roles, selectedIds]);

  const toggleSelect = (role) => {
    if (multiple) {
      const newValue = selectedIds.includes(role.id)
        ? selectedIds.filter((id) => id !== role.id)
        : [...selectedIds, role.id];
      onChange(newValue);
    } else {
      onChange(role.id === value ? null : role.id);
      setOpen(false);
    }
  };

  const removeRole = (e, id) => {
    e.stopPropagation();
    if (multiple) {
      onChange(selectedIds.filter((i) => i !== id));
    } else {
      onChange(null);
    }
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={cn(
          'w-full min-h-10 flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm transition-colors',
          'hover:border-border/80',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background',
          'disabled:cursor-not-allowed disabled:opacity-50',
          open && 'border-primary ring-2 ring-primary/20',
        )}
      >
        <div className="flex-1 flex flex-wrap gap-1.5 items-center text-start">
          {selectedRoles.length === 0 ? (
            <span className="text-muted-foreground">{placeholder}</span>
          ) : multiple ? (
            selectedRoles.map((r) => (
              <span
                key={r.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium"
                style={{
                  background: intToHexColor(r.color) + '20',
                  color: intToHexColor(r.color),
                }}
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ background: intToHexColor(r.color) }}
                />
                @{r.name}
                <button
                  type="button"
                  onClick={(e) => removeRole(e, r.id)}
                  className="hover:bg-black/10 rounded-full p-0.5 ms-0.5"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            ))
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded-full"
                style={{ background: intToHexColor(selectedRoles[0].color) }}
              />
              <span className="font-medium" style={{ color: intToHexColor(selectedRoles[0].color) }}>
                @{selectedRoles[0].name}
              </span>
            </span>
          )}
        </div>
        <ChevronDown
          className={cn(
            'w-4 h-4 text-muted-foreground transition-transform flex-shrink-0',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-1 inset-x-0 rounded-xl border border-border bg-popover shadow-lg overflow-hidden animate-lyn-fade-up">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute end-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="بحث في الرتب..."
                className="pe-8 h-8 text-sm"
                autoFocus
              />
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto p-1">
            {!roles ? (
              <div className="space-y-1 p-1">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 rounded-lg" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground">لا توجد نتائج</div>
            ) : (
              filtered.map((r) => {
                const isSelected = selectedIds.includes(r.id);
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => toggleSelect(r)}
                    className={cn(
                      'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm transition-colors text-start',
                      isSelected ? 'bg-primary/10' : 'hover:bg-accent',
                    )}
                  >
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ background: intToHexColor(r.color) }}
                    />
                    <span
                      className="flex-1 truncate"
                      style={{ color: r.color !== 0 ? intToHexColor(r.color) : undefined }}
                    >
                      @{r.name}
                    </span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

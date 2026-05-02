import { useState, useMemo, useEffect, useRef } from 'react';
import { Search, X, Check, ChevronDown, ShieldCheck, Loader2 } from 'lucide-react';
import { useGuildResources } from '@/hooks/useGuildResources';
import { intToHexColor, cn } from '@/lib/utils';

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
  const containerRef = useRef(null);

  const { roles, isLoading } = useGuildResources({ types: ['roles'] });

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
    let list = roles || [];
    if (excludeManaged) list = list.filter((r) => !r.managed);
    if (excludeEveryone) list = list.filter((r) => r.name !== '@everyone');
    if (search) list = list.filter((r) => r.name?.toLowerCase().includes(search.toLowerCase()));
    return [...list].sort((a, b) => (b.position || 0) - (a.position || 0));
  }, [roles, search, excludeManaged, excludeEveryone]);

  const selectedIds = multiple ? (value || []) : (value ? [value] : []);
  const selectedRoles = useMemo(
    () => (roles || []).filter((r) => selectedIds.includes(r.id)),
    [roles, selectedIds],
  );

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

  const removeSelected = (id, e) => {
    e.stopPropagation();
    if (multiple) onChange(selectedIds.filter((sid) => sid !== id));
    else onChange(null);
  };

  const selectedRole = !multiple && value ? (roles || []).find((r) => r.id === value) : null;

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border bg-background text-sm transition-colors text-right',
          'hover:border-primary/50 focus:outline-none focus:border-primary/50',
          disabled && 'opacity-50 cursor-not-allowed',
          open && 'border-primary/50',
        )}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        ) : multiple ? (
          <div className="flex flex-wrap gap-1 flex-1">
            {selectedRoles.length > 0 ? (
              selectedRoles.map((role) => {
                const color = role.color ? intToHexColor(role.color) : '#99aab5';
                return (
                  <span key={role.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs" style={{ backgroundColor: `${color}20`, color }}>
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                    {role.name}
                    <button type="button" onClick={(e) => removeSelected(role.id, e)} className="hover:opacity-70">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                );
              })
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-1">
            {selectedRole ? (
              <>
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: selectedRole.color ? intToHexColor(selectedRole.color) : '#99aab5' }} />
                <span>{selectedRole.name}</span>
              </>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
        )}
        <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform flex-shrink-0', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute top-full mt-1 w-full z-50 rounded-xl border border-border bg-popover shadow-lg overflow-hidden animate-lyn-fade-up">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="بحث..."
                className="w-full pr-8 pl-3 py-1.5 text-sm bg-transparent focus:outline-none"
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto p-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-4 text-sm text-muted-foreground">لا يوجد رتب</div>
            ) : (
              filtered.map((role) => {
                const color = role.color ? intToHexColor(role.color) : '#99aab5';
                const isSelected = selectedIds.includes(role.id);
                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => toggleSelect(role)}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-right',
                      isSelected ? 'bg-primary/10' : 'hover:bg-accent',
                    )}
                  >
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                    <span className="flex-1 truncate" style={{ color: isSelected ? color : undefined }}>{role.name}</span>
                    {isSelected && <Check className="w-4 h-4 flex-shrink-0 text-primary" />}
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
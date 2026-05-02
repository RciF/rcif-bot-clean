import { useState, useMemo, useEffect, useRef } from 'react';
import { Hash, Volume2, Megaphone, Search, X, Check, ChevronDown, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { useGuildResources } from '@/hooks/useGuildResources';
import { cn } from '@/lib/utils';

const CHANNEL_TYPE_ICONS = {
  0: Hash,
  2: Volume2,
  5: Megaphone,
  15: Hash,
};

export function ChannelPicker({
  value,
  onChange,
  multiple = false,
  types = null,
  placeholder = 'اختر قناة...',
  disabled = false,
  className,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);

  const { channels, isLoading } = useGuildResources({ types: ['channels'] });

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
    let list = channels || [];
    if (types) list = list.filter((ch) => types.includes(ch.type));
    if (search) list = list.filter((ch) => ch.name?.toLowerCase().includes(search.toLowerCase()));
    return list.sort((a, b) => (a.position || 0) - (b.position || 0));
  }, [channels, search, types]);

  const selectedIds = multiple ? (value || []) : (value ? [value] : []);
  const selectedChannels = useMemo(
    () => (channels || []).filter((ch) => selectedIds.includes(ch.id)),
    [channels, selectedIds],
  );

  const toggleSelect = (channel) => {
    if (multiple) {
      const newValue = selectedIds.includes(channel.id)
        ? selectedIds.filter((id) => id !== channel.id)
        : [...selectedIds, channel.id];
      onChange(newValue);
    } else {
      onChange(channel.id === value ? null : channel.id);
      setOpen(false);
    }
  };

  const removeSelected = (id, e) => {
    e.stopPropagation();
    if (multiple) onChange(selectedIds.filter((sid) => sid !== id));
    else onChange(null);
  };

  const selectedChannel = !multiple && value ? (channels || []).find((ch) => ch.id === value) : null;

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
            {selectedChannels.length > 0 ? (
              selectedChannels.map((ch) => {
                const Icon = CHANNEL_TYPE_ICONS[ch.type] || Hash;
                return (
                  <span key={ch.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-primary/10 text-primary text-xs">
                    <Icon className="w-3 h-3" />
                    {ch.name}
                    <button type="button" onClick={(e) => removeSelected(ch.id, e)} className="hover:text-destructive">
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
            {selectedChannel ? (
              <>
                {(() => { const Icon = CHANNEL_TYPE_ICONS[selectedChannel.type] || Hash; return <Icon className="w-4 h-4 text-muted-foreground" />; })()}
                <span>{selectedChannel.name}</span>
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
              <div className="text-center py-4 text-sm text-muted-foreground">لا يوجد قنوات</div>
            ) : (
              filtered.map((channel) => {
                const Icon = CHANNEL_TYPE_ICONS[channel.type] || Hash;
                const isSelected = selectedIds.includes(channel.id);
                return (
                  <button
                    key={channel.id}
                    type="button"
                    onClick={() => toggleSelect(channel)}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-right',
                      isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-accent',
                    )}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="flex-1 truncate">{channel.name}</span>
                    {isSelected && <Check className="w-4 h-4 flex-shrink-0" />}
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
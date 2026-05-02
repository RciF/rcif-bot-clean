import { useState, useMemo, useEffect, useRef } from 'react';
import { Hash, Volume2, Megaphone, Search, X, Check, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { mock } from '@/lib/mock';
import { cn } from '@/lib/utils';

/**
 * ChannelPicker — اختيار قناة (single أو multiple)
 *
 * @example
 *   // Single
 *   <ChannelPicker value={channelId} onChange={setChannelId} />
 *
 *   // Multiple
 *   <ChannelPicker value={channels} onChange={setChannels} multiple />
 *
 *   // Filter by type
 *   <ChannelPicker types={[0]} /> // text only
 */

const CHANNEL_TYPE_ICONS = {
  0: Hash,        // text
  2: Volume2,     // voice
  5: Megaphone,   // announcement
  15: Hash,       // forum
};

const CHANNEL_TYPE_LABELS = {
  0: 'نصية',
  2: 'صوتية',
  5: 'إعلانات',
  15: 'منتدى',
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
  const [channels, setChannels] = useState(null);
  const containerRef = useRef(null);

  useEffect(() => {
    mock.guildChannels().then(setChannels);
  }, []);

  // إغلاق عند الكليك خارج
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
    if (!channels) return [];
    let list = channels;
    if (types) list = list.filter((ch) => types.includes(ch.type));
    if (search) list = list.filter((ch) => ch.name.includes(search));
    return list;
  }, [channels, search, types]);

  const selectedIds = multiple ? value || [] : value ? [value] : [];

  const selectedChannels = useMemo(() => {
    if (!channels) return [];
    return channels.filter((ch) => selectedIds.includes(ch.id));
  }, [channels, selectedIds]);

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

  const removeChannel = (e, id) => {
    e.stopPropagation();
    if (multiple) {
      onChange(selectedIds.filter((i) => i !== id));
    } else {
      onChange(null);
    }
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Trigger */}
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
          {selectedChannels.length === 0 ? (
            <span className="text-muted-foreground">{placeholder}</span>
          ) : multiple ? (
            selectedChannels.map((ch) => {
              const Icon = CHANNEL_TYPE_ICONS[ch.type] || Hash;
              return (
                <span
                  key={ch.id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-500/10 text-violet-500 text-xs font-medium"
                >
                  <Icon className="w-3 h-3" />
                  {ch.name}
                  <button
                    type="button"
                    onClick={(e) => removeChannel(e, ch.id)}
                    className="hover:bg-violet-500/20 rounded-full p-0.5 ms-0.5"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              );
            })
          ) : (
            <span className="inline-flex items-center gap-1.5">
              {(() => {
                const Icon = CHANNEL_TYPE_ICONS[selectedChannels[0].type] || Hash;
                return <Icon className="w-3.5 h-3.5 text-violet-500" />;
              })()}
              <span className="font-medium">{selectedChannels[0].name}</span>
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

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 top-full mt-1 inset-x-0 rounded-xl border border-border bg-popover shadow-lg overflow-hidden animate-lyn-fade-up">
          {/* Search */}
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute end-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="بحث في القنوات..."
                className="pe-8 h-8 text-sm"
                autoFocus
              />
            </div>
          </div>

          {/* List */}
          <div className="max-h-64 overflow-y-auto p-1">
            {!channels ? (
              <div className="space-y-1 p-1">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 rounded-lg" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground">
                لا توجد نتائج
              </div>
            ) : (
              filtered.map((ch) => {
                const Icon = CHANNEL_TYPE_ICONS[ch.type] || Hash;
                const isSelected = selectedIds.includes(ch.id);
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => toggleSelect(ch)}
                    className={cn(
                      'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm transition-colors text-start',
                      isSelected
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-accent',
                    )}
                  >
                    <Icon
                      className={cn(
                        'w-4 h-4 flex-shrink-0',
                        isSelected ? 'text-primary' : 'text-muted-foreground',
                      )}
                    />
                    <span className="flex-1 truncate">{ch.name}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {CHANNEL_TYPE_LABELS[ch.type] || ''}
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

import { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Smile, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';

/**
 * EmojiPicker — منتقي إيموجي بسيط
 *
 * يدعم: إيموجيات Unicode الجاهزة + (لاحقاً: إيموجيات السيرفر المخصصة)
 *
 * @example
 *   <EmojiPicker value={emoji} onChange={setEmoji} />
 */

const EMOJI_CATEGORIES = [
  {
    name: 'وجوه',
    emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙'],
  },
  {
    name: 'تفاعلات',
    emojis: ['👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐️', '🖖', '👋', '🤝', '🙏'],
  },
  {
    name: 'قلوب',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '♥️'],
  },
  {
    name: 'أشياء',
    emojis: ['🎮', '🎯', '🎨', '🎭', '🎪', '🎬', '🎤', '🎧', '🎼', '🎵', '🎶', '🎹', '🥁', '🎷', '🎺', '🎸', '🪕', '🎻', '🎲', '🃏'],
  },
  {
    name: 'حالة',
    emojis: ['🛡️', '🔒', '🔓', '🔑', '🗝️', '🔨', '⚔️', '🛠️', '⛏️', '⚒️', '🪓', '🔧', '🪛', '🔩', '⚙️', '🪤', '🧱', '⛓️', '🧲', '🔫'],
  },
  {
    name: 'رموز',
    emojis: ['💯', '✅', '❌', '⭕', '🚫', '⛔', '📛', '⚠️', '🚸', '🔅', '🔆', '〽️', '⚜️', '🔱', '📵', '🔰', '♻️', '✳️', '❇️', '✴️'],
  },
];

export function EmojiPicker({
  value = '',
  onChange,
  placeholder = 'اختر إيموجي...',
  disabled = false,
  className,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState(0);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const filteredEmojis = useMemo(() => {
    if (!search) return EMOJI_CATEGORIES[activeCategory].emojis;
    return EMOJI_CATEGORIES.flatMap((c) => c.emojis);
  }, [search, activeCategory]);

  const handleSelect = (emoji) => {
    onChange(emoji);
    setOpen(false);
    setSearch('');
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={cn(
          'w-full h-10 flex items-center gap-2 rounded-xl border border-border bg-background px-3 text-sm transition-colors',
          'hover:border-border/80',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background',
          'disabled:cursor-not-allowed disabled:opacity-50',
          open && 'border-primary ring-2 ring-primary/20',
        )}
      >
        <div className="flex-1 flex items-center gap-2 text-start">
          {value ? (
            <>
              <span className="text-xl">{value}</span>
              <span className="text-muted-foreground text-xs">إيموجي مختار</span>
            </>
          ) : (
            <>
              <Smile className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">{placeholder}</span>
            </>
          )}
        </div>
        <ChevronDown
          className={cn(
            'w-4 h-4 text-muted-foreground transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-1 inset-x-0 rounded-xl border border-border bg-popover shadow-lg overflow-hidden animate-lyn-fade-up">
          {/* Search */}
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute end-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="بحث..."
                className="pe-8 h-8 text-sm"
              />
            </div>
          </div>

          {/* Categories */}
          {!search && (
            <div className="flex border-b border-border overflow-x-auto">
              {EMOJI_CATEGORIES.map((cat, idx) => (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => setActiveCategory(idx)}
                  className={cn(
                    'flex-1 px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors min-w-fit',
                    activeCategory === idx
                      ? 'bg-primary/10 text-primary border-b-2 border-primary'
                      : 'text-muted-foreground hover:bg-accent',
                  )}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}

          {/* Grid */}
          <div className="p-2 max-h-64 overflow-y-auto">
            <div className="grid grid-cols-8 gap-1">
              {filteredEmojis.map((emoji, i) => (
                <button
                  key={`${emoji}-${i}`}
                  type="button"
                  onClick={() => handleSelect(emoji)}
                  className={cn(
                    'aspect-square text-2xl rounded-lg hover:bg-accent transition-colors flex items-center justify-center',
                    value === emoji && 'bg-primary/10 ring-2 ring-primary',
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

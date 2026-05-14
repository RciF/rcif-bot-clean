/**
 * ═══════════════════════════════════════════════════════════
 *  AliasesInput — مكوّن إدخال الـ aliases بنمط chips
 *
 *  السلوك (مثل ProBot):
 *  - يعرض الـ aliases الحالية كـ tags
 *  - حقل input لإضافة alias جديد
 *  - Enter / Space / Comma → يضيف
 *  - X على كل tag → يحذف
 *  - يعرض عدّاد: 3/5
 *
 *  Props:
 *  - aliases: string[]
 *  - onAdd: (alias) => Promise<void>
 *  - onRemove: (alias) => Promise<void>
 *  - max: number (default 5)
 *  - disabled: boolean
 * ═══════════════════════════════════════════════════════════
 */

import { useState, useRef } from 'react';
import { X, Plus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const MAX_LENGTH = 32;

export function AliasesInput({
  aliases = [],
  onAdd,
  onRemove,
  max = 5,
  disabled = false,
}) {
  const [inputValue, setInputValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [removingAlias, setRemovingAlias] = useState(null);
  const inputRef = useRef(null);

  const canAddMore = aliases.length < max;

  // ─── Add alias ───
  const handleAdd = async (rawValue) => {
    const value = rawValue.trim();
    if (!value) return;

    if (value.length > MAX_LENGTH) {
      toast.error(`الاختصار طويل (الحد الأقصى ${MAX_LENGTH} حرف)`);
      return;
    }

    if (aliases.includes(value)) {
      toast.error('هذا الاختصار موجود بالفعل');
      return;
    }

    if (!canAddMore) {
      toast.error(`وصلت للحد الأقصى (${max} اختصارات)`);
      return;
    }

    setBusy(true);
    try {
      await onAdd(value);
      setInputValue('');
      // Focus العودة على الـ input
      setTimeout(() => inputRef.current?.focus(), 0);
    } catch (err) {
      // الـ error toast يُعرض من الـ parent
      console.error('[AliasesInput] Add failed:', err);
    } finally {
      setBusy(false);
    }
  };

  // ─── Remove alias ───
  const handleRemove = async (alias) => {
    setRemovingAlias(alias);
    try {
      await onRemove(alias);
    } catch (err) {
      console.error('[AliasesInput] Remove failed:', err);
    } finally {
      setRemovingAlias(null);
    }
  };

  // ─── Keyboard handling ───
  const handleKeyDown = (e) => {
    // Enter أو Comma → add
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAdd(inputValue);
      return;
    }

    // Backspace على input فاضي → احذف آخر alias
    if (e.key === 'Backspace' && !inputValue && aliases.length > 0) {
      e.preventDefault();
      handleRemove(aliases[aliases.length - 1]);
    }
  };

  return (
    <div
      className={cn(
        'w-full min-h-[44px] px-2 py-1.5 rounded-xl border border-input bg-background',
        'focus-within:ring-2 focus-within:ring-ring focus-within:border-ring',
        'transition-all flex flex-wrap items-center gap-1.5',
        disabled && 'opacity-60 cursor-not-allowed',
      )}
      onClick={() => inputRef.current?.focus()}
    >
      {/* ─── Aliases as chips ─── */}
      {aliases.map((alias) => {
        const isRemoving = removingAlias === alias;
        return (
          <span
            key={alias}
            className={cn(
              'inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium',
              'bg-primary/10 border border-primary/30 text-primary',
              'transition-all',
              isRemoving && 'opacity-50',
            )}
            dir="ltr"
          >
            <span>{alias}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleRemove(alias);
              }}
              disabled={disabled || isRemoving}
              className="hover:bg-primary/20 rounded-full p-0.5 transition-colors disabled:cursor-not-allowed"
              aria-label={`حذف ${alias}`}
            >
              {isRemoving ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <X className="w-3 h-3" />
              )}
            </button>
          </span>
        );
      })}

      {/* ─── Input field ─── */}
      {canAddMore && (
        <div className="flex-1 min-w-[120px] flex items-center gap-1">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value.slice(0, MAX_LENGTH))}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              // عند الـ blur، حاول الإضافة لو فيه قيمة
              if (inputValue.trim()) {
                handleAdd(inputValue);
              }
            }}
            disabled={disabled || busy}
            placeholder={
              aliases.length === 0
                ? 'اكتب اختصار واضغط Enter — مثلاً: !d أو daily'
                : 'أضف اختصار جديد...'
            }
            className="flex-1 bg-transparent outline-none text-sm px-1 placeholder:text-muted-foreground/60"
            dir="ltr"
          />
          {busy && (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground mr-1" />
          )}
        </div>
      )}

      {/* ─── Counter (when full) ─── */}
      {!canAddMore && (
        <div className="text-xs text-muted-foreground px-2 py-1">
          الحد الأقصى ({max})
        </div>
      )}
    </div>
  );
}
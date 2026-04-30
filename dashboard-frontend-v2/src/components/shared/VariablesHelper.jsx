import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * VariablesHelper — قائمة المتغيرات اللي يقدر يدرجها المستخدم
 *
 * @example
 *   <VariablesHelper
 *     variables={[
 *       { key: '{user}', label: 'منشن العضو', example: '@أحمد' },
 *       { key: '{server}', label: 'اسم السيرفر', example: 'سيرفر التطوير' },
 *     ]}
 *     onInsert={(varKey) => insertIntoTextarea(varKey)}
 *   />
 */
export function VariablesHelper({ variables = [], onInsert, className }) {
  const [copiedKey, setCopiedKey] = useState(null);

  const handleClick = (variable) => {
    if (onInsert) {
      onInsert(variable.key);
    } else {
      navigator.clipboard.writeText(variable.key);
      setCopiedKey(variable.key);
      setTimeout(() => setCopiedKey(null), 1500);
    }
  };

  return (
    <div className={cn('rounded-xl bg-muted/40 p-3', className)}>
      <div className="text-xs font-semibold text-muted-foreground mb-2">
        المتغيرات المتاحة:
      </div>
      <div className="flex flex-wrap gap-2">
        {variables.map((v) => {
          const isCopied = copiedKey === v.key;
          return (
            <button
              key={v.key}
              type="button"
              onClick={() => handleClick(v)}
              className={cn(
                'group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md',
                'bg-background border border-border text-xs font-medium',
                'hover:border-primary hover:bg-primary/5 transition-all',
                'cursor-pointer',
              )}
              title={v.label + (v.example ? ` — ${v.example}` : '')}
            >
              <code className="ltr text-primary font-mono text-[11px]">{v.key}</code>
              {isCopied ? (
                <Check className="w-3 h-3 text-emerald-500" />
              ) : (
                <Copy className="w-3 h-3 text-muted-foreground/70 group-hover:text-foreground" />
              )}
            </button>
          );
        })}
      </div>
      {!onInsert && (
        <p className="text-[10px] text-muted-foreground mt-2">
          اضغط على المتغير لنسخه
        </p>
      )}
    </div>
  );
}

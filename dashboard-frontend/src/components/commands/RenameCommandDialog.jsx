/**
 * ═══════════════════════════════════════════════════════════
 *  RenameCommandDialog — Dialog لتعديل اسم الأمر
 *
 *  - يدعم استعادة الاسم الأصلي (اتركه فاضي)
 *  - validates length 1-32
 *  - يُعرض في حالة plan gate إذا المستخدم ما يقدر
 * ═══════════════════════════════════════════════════════════
 */

import { useState, useEffect } from 'react';
import { CheckCheck, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';

export function RenameCommandDialog({ command, isOpen, onClose, onSave }) {
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);

  // ─── Initialize value when command changes ───
  useEffect(() => {
    if (command) {
      setValue(command.custom_name || '');
    }
  }, [command]);

  if (!command) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(command.name, value);
      onClose();
    } catch {
      // toast handled in hook
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !saving) {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && !saving && onClose()}>
      <DialogContent>
        <div className="flex justify-center -mt-4 mb-2">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <Edit3 className="w-8 h-8" />
          </div>
        </div>

        <DialogHeader>
          <DialogTitle className="text-center">تغيير اسم الأمر</DialogTitle>
          <DialogDescription className="text-center space-y-1">
            <div>
              اسم جديد للأمر{' '}
              <span className="font-mono font-bold" dir="ltr">
                /{command.name}
              </span>
            </div>
            <div className="text-xs">اتركه فاضي لاستعادة الاسم الأصلي</div>
          </DialogDescription>
        </DialogHeader>

        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={command.name}
          maxLength={32}
          autoFocus
          dir="ltr"
          className="text-center font-mono"
        />

        {value && value !== command.name && (
          <div className="text-center text-xs text-muted-foreground">
            بعد الحفظ، الأمر راح يظهر كـ{' '}
            <span className="font-mono font-bold text-foreground">
              /{value}
            </span>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={saving}
            className="flex-1"
          >
            إلغاء
          </Button>
          <Button onClick={handleSave} disabled={saving} className="flex-1">
            <CheckCheck className="w-4 h-4" />
            {saving ? 'جاري الحفظ...' : 'حفظ'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
/**
 * ═══════════════════════════════════════════════════════════
 *  AdvancedEditor — Dialog كامل لتعديل الأمر
 *
 *  Tabs:
 *  1. الصلاحيات (Restrictions)
 *  2. الإعدادات الافتراضية (Defaults)
 *
 *  Props:
 *  - command: object الأمر
 *  - isOpen: bool
 *  - onClose: () => void
 *  - onSave: ({ restrictions, defaults }) => Promise
 * ═══════════════════════════════════════════════════════════
 */

import { useState, useEffect } from 'react';
import { Settings2, Shield, Clock, CheckCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { cn } from '@/lib/utils';
import { RestrictionsTab } from './RestrictionsTab';
import { DefaultsTab } from './DefaultsTab';

const TABS = [
  { id: 'restrictions', label: 'الصلاحيات', icon: Shield },
  { id: 'defaults',     label: 'الإعدادات',  icon: Clock },
];

export function AdvancedEditor({ command, isOpen, onClose, onSave }) {
  const [activeTab, setActiveTab] = useState('restrictions');
  const [restrictions, setRestrictions] = useState({});
  const [defaults, setDefaults] = useState({});
  const [saving, setSaving] = useState(false);

  // ─── Initialize from command ───
  useEffect(() => {
    if (command) {
      setRestrictions({
        enabled_roles: command.restrictions?.enabled_roles || [],
        disabled_roles: command.restrictions?.disabled_roles || [],
        enabled_channels: command.restrictions?.enabled_channels || [],
        disabled_channels: command.restrictions?.disabled_channels || [],
      });
      setDefaults({
        default_duration: command.defaults?.default_duration || null,
        delete_invocation: command.defaults?.delete_invocation || false,
        delete_response: command.defaults?.delete_response || false,
        delete_response_after: command.defaults?.delete_response_after || 5,
        delete_on_user_delete: command.defaults?.delete_on_user_delete || false,
      });
      setActiveTab('restrictions');
    }
  }, [command]);

  if (!command) return null;

  // ─── Save handler ───
  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ restrictions, defaults });
      onClose();
    } catch {
      // toast handled by parent
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && !saving && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
              <Settings2 className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-right">
                تعديل متقدم
              </DialogTitle>
              <DialogDescription className="text-right">
                إعدادات تفصيلية للأمر{' '}
                <span className="font-mono font-bold" dir="ltr">
                  /{command.name}
                </span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg border border-border">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all',
                  isActive
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto pr-1 -mr-1">
          {activeTab === 'restrictions' && (
            <RestrictionsTab
              restrictions={restrictions}
              onChange={setRestrictions}
            />
          )}
          {activeTab === 'defaults' && (
            <DefaultsTab
              defaults={defaults}
              onChange={setDefaults}
              commandName={command.name}
            />
          )}
        </div>

        <DialogFooter className="border-t border-border pt-4">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={saving}
            className="flex-1"
          >
            <X className="w-4 h-4" />
            <span>إلغاء</span>
          </Button>
          <Button onClick={handleSave} disabled={saving} className="flex-1">
            <CheckCheck className="w-4 h-4" />
            <span>{saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
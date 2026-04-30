import { useState } from 'react';
import { Type, MessageCircle, Ban, X, Plus } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Slider } from '@/components/ui/Slider';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Separator } from '@/components/ui/Separator';

/**
 * AILimitsTab — Tab الحدود والكلمات
 * - أقصى طول رد
 * - عدد الرسائل/يوم
 * - الكلمات الممنوعة
 */
export function AILimitsTab({ data, updateField, setData }) {
  const [newWord, setNewWord] = useState('');

  const addBlockedWord = () => {
    const trimmed = newWord.trim();
    if (!trimmed) return;
    if (data.blockedWords?.includes(trimmed)) {
      setNewWord('');
      return;
    }
    setData((prev) => ({
      ...prev,
      blockedWords: [...(prev.blockedWords || []), trimmed],
    }));
    setNewWord('');
  };

  const removeBlockedWord = (word) => {
    setData((prev) => ({
      ...prev,
      blockedWords: (prev.blockedWords || []).filter((w) => w !== word),
    }));
  };

  return (
    <div className="space-y-4">
      {/* ── Max Response Length ── */}
      <Card className="p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-500 flex items-center justify-center flex-shrink-0">
            <Type className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold mb-1">أقصى طول للرد</h3>
            <p className="text-sm text-muted-foreground">
              عدد الأحرف الأقصى في كل رد من AI
            </p>
          </div>
          <div className="text-end">
            <div className="text-2xl font-bold lyn-text-gradient num">
              {data.maxResponseLength}
            </div>
            <div className="text-xs text-muted-foreground">حرف</div>
          </div>
        </div>

        <Slider
          value={[data.maxResponseLength]}
          onValueChange={([v]) => updateField('maxResponseLength', v)}
          min={50}
          max={2000}
          step={50}
          showValue
          valueFormat={(v) => `${v} حرف`}
        />
      </Card>

      {/* ── Daily Messages Limit ── */}
      <Card className="p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-pink-500/10 text-pink-500 flex items-center justify-center flex-shrink-0">
            <MessageCircle className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold mb-1">حد الرسائل اليومي للعضو</h3>
            <p className="text-sm text-muted-foreground">
              عدد الرسائل الأقصى لكل عضو في اليوم
            </p>
          </div>
          <div className="text-end">
            <div className="text-2xl font-bold lyn-text-gradient num">
              {data.messagesPerDay}
            </div>
            <div className="text-xs text-muted-foreground">رسالة/يوم</div>
          </div>
        </div>

        <Slider
          value={[data.messagesPerDay]}
          onValueChange={([v]) => updateField('messagesPerDay', v)}
          min={5}
          max={200}
          step={5}
          showValue
          valueFormat={(v) => `${v} رسالة`}
        />

        <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
          💡 الحد الأقصى المسموح حسب خطتك:{' '}
          <span className="font-semibold text-foreground num">30 رسالة/عضو/يوم</span>
        </p>
      </Card>

      {/* ── Blocked Words ── */}
      <Card className="p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center flex-shrink-0">
            <Ban className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold mb-1">الكلمات الممنوعة</h3>
            <p className="text-sm text-muted-foreground">
              AI ما راح يستخدم هذي الكلمات في ردوده
            </p>
          </div>
        </div>

        {/* Add Word Input */}
        <div className="flex gap-2 mb-4">
          <Input
            value={newWord}
            onChange={(e) => setNewWord(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addBlockedWord();
              }
            }}
            placeholder="اكتب الكلمة واضغط Enter..."
            className="flex-1"
            maxLength={50}
          />
          <Button onClick={addBlockedWord} disabled={!newWord.trim()}>
            <Plus className="w-4 h-4" />
            إضافة
          </Button>
        </div>

        {/* Words List */}
        {data.blockedWords?.length > 0 ? (
          <>
            <Separator className="mb-4" />
            <div className="flex flex-wrap gap-2">
              {data.blockedWords.map((word) => (
                <div
                  key={word}
                  className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium"
                >
                  <span>{word}</span>
                  <button
                    onClick={() => removeBlockedWord(word)}
                    className="hover:bg-destructive/20 rounded-full p-0.5 transition-colors"
                    aria-label={`حذف ${word}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              المجموع: <span className="num font-semibold">{data.blockedWords.length}</span> كلمة
            </p>
          </>
        ) : (
          <div className="border-2 border-dashed border-border rounded-xl p-6 text-center">
            <Ban className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">لا توجد كلمات ممنوعة بعد</p>
          </div>
        )}
      </Card>
    </div>
  );
}

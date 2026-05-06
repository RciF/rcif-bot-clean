import { useState } from 'react';
import { Type, MessageCircle, Ban, X, Plus } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Slider } from '@/components/ui/Slider';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Separator } from '@/components/ui/Separator';

export function AILimitsTab({ data, updateField, setData }) {
  const [newWord, setNewWord] = useState('');

  const maxLen          = data.max_response_length ?? data.maxResponseLength ?? 500;
  const messagesPerDay  = data.messages_per_day    ?? data.messagesPerDay    ?? 50;
  const blockedWords    = data.blocked_words       ?? data.blockedWords      ?? [];

  const addBlockedWord = () => {
    const trimmed = newWord.trim();
    if (!trimmed) return;
    if (blockedWords.includes(trimmed)) {
      setNewWord('');
      return;
    }
    setData((prev) => ({
      ...prev,
      blocked_words: [...(prev.blocked_words ?? prev.blockedWords ?? []), trimmed],
    }));
    setNewWord('');
  };

  const removeBlockedWord = (word) => {
    setData((prev) => ({
      ...prev,
      blocked_words: (prev.blocked_words ?? prev.blockedWords ?? []).filter((w) => w !== word),
    }));
  };

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-500 flex items-center justify-center flex-shrink-0">
            <Type className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold mb-1">أقصى طول للرد</h3>
            <p className="text-sm text-muted-foreground">عدد الأحرف الأقصى في كل رد من AI</p>
          </div>
          <div className="text-end">
            <div className="text-2xl font-bold lyn-text-gradient num">{maxLen}</div>
            <div className="text-xs text-muted-foreground">حرف</div>
          </div>
        </div>

        <Slider
          value={[maxLen]}
          onValueChange={([v]) => updateField('max_response_length', v)}
          min={50}
          max={2000}
          step={50}
        />
      </Card>

      <Card className="p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-pink-500/10 text-pink-500 flex items-center justify-center flex-shrink-0">
            <MessageCircle className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold mb-1">حد الرسائل اليومي</h3>
            <p className="text-sm text-muted-foreground">عدد الرسائل الأقصى للسيرفر في اليوم</p>
          </div>
          <div className="text-end">
            <div className="text-2xl font-bold lyn-text-gradient num">{messagesPerDay}</div>
            <div className="text-xs text-muted-foreground">رسالة/يوم</div>
          </div>
        </div>

        <Slider
          value={[messagesPerDay]}
          onValueChange={([v]) => updateField('messages_per_day', v)}
          min={5}
          max={500}
          step={5}
        />

        <p className="text-xs text-muted-foreground mt-3">
          💡 الحد الأعلى يعتمد على خطة الاشتراك
        </p>
      </Card>

      <Card className="p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center flex-shrink-0">
            <Ban className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold mb-1">الكلمات الممنوعة</h3>
            <p className="text-sm text-muted-foreground">AI ما راح يستخدم هذي الكلمات في ردوده</p>
          </div>
        </div>

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

        {blockedWords.length > 0 ? (
          <>
            <Separator className="mb-4" />
            <div className="flex flex-wrap gap-2">
              {blockedWords.map((word) => (
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
              المجموع: <span className="num font-semibold">{blockedWords.length}</span> كلمة
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
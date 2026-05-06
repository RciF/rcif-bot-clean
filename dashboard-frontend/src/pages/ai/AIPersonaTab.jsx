import { Heart, Briefcase, Smile, GraduationCap, Wand2, Check } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

const PERSONAS = [
  {
    id: 'friendly',
    name: 'ودود',
    icon: Heart,
    color: 'from-pink-500 to-rose-500',
    description: 'دافئ ومرحب — يستخدم إيموجيات ولغة ودودة',
    sample: 'أهلاً وسهلاً! 🌸 كيف أقدر أساعدك اليوم؟',
  },
  {
    id: 'serious',
    name: 'جدي',
    icon: Briefcase,
    color: 'from-slate-500 to-slate-700',
    description: 'مباشر ومهني — لا إيموجيات، لغة رسمية',
    sample: 'مرحباً. ما هو السؤال الذي تحتاج المساعدة فيه؟',
  },
  {
    id: 'fun',
    name: 'مرح',
    icon: Smile,
    color: 'from-amber-400 to-orange-500',
    description: 'خفيف الظل — نكت وردود ظريفة',
    sample: 'هلا والله! 😄 إيش الحركة اللي تبيها مني اليوم؟',
  },
  {
    id: 'professional',
    name: 'محترف',
    icon: GraduationCap,
    color: 'from-violet-500 to-indigo-600',
    description: 'متخصص ودقيق — مناسب للسيرفرات التعليمية والمهنية',
    sample: 'مرحباً، تفضل بطرح استفسارك وسأقدم لك الإجابة بأفضل صورة.',
  },
];

export function AIPersonaTab({ data, updateField }) {
  const persona = data.persona ?? 'friendly';
  const customPrompt = data.custom_prompt ?? data.customPrompt ?? '';
  const isCustom = persona === 'custom';

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-4">
          <h3 className="font-bold mb-1">اختر شخصية AI</h3>
          <p className="text-sm text-muted-foreground">
            كل شخصية لها أسلوب رد مختلف — اختر اللي يناسب سيرفرك
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {PERSONAS.map((p) => {
            const Icon = p.icon;
            const isSelected = persona === p.id;
            return (
              <button
                key={p.id}
                onClick={() => updateField('persona', p.id)}
                className={cn(
                  'group text-start p-4 rounded-2xl border-2 transition-all hover:border-primary/50',
                  isSelected ? 'border-primary bg-primary/5' : 'border-border bg-card',
                )}
              >
                <div className="flex items-start gap-3 mb-2">
                  <div className={cn(
                    'w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center flex-shrink-0',
                    p.color,
                  )}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold">{p.name}</h4>
                      {isSelected && <Check className="w-4 h-4 text-primary" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {p.description}
                    </p>
                  </div>
                </div>
                <div className="text-xs italic text-muted-foreground bg-muted/40 rounded-lg p-2 border border-border">
                  &ldquo;{p.sample}&rdquo;
                </div>
              </button>
            );
          })}

          {/* Custom */}
          <button
            onClick={() => updateField('persona', 'custom')}
            className={cn(
              'text-start p-4 rounded-2xl border-2 transition-all hover:border-primary/50 sm:col-span-2',
              isCustom ? 'border-primary bg-primary/5' : 'border-border bg-card',
            )}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center flex-shrink-0">
                <Wand2 className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold">شخصية مخصصة</h4>
                  {isCustom && <Check className="w-4 h-4 text-primary" />}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  اكتب وصف شخصية AI بنفسك
                </p>
              </div>
            </div>
          </button>
        </div>
      </div>

      {isCustom && (
        <Card className="p-5">
          <label className="font-bold block mb-2">وصف الشخصية المخصصة</label>
          <p className="text-xs text-muted-foreground mb-3">
            اكتب كيف تريد AI أن يتصرف، نبرة الردود، الأسلوب، إلخ
          </p>
          <textarea
            value={customPrompt}
            onChange={(e) => updateField('custom_prompt', e.target.value)}
            placeholder="مثال: أنت Lyn — مساعد ودود لسيرفرات الجيمنج. تستخدم لغة بسيطة وودودة..."
            rows={6}
            className={cn(
              'w-full rounded-xl border border-border bg-background px-4 py-3 text-sm',
              'placeholder:text-muted-foreground',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background',
              'resize-y min-h-[120px]',
            )}
            maxLength={2000}
          />
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-muted-foreground">
              💡 كلما كان الوصف أوضح، كانت ردود AI أدق
            </p>
            <span className="text-xs text-muted-foreground num">
              {customPrompt?.length || 0} / 2000
            </span>
          </div>
        </Card>
      )}
    </div>
  );
}
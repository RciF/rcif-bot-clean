import { Heart, Briefcase, Smile, GraduationCap, Wand2, Check } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
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

/**
 * AIPersonaTab — اختيار شخصية AI
 */
export function AIPersonaTab({ data, updateField }) {
  const isCustom = data.persona === 'custom';

  return (
    <div className="space-y-4">
      {/* ── Persona Cards ── */}
      <div>
        <div className="mb-4">
          <h3 className="font-bold mb-1">اختر شخصية AI</h3>
          <p className="text-sm text-muted-foreground">
            كل شخصية لها أسلوب رد مختلف — اختر اللي يناسب سيرفرك
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {PERSONAS.map((persona) => {
            const Icon = persona.icon;
            const isSelected = data.persona === persona.id;

            return (
              <button
                key={persona.id}
                onClick={() => updateField('persona', persona.id)}
                className={cn(
                  'group text-start p-4 rounded-2xl border-2 transition-all',
                  'hover:border-primary/50',
                  isSelected
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border bg-card',
                )}
              >
                <div className="flex items-start gap-3 mb-3">
                  <div
                    className={cn(
                      'w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center flex-shrink-0',
                      persona.color,
                    )}
                  >
                    <Icon className="w-5 h-5 text-white" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-base">{persona.name}</h4>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {persona.description}
                    </p>
                  </div>
                </div>

                {/* Sample */}
                <div
                  className={cn(
                    'rounded-lg px-3 py-2 text-xs',
                    isSelected
                      ? 'bg-primary/10 text-foreground'
                      : 'bg-muted/50 text-muted-foreground',
                  )}
                >
                  💬 {persona.sample}
                </div>
              </button>
            );
          })}

          {/* Custom Persona Card */}
          <button
            onClick={() => updateField('persona', 'custom')}
            className={cn(
              'sm:col-span-2 group text-start p-4 rounded-2xl border-2 transition-all',
              'hover:border-primary/50',
              isCustom ? 'border-primary bg-primary/5' : 'border-dashed border-border bg-card',
            )}
          >
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center flex-shrink-0 lyn-glow">
                <Wand2 className="w-5 h-5 text-white" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-base">شخصية مخصصة</h4>
                  {isCustom && (
                    <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                      <Check className="w-3 h-3" />
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  اكتب شخصية AI بنفسك — تحكم كامل في الأسلوب والنبرة
                </p>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* ── Custom Prompt Editor ── */}
      {isCustom && (
        <Card className="p-5 animate-lyn-fade-up">
          <div className="mb-3">
            <h3 className="font-bold mb-1">نص الشخصية المخصصة</h3>
            <p className="text-sm text-muted-foreground">
              اكتب نصاً يصف شخصية AI — مثلاً: "أنت مساعد ودود متخصص في الجيمنج..."
            </p>
          </div>

          <textarea
            value={data.customPrompt || ''}
            onChange={(e) => updateField('customPrompt', e.target.value)}
            placeholder="مثال: أنت Lyn، مساعد دافئ ومرح يحب المساعدة. تستخدم لغة بسيطة وودودة..."
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
              {data.customPrompt?.length || 0} / 2000
            </span>
          </div>
        </Card>
      )}
    </div>
  );
}

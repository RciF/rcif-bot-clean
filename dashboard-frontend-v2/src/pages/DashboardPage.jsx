import { Server, Users, MessageSquare, TrendingUp, Bot, Activity } from 'lucide-react';
import { cn, formatCompact } from '@/lib/utils';

const stats = [
  { label: 'السيرفرات النشطة', value: 1247, change: '+12%', icon: Server, color: 'from-lyn-500 to-lyn-pink-500' },
  { label: 'إجمالي الأعضاء', value: 458920, change: '+8.2%', icon: Users, color: 'from-lyn-pink-500 to-lyn-500' },
  { label: 'الرسائل اليوم', value: 89432, change: '+24%', icon: MessageSquare, color: 'from-lyn-400 to-lyn-pink-400' },
  { label: 'محادثات AI', value: 12459, change: '+18%', icon: Bot, color: 'from-lyn-pink-400 to-lyn-400' },
];

const activities = [
  { server: 'سيرفر الجيمنج العربي', action: 'انضم 5 أعضاء جدد', time: 'قبل دقيقتين', type: 'join' },
  { server: 'مجتمع المطورين', action: 'تم تفعيل الحماية', time: 'قبل 5 دقائق', type: 'protection' },
  { server: 'قروب الأصدقاء', action: 'محادثة AI جديدة', time: 'قبل 12 دقيقة', type: 'ai' },
  { server: 'سيرفر التعليم', action: 'فعالية جديدة', time: 'قبل 30 دقيقة', type: 'event' },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Welcome Header */}
      <div className="rounded-2xl lyn-gradient-soft p-6 border border-border">
        <h1 className="text-3xl font-bold mb-2">
          مرحباً 👋 <span className="lyn-text-gradient">المطوّر</span>
        </h1>
        <p className="text-muted-foreground">
          إليك نظرة عامة على أداء بوت Lyn اليوم
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="p-5 rounded-2xl bg-card border border-border hover:lyn-glow transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={cn('w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center', stat.color)}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <span className="text-xs font-medium text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-md num">
                  {stat.change}
                </span>
              </div>
              <div className="text-2xl font-bold mb-1 num">{formatCompact(stat.value)}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          );
        })}
      </div>

      {/* Two Column */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Feed */}
        <div className="lg:col-span-2 rounded-2xl bg-card border border-border p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              النشاط الأخير
            </h2>
            <button className="text-sm text-primary hover:underline">عرض الكل</button>
          </div>
          <div className="space-y-3">
            {activities.map((activity, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent transition-colors"
              >
                <div className="w-10 h-10 rounded-xl lyn-gradient flex items-center justify-center flex-shrink-0">
                  <Server className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{activity.server}</div>
                  <div className="text-sm text-muted-foreground">{activity.action}</div>
                </div>
                <div className="text-xs text-muted-foreground whitespace-nowrap">
                  {activity.time}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="rounded-2xl bg-card border border-border p-6">
          <h2 className="text-lg font-bold mb-5 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            أداء البوت
          </h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">وقت التشغيل</span>
                <span className="font-semibold num">99.8%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full lyn-gradient rounded-full" style={{ width: '99.8%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">سرعة الاستجابة</span>
                <span className="font-semibold num">95%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full lyn-gradient rounded-full" style={{ width: '95%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">استخدام الذاكرة</span>
                <span className="font-semibold num">68%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full lyn-gradient rounded-full" style={{ width: '68%' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

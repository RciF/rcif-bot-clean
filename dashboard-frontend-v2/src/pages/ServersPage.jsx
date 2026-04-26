import { Server, Plus, Search, Settings, Users, Crown } from 'lucide-react';
import { useState } from 'react';
import { cn, formatCompact } from '@/lib/utils';

const mockServers = [
  { id: '1', name: 'سيرفر الجيمنج العربي', members: 12500, online: 3420, plan: 'Diamond', icon: '🎮', active: true },
  { id: '2', name: 'مجتمع المطورين', members: 8900, online: 1820, plan: 'Gold', icon: '💻', active: true },
  { id: '3', name: 'قروب الأصدقاء', members: 156, online: 42, plan: 'Free', icon: '👥', active: true },
  { id: '4', name: 'سيرفر التعليم', members: 4500, online: 890, plan: 'Silver', icon: '📚', active: false },
];

const planColors = {
  Diamond: 'from-cyan-500 to-blue-500',
  Gold: 'from-yellow-500 to-orange-500',
  Silver: 'from-gray-400 to-gray-600',
  Free: 'from-zinc-500 to-zinc-700',
};

export default function ServersPage() {
  const [search, setSearch] = useState('');

  const filtered = mockServers.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-1">السيرفرات</h1>
          <p className="text-muted-foreground">إدارة سيرفرات Discord المتصلة</p>
        </div>
        <button className="px-5 py-2.5 rounded-xl lyn-gradient text-white font-semibold hover:scale-105 transition-transform inline-flex items-center gap-2 lyn-glow">
          <Plus className="w-5 h-5" />
          <span>إضافة سيرفر</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث عن سيرفر..."
          className="w-full pr-12 pl-4 py-3 rounded-xl bg-card border border-border focus:border-primary focus:outline-none transition-colors"
        />
      </div>

      {/* Servers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((server) => (
          <div
            key={server.id}
            className="group p-5 rounded-2xl bg-card border border-border hover:lyn-glow transition-all"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center text-2xl">
                  {server.icon}
                </div>
                <div>
                  <div className="font-bold mb-1">{server.name}</div>
                  <div className={cn(
                    'inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md bg-gradient-to-r text-white',
                    planColors[server.plan]
                  )}>
                    <Crown className="w-3 h-3" />
                    <span>{server.plan}</span>
                  </div>
                </div>
              </div>
              <div className={cn(
                'w-2.5 h-2.5 rounded-full mt-1',
                server.active ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground'
              )} />
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="text-center p-3 rounded-xl bg-accent/50">
                <div className="text-lg font-bold num">{formatCompact(server.members)}</div>
                <div className="text-xs text-muted-foreground">إجمالي الأعضاء</div>
              </div>
              <div className="text-center p-3 rounded-xl bg-accent/50">
                <div className="text-lg font-bold text-emerald-500 num">{formatCompact(server.online)}</div>
                <div className="text-xs text-muted-foreground">متصل الآن</div>
              </div>
            </div>

            <button className="w-full py-2.5 rounded-xl bg-accent hover:bg-primary hover:text-primary-foreground font-medium transition-colors inline-flex items-center justify-center gap-2">
              <Settings className="w-4 h-4" />
              <span>إدارة</span>
            </button>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <Server className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-bold mb-2">لا توجد سيرفرات</h3>
          <p className="text-muted-foreground">جرّب البحث بكلمة أخرى أو أضف سيرفر جديد</p>
        </div>
      )}
    </div>
  );
}

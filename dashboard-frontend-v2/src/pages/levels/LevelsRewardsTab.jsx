import { useState } from 'react';
import { Trophy, Plus, X, Award } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/shared/EmptyState';

export function LevelsRewardsTab({ data, setData }) {
  const [newLevel, setNewLevel] = useState('');

  const addReward = () => {
    const lvl = parseInt(newLevel);
    if (!lvl || lvl < 1 || lvl > 1000) return;
    if (data.roleRewards?.find((r) => r.level === lvl)) {
      setNewLevel('');
      return;
    }
    setData((prev) => ({
      ...prev,
      roleRewards: [...(prev.roleRewards || []), { level: lvl, roleId: null }].sort(
        (a, b) => a.level - b.level,
      ),
    }));
    setNewLevel('');
  };

  const removeReward = (level) => {
    setData((prev) => ({
      ...prev,
      roleRewards: (prev.roleRewards || []).filter((r) => r.level !== level),
    }));
  };

  return (
    <div className="space-y-4">
      {/* Add New Reward */}
      <Card className="p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center flex-shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold mb-1">مكافآت الرتب</h3>
            <p className="text-sm text-muted-foreground">
              عند وصول العضو لمستوى معين، يحصل على رتبة تلقائياً
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Input
            type="number"
            min={1}
            max={1000}
            value={newLevel}
            onChange={(e) => setNewLevel(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addReward()}
            placeholder="المستوى (مثل: 10)"
            className="flex-1"
          />
          <Button onClick={addReward} disabled={!newLevel}>
            <Plus className="w-4 h-4" />
            إضافة
          </Button>
        </div>
      </Card>

      {/* Rewards List */}
      <Card className="p-5">
        <h3 className="font-bold mb-4">المكافآت الحالية</h3>

        {data.roleRewards?.length > 0 ? (
          <div className="space-y-2">
            {data.roleRewards.map((reward) => (
              <div
                key={reward.level}
                className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-border/80 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg lyn-gradient flex items-center justify-center flex-shrink-0">
                  <Trophy className="w-5 h-5 text-white" />
                </div>

                <div className="flex-1">
                  <div className="font-medium text-sm">
                    المستوى <span className="num lyn-text-gradient font-bold">{reward.level}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {reward.roleId
                      ? `رتبة ID: ${reward.roleId}`
                      : '⚠️ لم يتم اختيار رتبة (RolePicker قيد البناء)'}
                  </div>
                </div>

                <button
                  onClick={() => removeReward(reward.level)}
                  className="w-8 h-8 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive flex items-center justify-center transition-colors"
                  aria-label="حذف"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Trophy />}
            title="لا توجد مكافآت بعد"
            description="أضف مستوى من فوق لإنشاء أول مكافأة"
            size="sm"
          />
        )}
      </Card>
    </div>
  );
}

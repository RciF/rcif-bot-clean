import { useEffect, useState } from 'react';
import { ShoppingBag, Package, Crown, Infinity as InfinityIcon } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { mock } from '@/lib/mock';
import { formatCompact } from '@/lib/utils';

export function EconomyShopTab({ data }) {
  const [shop, setShop] = useState(null);

  useEffect(() => {
    mock.economyShop().then(setShop);
  }, []);

  if (!shop) {
    return (
      <Card className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-violet-500/10 text-violet-500 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold">منتجات المتجر</h3>
              <p className="text-sm text-muted-foreground">
                {shop.length} منتج متوفر
              </p>
            </div>
          </div>
          <Button variant="default" size="sm" disabled>
            + إضافة منتج
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {shop.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-border p-4 hover:border-border/80 transition-colors"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-2xl flex-shrink-0">
                    {item.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold truncate">{item.name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {item.description}
                    </div>
                  </div>
                </div>
                {item.type === 'role' && (
                  <Badge variant="warning" size="sm">
                    <Crown className="w-3 h-3" />
                    رتبة
                  </Badge>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border">
                <div className="flex items-center gap-1 text-sm">
                  <Package className="w-3.5 h-3.5 text-muted-foreground" />
                  {item.stock === -1 ? (
                    <span className="text-muted-foreground flex items-center gap-1">
                      <InfinityIcon className="w-3 h-3" />
                      غير محدود
                    </span>
                  ) : (
                    <span className="num font-medium">{item.stock} متبقي</span>
                  )}
                </div>
                <div className="text-lg font-bold lyn-text-gradient num">
                  {data.currencySymbol} {formatCompact(item.price)}
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground mt-4 text-center">
          إضافة/تعديل/حذف المنتجات قيد البناء
        </p>
      </Card>
    </div>
  );
}

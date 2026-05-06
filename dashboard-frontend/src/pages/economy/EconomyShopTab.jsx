import { useEffect, useState } from 'react';
import {
  ShoppingBag,
  Package,
  Crown,
  Infinity as InfinityIcon,
  Plus,
  Edit3,
  Trash2,
  X,
  Save,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { RolePicker } from '@/components/shared/RolePicker';
import { EmptyState } from '@/components/shared/EmptyState';
import { useGuildStore } from '@/store/guildStore';
import { settingsApi } from '@/api';
import { formatCompact, cn } from '@/lib/utils';
import { toast } from 'sonner';

const DEFAULT_ITEM = {
  name: '',
  emoji: '🎁',
  price: 100,
  type: 'item',
  role_id: null,
  stock: -1,
  description: '',
};

export function EconomyShopTab({ data }) {
  const { selectedGuildId } = useGuildStore();
  const [shop, setShop] = useState(null);
  const [editing, setEditing] = useState(null); // {item} للتعديل، {item: DEFAULT_ITEM} للإضافة
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [saving, setSaving] = useState(false);

  // ─── Load shop ───
  useEffect(() => {
    if (!selectedGuildId) {
      setShop([]);
      return;
    }

    let mounted = true;
    setShop(null);

    settingsApi
      .getShop(selectedGuildId)
      .then((items) => {
        if (!mounted) return;
        setShop(Array.isArray(items) ? items : []);
      })
      .catch((err) => {
        if (!mounted) return;
        setShop([]);
        toast.error(err.message || 'فشل تحميل المتجر');
      });

    return () => { mounted = false; };
  }, [selectedGuildId]);

  // ─── Save full shop list to API ───
  const saveShop = async (newItems) => {
    if (!selectedGuildId) return false;
    setSaving(true);
    try {
      // التخلص من id لأن الباك اند يعيد INSERT (DELETE+INSERT transaction)
      const cleanItems = newItems.map(({ id, guild_id, created_at, ...rest }) => rest);
      await settingsApi.saveShop(selectedGuildId, cleanItems);
      // إعادة جلب القائمة عشان نحصل على الـ IDs الجديدة
      const fresh = await settingsApi.getShop(selectedGuildId);
      setShop(Array.isArray(fresh) ? fresh : []);
      return true;
    } catch (err) {
      if (err.code === 'PLAN_REQUIRED') {
        toast.error('تعديل المتجر يحتاج خطة Gold أو أعلى');
      } else {
        toast.error(err.message || 'فشل حفظ المتجر');
      }
      return false;
    } finally {
      setSaving(false);
    }
  };

  // ─── Handlers ───
  const handleAddNew = () => {
    setEditing({ item: { ...DEFAULT_ITEM }, isNew: true });
  };

  const handleEdit = (item) => {
    setEditing({ item: { ...item }, isNew: false });
  };

  const handleSaveItem = async () => {
    const item = editing.item;
    if (!item.name?.trim()) {
      toast.error('الاسم مطلوب');
      return;
    }
    if (!item.price || item.price < 1) {
      toast.error('السعر لازم يكون أكبر من صفر');
      return;
    }
    if (item.type === 'role' && !item.role_id) {
      toast.error('اختر الرتبة المرتبطة بالعنصر');
      return;
    }

    let newItems;
    if (editing.isNew) {
      newItems = [...(shop || []), item];
    } else {
      newItems = shop.map((s) => (s.id === item.id ? item : s));
    }

    const ok = await saveShop(newItems);
    if (ok) {
      toast.success(editing.isNew ? 'تم إضافة المنتج' : 'تم تحديث المنتج');
      setEditing(null);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const newItems = shop.filter((s) => s.id !== confirmDelete.id);
    const ok = await saveShop(newItems);
    if (ok) {
      toast.success('تم حذف المنتج');
      setConfirmDelete(null);
    }
  };

  const updateEditField = (field, value) => {
    setEditing((prev) => ({
      ...prev,
      item: { ...prev.item, [field]: value },
    }));
  };

  // ─── Loading ───
  if (shop === null) {
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
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-violet-500/10 text-violet-500 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold">منتجات المتجر</h3>
              <p className="text-sm text-muted-foreground">
                <span className="num">{shop.length}</span> منتج متوفر
              </p>
            </div>
          </div>
          <Button variant="default" size="sm" onClick={handleAddNew} disabled={saving}>
            <Plus className="w-4 h-4" />
            إضافة منتج
          </Button>
        </div>

        {shop.length === 0 ? (
          <EmptyState
            icon={<ShoppingBag />}
            title="المتجر فارغ"
            description="أضف منتجات للمتجر علشان الأعضاء يقدرون يشترونها بالكوينز"
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {shop.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-border p-4 hover:border-border/80 transition-colors group"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-2xl flex-shrink-0">
                      {item.emoji || '🎁'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold truncate">{item.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {item.description || 'بدون وصف'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-1">
                    {item.type === 'role' && (
                      <Badge variant="warning" size="sm">
                        <Crown className="w-3 h-3" />
                        رتبة
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <div className="flex items-center gap-1 text-sm">
                    <Package className="w-3.5 h-3.5 text-muted-foreground" />
                    {item.stock === -1 || item.stock === null ? (
                      <span className="text-muted-foreground flex items-center gap-1">
                        <InfinityIcon className="w-3 h-3" />
                        غير محدود
                      </span>
                    ) : (
                      <span className="num font-medium">{item.stock} متبقي</span>
                    )}
                  </div>
                  <div className="text-lg font-bold lyn-text-gradient num">
                    {data?.currency_symbol || data?.currencySymbol || '🪙'}{' '}
                    {formatCompact(item.price)}
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-border flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(item)}>
                    <Edit3 className="w-3.5 h-3.5" />
                    تعديل
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmDelete(item)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    حذف
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ═══ Edit/Add Dialog ═══ */}
      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing?.isNew ? 'إضافة منتج جديد' : 'تعديل المنتج'}
            </DialogTitle>
            <DialogDescription>
              {editing?.isNew
                ? 'أضف منتج جديد للمتجر'
                : 'عدّل تفاصيل المنتج'}
            </DialogDescription>
          </DialogHeader>

          {editing && (
            <div className="space-y-3">
              {/* Name */}
              <div>
                <label className="text-sm font-medium mb-1.5 block">الاسم *</label>
                <Input
                  value={editing.item.name}
                  onChange={(e) => updateEditField('name', e.target.value)}
                  placeholder="مثال: سيارة فاخرة"
                  maxLength={50}
                />
              </div>

              {/* Emoji + Price */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">الإيموجي</label>
                  <Input
                    value={editing.item.emoji || ''}
                    onChange={(e) => updateEditField('emoji', e.target.value)}
                    placeholder="🎁"
                    maxLength={4}
                    className="text-center text-lg"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium mb-1.5 block">السعر *</label>
                  <Input
                    type="number"
                    min={1}
                    value={editing.item.price}
                    onChange={(e) =>
                      updateEditField('price', parseInt(e.target.value) || 0)
                    }
                    placeholder="100"
                    className="num"
                  />
                </div>
              </div>

              {/* Type */}
              <div>
                <label className="text-sm font-medium mb-1.5 block">النوع</label>
                <Select
                  value={editing.item.type || 'item'}
                  onValueChange={(v) => updateEditField('type', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="item">📦 عنصر</SelectItem>
                    <SelectItem value="role">👑 رتبة</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Role picker (لو type = role) */}
              {editing.item.type === 'role' && (
                <div>
                  <label className="text-sm font-medium mb-1.5 block">الرتبة *</label>
                  <RolePicker
                    value={editing.item.role_id}
                    onChange={(v) => updateEditField('role_id', v)}
                    placeholder="اختر الرتبة..."
                  />
                </div>
              )}

              {/* Stock */}
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  المخزون
                  <span className="text-muted-foreground text-xs ms-2">
                    (-1 = غير محدود)
                  </span>
                </label>
                <Input
                  type="number"
                  min={-1}
                  value={editing.item.stock ?? -1}
                  onChange={(e) =>
                    updateEditField('stock', parseInt(e.target.value))
                  }
                  className="num"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-sm font-medium mb-1.5 block">الوصف</label>
                <Input
                  value={editing.item.description || ''}
                  onChange={(e) => updateEditField('description', e.target.value)}
                  placeholder="وصف المنتج (اختياري)"
                  maxLength={100}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditing(null)}
              className="flex-1"
              disabled={saving}
            >
              إلغاء
            </Button>
            <Button onClick={handleSaveItem} className="flex-1" disabled={saving}>
              <Save className="w-4 h-4" />
              {saving ? 'جاري الحفظ...' : 'حفظ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Delete Confirm Dialog ═══ */}
      <Dialog
        open={!!confirmDelete}
        onOpenChange={(v) => !v && setConfirmDelete(null)}
      >
        <DialogContent>
          <div className="flex justify-center -mt-4 mb-2">
            <div className="w-16 h-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center">
              <Trash2 className="w-8 h-8" />
            </div>
          </div>
          <DialogHeader>
            <DialogTitle className="text-center">حذف المنتج؟</DialogTitle>
            <DialogDescription className="text-center">
              راح يتم حذف{' '}
              <span className="font-bold text-foreground">
                {confirmDelete?.emoji} {confirmDelete?.name}
              </span>{' '}
              نهائياً
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDelete(null)}
              className="flex-1"
              disabled={saving}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleDelete}
              className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              disabled={saving}
            >
              <Trash2 className="w-4 h-4" />
              {saving ? 'جاري الحذف...' : 'حذف نهائياً'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
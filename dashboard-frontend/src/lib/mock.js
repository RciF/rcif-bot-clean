/**
 * ═══════════════════════════════════════════════════════════
 *  mock.js — DEPRECATED
 *
 *  هذا الملف كان يحتوي على بيانات وهمية للتطوير.
 *  تم إزالة كل البيانات الوهمية بناءً على قرار المشروع:
 *
 *    "كل شي في الداش بورد لازم يكون مربوط بـ APIs الحقيقية وشغال"
 *
 *  الصفحات اللي كانت تستورد من هنا تم ربطها بالـ APIs الحقيقية.
 *  لو لقيت ملف لسا يستورد من هنا — حدّثه ليستخدم APIs من '@/api'.
 *
 *  هذا الـ stub مخلّى عمداً عشان يطلع خطأ واضح لو نسي أحد ملف
 *  ما تحدّث، بدل ما يطلع الكود مع بيانات وهمية بصمت.
 * ═══════════════════════════════════════════════════════════
 */

const DEPRECATION_ERROR =
  'mock.js was removed. Use APIs from @/api instead. ' +
  'See dashboard-frontend/src/api/index.js for the available endpoints.';

const proxy = new Proxy(
  {},
  {
    get(_, prop) {
      // أي محاولة للوصول لأي خاصية ترمي خطأ واضح
      throw new Error(`[mock.${String(prop)}] ${DEPRECATION_ERROR}`);
    },
  },
);

export const mock = proxy;
export default proxy;
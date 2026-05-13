/**
 * ═══════════════════════════════════════════════════════════
 *  Notification Helper — toast موحّد لكل الداش
 *  
 *  بدلاً من:
 *    toast.error(err.message || 'فشل الحفظ')
 *    console.error(err)
 *  
 *  استخدم:
 *    notify.error('فشل الحفظ', err)
 *    notify.success('تم الحفظ')
 *    notify.info('معلومة')
 *    notify.warning('تنبيه')
 * ═══════════════════════════════════════════════════════════
 */

import { toast } from 'sonner';

const ERROR_MESSAGES = {
  PLAN_REQUIRED: 'هذي الميزة تحتاج خطة أعلى',
  UNAUTHORIZED: 'غير مصرح بهذا الإجراء',
  NOT_FOUND: 'العنصر غير موجود',
  RATE_LIMIT: 'تجاوزت الحد المسموح، حاول لاحقاً',
  NETWORK: 'تحقق من اتصالك بالإنترنت',
};

/**
 * استخراج رسالة خطأ مفهومة من أي error object
 */
function extractMessage(err, fallback = 'حدث خطأ غير متوقع') {
  if (!err) return fallback;
  if (typeof err === 'string') return err;

  // كود محدد → رسالة مخصصة
  if (err.code && ERROR_MESSAGES[err.code]) {
    return ERROR_MESSAGES[err.code];
  }

  // رسالة من السيرفر
  if (err.response?.data?.error) return err.response.data.error;
  if (err.response?.data?.message) return err.response.data.message;

  // رسالة عادية
  if (err.message) return err.message;

  return fallback;
}

export const notify = {
  success(message, options = {}) {
    return toast.success(message, options);
  },

  error(message, err, options = {}) {
    const fullMessage = err ? `${message}: ${extractMessage(err)}` : message;
    // log للتشخيص حتى لو ما عرضنا للمستخدم
    if (err) {
      console.error(`[${message}]`, err);
    }
    return toast.error(fullMessage, options);
  },

  info(message, options = {}) {
    return toast.info?.(message, options) || toast(message, options);
  },

  warning(message, options = {}) {
    return toast.warning?.(message, options) || toast(message, options);
  },

  loading(message, options = {}) {
    return toast.loading(message, options);
  },

  /**
   * promise — تظهر loading ثم success/error حسب النتيجة
   * @example
   *   await notify.promise(api.save(data), {
   *     loading: 'جاري الحفظ...',
   *     success: 'تم الحفظ',
   *     error: 'فشل الحفظ'
   *   })
   */
  promise(promise, messages) {
    return toast.promise(promise, messages);
  },

  dismiss(id) {
    toast.dismiss(id);
  },
};

export default notify;
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * cn — merge classes ذكي (clsx + tailwind-merge)
 *
 * @example
 *   cn('p-4', condition && 'p-6') // → 'p-6'
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// ════════════════════════════════════════════════════════════
//  Number Formatters
// ════════════════════════════════════════════════════════════

/**
 * formatCompact — يحول الرقم لشكل مختصر
 * 1500 → 1.5K، 1234567 → 1.2M
 */
export function formatCompact(num) {
  if (typeof num !== 'number' || isNaN(num)) return '0';

  const abs = Math.abs(num);
  if (abs >= 1e9) return `${(num / 1e9).toFixed(1).replace(/\.0$/, '')}B`;
  if (abs >= 1e6) return `${(num / 1e6).toFixed(1).replace(/\.0$/, '')}M`;
  if (abs >= 1e3) return `${(num / 1e3).toFixed(1).replace(/\.0$/, '')}K`;
  return num.toString();
}

/**
 * formatNumber — تنسيق رقم بفواصل عربية
 * 1234567 → '1,234,567'
 */
export function formatNumber(num, locale = 'ar') {
  if (typeof num !== 'number' || isNaN(num)) return '0';
  return num.toLocaleString(locale);
}

/**
 * formatPercent
 */
export function formatPercent(num, decimals = 0) {
  if (typeof num !== 'number' || isNaN(num)) return '0%';
  return `${num.toFixed(decimals)}%`;
}

/**
 * formatBytes
 */
export function formatBytes(bytes, decimals = 2) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

// ════════════════════════════════════════════════════════════
//  Date Formatters
// ════════════════════════════════════════════════════════════

/**
 * formatRelativeTime — وقت نسبي بالعربي
 * (Date) → 'منذ 5 دقائق'
 */
export function formatRelativeTime(date) {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  const diff = (Date.now() - d.getTime()) / 1000;

  if (diff < 60) return 'الآن';
  if (diff < 3600) return `منذ ${Math.floor(diff / 60)} دقيقة`;
  if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} ساعة`;
  if (diff < 2592000) return `منذ ${Math.floor(diff / 86400)} يوم`;
  if (diff < 31536000) return `منذ ${Math.floor(diff / 2592000)} شهر`;
  return `منذ ${Math.floor(diff / 31536000)} سنة`;
}

/**
 * formatDate — تاريخ بالعربي
 */
export function formatDate(date, options = {}) {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options,
  });
}

// ════════════════════════════════════════════════════════════
//  Discord Helpers
// ════════════════════════════════════════════════════════════

/**
 * intToHexColor — تحويل لون Discord إلى hex
 */
export function intToHexColor(color) {
  if (!color) return '#99AAB5';
  return `#${color.toString(16).padStart(6, '0').toUpperCase()}`;
}

/**
 * hexToIntColor
 */
export function hexToIntColor(hex) {
  if (!hex) return 0;
  return parseInt(hex.replace('#', ''), 16);
}

// ════════════════════════════════════════════════════════════
//  String Helpers
// ════════════════════════════════════════════════════════════

/**
 * truncate
 */
export function truncate(str, maxLength = 50) {
  if (!str || str.length <= maxLength) return str || '';
  return str.slice(0, maxLength) + '…';
}

/**
 * pluralAr — جمع عربي ذكي
 *   pluralAr(1, 'يوم', 'يومين', 'أيام') → 'يوم'
 *   pluralAr(2, 'يوم', 'يومين', 'أيام') → 'يومين'
 *   pluralAr(5, 'يوم', 'يومين', 'أيام') → '5 أيام'
 */
export function pluralAr(count, singular, dual, plural) {
  if (count === 0) return `لا ${plural || singular}`;
  if (count === 1) return singular;
  if (count === 2) return dual || `${singular}ين`;
  if (count >= 3 && count <= 10) return `${count} ${plural || singular}`;
  return `${count} ${singular}`;
}

// ════════════════════════════════════════════════════════════
//  Misc
// ════════════════════════════════════════════════════════════

/**
 * sleep — للـ async delays
 */
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * deepClone
 */
export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * deepEqual
 */
export function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

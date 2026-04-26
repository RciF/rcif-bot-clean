import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * cn — Conditional class name merger
 * Combines clsx + tailwind-merge for safe Tailwind class composition
 *
 * @param {...any} inputs - class values
 * @returns {string} merged class string
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * formatNumber — Format number with Arabic-Indic or Western digits
 * @param {number} num
 * @param {'ar' | 'en'} locale
 * @returns {string}
 */
export function formatNumber(num, locale = 'en') {
  if (num === null || num === undefined) return '0';
  const formatter = new Intl.NumberFormat(
    locale === 'ar' ? 'ar-SA' : 'en-US',
    { maximumFractionDigits: 2 }
  );
  return formatter.format(num);
}

/**
 * formatCompact — Compact numbers (1.2K, 3.4M)
 * @param {number} num
 * @returns {string}
 */
export function formatCompact(num) {
  if (num === null || num === undefined) return '0';
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(num);
}

/**
 * sleep — Promise-based delay
 * @param {number} ms
 */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * truncate — Truncate string with ellipsis
 * @param {string} str
 * @param {number} maxLength
 */
export function truncate(str, maxLength = 50) {
  if (!str) return '';
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + '...';
}

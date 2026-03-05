// packages/utils/src/format.ts

const numberFormatterCache = new Map<string, Intl.NumberFormat>();
const dateTimeFormatterCache = new Map<string, Intl.DateTimeFormat>();

/**
 * Get a cached Intl.NumberFormat instance.
 * Recreating Intl objects is expensive, so this caches them based on locale and options.
 */
export function getNumberFormatter(
  locale: string = 'en-US',
  options?: Intl.NumberFormatOptions,
): Intl.NumberFormat {
  const cacheKey = `${locale}-${options ? JSON.stringify(options) : ''}`;
  let formatter = numberFormatterCache.get(cacheKey);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, options);
    numberFormatterCache.set(cacheKey, formatter);
  }
  return formatter;
}

/**
 * Get a cached Intl.DateTimeFormat instance.
 * Recreating Intl objects is expensive, so this caches them based on locale and options.
 */
export function getDateTimeFormatter(
  locale: string = 'en-US',
  options?: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  const cacheKey = `${locale}-${options ? JSON.stringify(options) : ''}`;
  let formatter = dateTimeFormatterCache.get(cacheKey);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, options);
    dateTimeFormatterCache.set(cacheKey, formatter);
  }
  return formatter;
}

/**
 * Format a number as currency.
 *
 * Special handling for IQD (Iraqi Dinar):
 * - IQD typically does not use decimal places in common usage.
 * - USD defaults to standard 2 decimal places.
 *
 * @param amount - The numerical amount to format.
 * @param currency - The currency code (default: 'USD'). Supported: 'USD', 'IQD'.
 * @returns The formatted currency string.
 *
 * @example
 * formatCurrency(50000, 'IQD') // -> "IQD 50,000"
 * formatCurrency(10.5, 'USD') // -> "$10.50"
 */
export function formatCurrency(
  amount: number,
  currency: 'USD' | 'IQD' = 'USD',
): string {
  return getNumberFormatter('en-US', {
    style: 'currency',
    currency,
    // IQD doesn't typically use cents in this context
    minimumFractionDigits: currency === 'IQD' ? 0 : 2,
    maximumFractionDigits: currency === 'IQD' ? 0 : 2,
  }).format(amount);
}

/**
 * Format a date string or object to a readable standard.
 * Uses 'en-US' locale with 'MMM D, YYYY' format.
 *
 * @param date - The date to format (string or Date object).
 * @returns A formatted date string (e.g., "Jan 15, 2026").
 */
export function formatDate(date: string | Date): string {
  if (!date || (date instanceof Date && Number.isNaN(date.getTime())))
    return '';
  return getDateTimeFormatter('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date instanceof Date ? date : new Date(date));
}

/**
 * Format a number with compact notation.
 * Useful for displaying large metrics (views, likes) in a concise way.
 *
 * @param number - The number to format.
 * @returns The compact string representation (e.g., "1.5M").
 *
 * @example
 * formatCompactNumber(1500000) // -> "1.5M"
 * formatCompactNumber(1200) // -> "1.2K"
 */
export function formatCompactNumber(number: number): string {
  // Validate input to avoid formatting NaN, Infinity, or non-numeric values
  if (!Number.isFinite(number)) {
    return '';
  }

  return getNumberFormatter('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(number);
}

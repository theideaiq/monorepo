// packages/utils/src/format.ts

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
// ⚡ Bolt: Cache Intl instances at the module level to avoid expensive re-instantiation
// during frequent calls (e.g., inside render loops or when formatting large lists/tables).
// This reduces main thread CPU overhead and garbage collection pauses.
const CURRENCY_FORMATTERS: Record<'USD' | 'IQD', Intl.NumberFormat> = {
  USD: new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }),
  IQD: new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'IQD',
    // IQD doesn't typically use cents in this context
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }),
};

const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

const COMPACT_NUMBER_FORMATTER = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

export function formatCurrency(
  amount: number,
  currency: 'USD' | 'IQD' = 'USD',
): string {
  const formatter = CURRENCY_FORMATTERS[currency] || CURRENCY_FORMATTERS.USD;
  return formatter.format(amount);
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
  return DATE_FORMATTER.format(date instanceof Date ? date : new Date(date));
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

  return COMPACT_NUMBER_FORMATTER.format(number);
}

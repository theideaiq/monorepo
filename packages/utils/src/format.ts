// packages/utils/src/format.ts

// Cache formatters to avoid expensive recreation on every render
const currencyFormatters = new Map<string, Intl.NumberFormat>();
let dateFormatter: Intl.DateTimeFormat | null = null;
let compactNumberFormatter: Intl.NumberFormat | null = null;
let iqdPriceFormatter: Intl.NumberFormat | null = null;

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
  if (!currencyFormatters.has(currency)) {
    currencyFormatters.set(
      currency,
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        // IQD doesn't typically use cents in this context
        minimumFractionDigits: currency === 'IQD' ? 0 : 2,
        maximumFractionDigits: currency === 'IQD' ? 0 : 2,
      }),
    );
  }
  // biome-ignore lint/style/noNonNullAssertion: The key is always set above
  return currencyFormatters.get(currency)!.format(amount);
}

/**
 * Format a number as an IQD price (decimal format without 'IQD' string).
 * Used extensively in product cards and checkout flows.
 *
 * @param amount - The numerical amount to format.
 * @returns The formatted decimal string (e.g., "50,000").
 */
export function formatPrice(amount: number): string {
  if (!iqdPriceFormatter) {
    iqdPriceFormatter = new Intl.NumberFormat('en-IQ', {
      style: 'decimal',
      maximumFractionDigits: 0,
    });
  }
  return iqdPriceFormatter.format(amount);
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
  if (!dateFormatter) {
    dateFormatter = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
  return dateFormatter.format(date instanceof Date ? date : new Date(date));
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

  if (!compactNumberFormatter) {
    compactNumberFormatter = new Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: 1,
    });
  }
  return compactNumberFormatter.format(number);
}

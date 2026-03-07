/**
 * Reusable cached Intl.NumberFormat instance for formatting IQD currency.
 * Using a cached instance prevents expensive re-instantiation during renders,
 * especially inside mapped lists like ProductCards.
 */
const iqdFormatter = new Intl.NumberFormat('en-IQ', {
  style: 'decimal',
  maximumFractionDigits: 0,
});

/**
 * Formats a number as IQD currency string.
 * Uses a cached Intl.NumberFormat for better performance.
 *
 * @param amount - The numerical amount to format
 * @returns Formatted currency string
 */
export function formatIqd(amount: number): string {
  return iqdFormatter.format(amount);
}

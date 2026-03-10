// apps/web/src/lib/formatters.ts

/**
 * Cached instance of Intl.NumberFormat for formatting Iraqi Dinar (IQD).
 * By instantiating this once, we prevent expensive re-instantiations
 * during React render cycles in components.
 */
export const iqdFormatter = new Intl.NumberFormat('en-IQ', {
  style: 'decimal',
  maximumFractionDigits: 0,
});

/**
 * Format a number as IQD.
 *
 * @param amount - The numerical amount to format.
 * @returns The formatted IQD string.
 */
export function formatIQD(amount: number): string {
  return iqdFormatter.format(amount);
}

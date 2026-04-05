/**
 * Number formatter cached at the module level.
 *
 * Instantiating Intl.NumberFormat inside React functional components or render loops
 * creates unnecessary CPU overhead and increases garbage collection, particularly when
 * rendering lists or grids of items.
 *
 * By caching the instance here, we reuse the same formatter across the application.
 */
export const priceFormatter = new Intl.NumberFormat('en-IQ', {
  style: 'decimal',
  maximumFractionDigits: 0,
});

/**
 * Helper to format price using the cached formatter
 */
export function formatPrice(value: number): string {
  return priceFormatter.format(value);
}

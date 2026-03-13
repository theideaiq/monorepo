/**
 * Cached Intl.NumberFormat instances to optimize frontend performance
 * and avoid expensive recalculations during render cycles.
 */

export const iqdFormatter = new Intl.NumberFormat('en-IQ');

export const iqdNoFractionFormatter = new Intl.NumberFormat('en-IQ', {
  style: 'decimal',
  maximumFractionDigits: 0,
});

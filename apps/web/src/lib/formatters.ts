/**
 * Cached formatters for performance optimization.
 * Prevents expensive reinstantiations during React render cycles.
 */

export const iqdFormatter = new Intl.NumberFormat('en-IQ');

export const iqdFormatterNoDecimals = new Intl.NumberFormat('en-IQ', {
  style: 'decimal',
  maximumFractionDigits: 0,
});

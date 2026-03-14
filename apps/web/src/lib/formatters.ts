export const currencyFormatter = new Intl.NumberFormat('en-IQ');

export const currencyFormatterNoDecimals = new Intl.NumberFormat('en-IQ', {
  style: 'decimal',
  maximumFractionDigits: 0,
});

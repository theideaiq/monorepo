// Cache the Intl.NumberFormat instance to improve performance
// since creating it is relatively expensive and it's used frequently in lists.
export const iqdFormatter = new Intl.NumberFormat('en-IQ', {
  style: 'decimal',
  maximumFractionDigits: 0,
});

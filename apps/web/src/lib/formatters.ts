const IQD_FORMATTER = new Intl.NumberFormat('en-IQ', {
  style: 'decimal',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatPrice(amount: number) {
  return IQD_FORMATTER.format(amount);
}

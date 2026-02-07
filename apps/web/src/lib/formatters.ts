const IQD_FORMATTER = new Intl.NumberFormat('en-IQ', {
  style: 'decimal',
  maximumFractionDigits: 0,
});

export function formatPrice(price: number): string {
  return IQD_FORMATTER.format(price);
}

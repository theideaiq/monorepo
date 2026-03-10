export const iqdFormatter = new Intl.NumberFormat('en-IQ', {
  style: 'decimal',
  maximumFractionDigits: 0,
});

export function formatPrice(price: number): string {
  return iqdFormatter.format(price);
}

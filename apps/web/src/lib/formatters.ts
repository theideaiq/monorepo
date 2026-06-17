const formatters = new Map<string, Intl.NumberFormat>();

/**
 * Formats a number as currency (IQD) using a cached Intl.NumberFormat instance.
 * @param amount The amount to format.
 * @param options Optional Intl.NumberFormatOptions.
 * @returns The formatted string.
 */
export function formatCurrency(
  amount: number,
  options?: Intl.NumberFormatOptions,
): string {
  const key = JSON.stringify(options || {});
  // Biome might complain about Map.has check then get, but it's standard pattern.
  // We can use let formatter = formatters.get(key); if (!formatter) ...
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat('en-IQ', options);
    formatters.set(key, formatter);
  }
  return formatter.format(amount);
}

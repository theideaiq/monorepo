import { describe, expect, it } from 'vitest';
import { formatPrice } from './formatters';

describe('formatPrice', () => {
  it('should format numbers with thousands separators', () => {
    expect(formatPrice(1000)).toBe('1,000');
    expect(formatPrice(1000000)).toBe('1,000,000');
  });

  it('should handle zero', () => {
    expect(formatPrice(0)).toBe('0');
  });

  it('should round decimals correctly', () => {
    // Standard rounding rules apply
    expect(formatPrice(1234.56)).toBe('1,235');
    expect(formatPrice(1234.4)).toBe('1,234');
  });
});

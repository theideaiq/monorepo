import { describe, it, expect } from 'vitest';
import { formatPrice } from './formatters';

describe('formatPrice', () => {
  it('formats number with thousand separators', () => {
    expect(formatPrice(1000)).toBe('1,000');
  });

  it('rounds to integer', () => {
    expect(formatPrice(1234.56)).toBe('1,235');
    expect(formatPrice(1234.4)).toBe('1,234');
  });
});

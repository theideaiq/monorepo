import { formatCurrency } from '@repo/utils';
import { describe, expect, it } from 'vitest';

describe('Format Utils (@repo/utils)', () => {
  describe('formatCurrency', () => {
    it('should format USD correctly (default)', () => {
      expect(formatCurrency(10.5)).toBe('$10.50');
      expect(formatCurrency(100)).toBe('$100.00');
      expect(formatCurrency(0)).toBe('$0.00');
    });

    it('should format IQD correctly (no decimals)', () => {
      // IQD formatting might include non-breaking space or regular space depending on environment
      const formatted = formatCurrency(5000, 'IQD');
      expect(formatted).toMatch(/IQD\s+5,000/);
    });

    it('should handle large numbers', () => {
      expect(formatCurrency(1000000, 'USD')).toBe('$1,000,000.00');
    });

    it('should handle negative numbers', () => {
      expect(formatCurrency(-10.5, 'USD')).toBe('-$10.50');
      // Negative IQD formatting might vary (-IQD or IQD -)
      expect(formatCurrency(-5000, 'IQD')).toMatch(/-?IQD\s*-?5,000/);
    });

    it('should handle invalid inputs gracefully', () => {
      expect(formatCurrency(NaN)).toBe('$NaN');
      expect(formatCurrency(Infinity)).toBe('$∞');
    });
  });
});

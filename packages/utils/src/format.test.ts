import { describe, expect, it } from 'vitest';
import { formatCompactNumber, formatCurrency, formatDate } from './format';

describe('format utilities', () => {
  describe('formatCurrency', () => {
    it('formats USD currency correctly', () => {
      expect(formatCurrency(10.5, 'USD')).toBe('$10.50');
      expect(formatCurrency(1000, 'USD')).toBe('$1,000.00');
    });

    it('formats IQD currency correctly', () => {
      // Note: Node's Intl implementation might format IQD as "IQD 50,000" or similar depending on environment
      // We check for the number part to ensure minimumFractionDigits is working
      const result = formatCurrency(50000, 'IQD');
      expect(result).toContain('50,000');
      expect(result).not.toContain('.00');
    });

    it('handles unhappy paths safely', () => {
      expect(formatCurrency(NaN, 'USD')).toBe('');
      expect(formatCurrency(Infinity, 'USD')).toBe('');
    });
  });

  describe('formatDate', () => {
    it('formats Date objects correctly', () => {
      const date = new Date('2026-01-15T00:00:00.000Z');
      expect(formatDate(date)).toContain('2026');
    });

    it('formats date strings correctly', () => {
      expect(formatDate('2026-01-15')).toContain('2026');
    });

    it('handles unhappy paths safely', () => {
      expect(formatDate('')).toBe('');
      expect(formatDate(new Date('invalid'))).toBe('');
      // @ts-expect-error Testing invalid input
      expect(formatDate(null)).toBe('');
      // @ts-expect-error Testing invalid input
      expect(formatDate(undefined)).toBe('');
    });
  });

  describe('formatCompactNumber', () => {
    it('formats compact numbers correctly', () => {
      expect(formatCompactNumber(1500000)).toBe('1.5M');
      expect(formatCompactNumber(1200)).toBe('1.2K');
      expect(formatCompactNumber(500)).toBe('500');
    });

    it('handles unhappy paths safely', () => {
      expect(formatCompactNumber(NaN)).toBe('');
      expect(formatCompactNumber(Infinity)).toBe('');
    });
  });
});

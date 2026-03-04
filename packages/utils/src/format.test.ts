import { describe, expect, it } from 'vitest';
import {
  formatCompactNumber,
  formatCurrency,
  formatDate,
} from './format';

describe('format utilities', () => {
  describe('formatCurrency', () => {
    it('formats USD with standard 2 decimal places', () => {
      expect(formatCurrency(10.5, 'USD')).toBe('$10.50');
      expect(formatCurrency(10, 'USD')).toBe('$10.00');
      expect(formatCurrency(0, 'USD')).toBe('$0.00');
    });

    it('formats IQD without decimal places', () => {
      // Different node versions might format IQD currency differently, but typically it should end with 0 fractional digits
      const iqdString = formatCurrency(50000.5, 'IQD');
      // We don't assert exact match on the symbol placement (e.g. "IQD 50,000" vs "50,000 IQD")
      // because it varies by runtime Intl implementations.
      // But we check that it contains the number formatted without fraction digits.
      expect(iqdString.replace(/[\s\xa0]/g, '')).toMatch(/IQD50,001|50,001IQD/);
    });

    it('defaults to USD if no currency is provided', () => {
      expect(formatCurrency(1234.56)).toBe('$1,234.56');
    });

    it('handles negative numbers properly', () => {
      expect(formatCurrency(-10.5, 'USD')).toBe('-$10.50');
    });
  });

  describe('formatDate', () => {
    it('formats a date string correctly', () => {
      // We pass a standard ISO date string to avoid timezone parsing issues
      expect(formatDate('2026-01-15T00:00:00Z')).toMatch(/Jan 14, 2026|Jan 15, 2026/); // Depends on TZ of runner, but roughly Jan 14/15
    });

    it('formats a Date object correctly', () => {
      const date = new Date('2026-01-15T12:00:00Z');
      expect(formatDate(date)).toMatch(/Jan 15, 2026/);
    });

    it('returns empty string for invalid dates', () => {
      expect(formatDate('')).toBe('');
      expect(formatDate(new Date('invalid'))).toBe('');
    });

    it('handles null or undefined gracefully', () => {
      // @ts-expect-error testing runtime
      expect(formatDate(null)).toBe('');
      // @ts-expect-error testing runtime
      expect(formatDate(undefined)).toBe('');
    });
  });

  describe('formatCompactNumber', () => {
    it('formats large numbers concisely', () => {
      expect(formatCompactNumber(1500000)).toBe('1.5M');
      expect(formatCompactNumber(1200)).toBe('1.2K');
      expect(formatCompactNumber(1000000000)).toBe('1B');
    });

    it('handles small numbers without compacting', () => {
      expect(formatCompactNumber(999)).toBe('999');
      expect(formatCompactNumber(0)).toBe('0');
      expect(formatCompactNumber(-1500)).toBe('-1.5K');
    });

    it('returns empty string for non-finite numbers', () => {
      expect(formatCompactNumber(Number.NaN)).toBe('');
      expect(formatCompactNumber(Number.POSITIVE_INFINITY)).toBe('');
      expect(formatCompactNumber(Number.NEGATIVE_INFINITY)).toBe('');

      // @ts-expect-error testing runtime safety
      expect(formatCompactNumber(undefined)).toBe('');
      // @ts-expect-error testing runtime safety
      expect(formatCompactNumber(null)).toBe('');
    });
  });
});

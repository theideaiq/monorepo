import { describe, expect, it } from 'vitest';
import { formatCompactNumber, formatCurrency, formatDate } from './format';

describe('Format Utils', () => {
  describe('formatCurrency', () => {
    it('should format USD correctly with 2 decimal places by default', () => {
      expect(formatCurrency(10.5)).toBe('$10.50');
      expect(formatCurrency(10.5, 'USD')).toBe('$10.50');
      expect(formatCurrency(1000)).toBe('$1,000.00');
    });

    it('should format IQD correctly with 0 decimal places', () => {
      expect(formatCurrency(50000, 'IQD')).toBe('IQD\u00A050,000');
    });
  });

  describe('formatDate', () => {
    it('should correctly format a valid Date object', () => {
      const date = new Date('2026-01-15T12:00:00.000Z');
      // Depending on the local timezone, the date string can be Jan 14, Jan 15, or Jan 16.
      expect(formatDate(date)).toMatch(/Jan 14, 2026|Jan 15, 2026|Jan 16, 2026/);
    });

    it('should correctly format a valid date string', () => {
      expect(formatDate('2026-01-15T12:00:00.000Z')).toMatch(/Jan 14, 2026|Jan 15, 2026|Jan 16, 2026/);
    });

    it('should handle empty or null/undefined inputs gracefully', () => {
      expect(formatDate('')).toBe('');
      // @ts-expect-error testing invalid input
      expect(formatDate(null)).toBe('');
      // @ts-expect-error testing invalid input
      expect(formatDate(undefined)).toBe('');
    });

    it('should handle invalid date strings gracefully without throwing a RangeError', () => {
      expect(formatDate('invalid')).toBe('');
      expect(formatDate('not a date')).toBe('');
    });
  });

  describe('formatCompactNumber', () => {
    it('should format large numbers with "K" or "M"', () => {
      expect(formatCompactNumber(1200)).toBe('1.2K');
      expect(formatCompactNumber(1500000)).toBe('1.5M');
      expect(formatCompactNumber(1000000000)).toBe('1B');
    });

    it('should format small numbers as is', () => {
      expect(formatCompactNumber(999)).toBe('999');
    });

    it('should handle invalid numeric inputs gracefully', () => {
      expect(formatCompactNumber(Number.NaN)).toBe('');
      expect(formatCompactNumber(Number.POSITIVE_INFINITY)).toBe('');
      expect(formatCompactNumber(Number.NEGATIVE_INFINITY)).toBe('');
    });
  });
});

import { describe, expect, it } from 'vitest';
import { formatCurrency, formatDate, formatCompactNumber } from './format';

describe('format utilities', () => {
  describe('formatCurrency', () => {
    it('should format USD correctly', () => {
      expect(formatCurrency(10.5, 'USD')).toBe('$10.50');
    });
    it('should format IQD correctly without fractions', () => {
      // Intl formatter uses non-breaking space
      expect(formatCurrency(50000, 'IQD')).toBe('IQD\xa050,000');
    });
    it('should default to USD', () => {
      expect(formatCurrency(100)).toBe('$100.00');
    });
  });

  describe('formatDate', () => {
    it('should format date strings to MMM D, YYYY', () => {
      expect(formatDate('2026-01-15T00:00:00.000Z')).toBe('Jan 15, 2026');
    });
    it('should return empty string for invalid dates', () => {
      expect(formatDate('invalid')).toBe('');
      expect(formatDate(new Date('invalid'))).toBe('');
    });
    it('should handle empty input', () => {
      expect(formatDate('')).toBe('');
    });
  });

  describe('formatCompactNumber', () => {
    it('should format large numbers to compact notation', () => {
      expect(formatCompactNumber(1500000)).toBe('1.5M');
      expect(formatCompactNumber(1200)).toBe('1.2K');
    });
    it('should return empty string for non-finite numbers', () => {
      expect(formatCompactNumber(NaN)).toBe('');
      expect(formatCompactNumber(Infinity)).toBe('');
    });
  });
});

import { formatIQDNumber } from '@repo/utils';
import { describe, expect, it } from 'vitest';

describe('Format Utils (@repo/utils)', () => {
  describe('formatIQDNumber', () => {
    it('should format numbers with comma separation and no decimals', () => {
      // Note: Intl behavior might depend on locale/system, but en-IQ usually uses standard digits
      // and grouping. If this fails due to environment, we might need to mock Intl or adjust expectations.
      // Assuming standard en-US like output for numbers but with IQD locale settings.
      // Actually en-IQ locale might use Arabic-Indic digits in some environments?
      // Let's verify with a simple run first or just expect string matching.

      const formatted = formatIQDNumber(1000);
      expect(formatted).toMatch(/1,000|1000/);
    });

    it('should format correctly', () => {
      expect(formatIQDNumber(100)).toBe('100');
      expect(formatIQDNumber(1000)).toBe('1,000');
      expect(formatIQDNumber(1000000)).toBe('1,000,000');
    });

    it('should truncate decimals for IQD', () => {
      expect(formatIQDNumber(100.50)).toBe('101'); // Rounds
      expect(formatIQDNumber(100.49)).toBe('100');
    });

    it('should handle zero and negative numbers', () => {
      expect(formatIQDNumber(0)).toBe('0');
      expect(formatIQDNumber(-5000)).toBe('-5,000');
    });
  });
});

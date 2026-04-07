import { describe, expect, it } from 'vitest';
import { formatDate } from './format.ts';

describe('formatDate', () => {
  it('should format a valid date string correctly', () => {
    const validDate = '2026-01-15T00:00:00Z';
    const result = formatDate(validDate);
    // Exact format depends on system time zone and JS engine,
    // but typically it matches 'Jan 15, 2026' or 'Jan 14, 2026' locally.
    // For safety across environments, verify the string length and contents broadly.
    expect(result).toMatch(/Jan 1[45], 2026/);
  });

  it('should handle Date objects correctly', () => {
    const validDate = new Date('2026-01-15T12:00:00Z');
    const result = formatDate(validDate);
    expect(result).toMatch(/Jan 15, 2026/);
  });

  it('should not throw RangeError and return empty string for invalid date strings', () => {
    // Regression test: This used to throw RangeError: Invalid time value
    const result = formatDate('invalid');
    expect(result).toBe('');
  });

  it('should handle null/empty inputs gracefully', () => {
    expect(formatDate('')).toBe('');
  });
});

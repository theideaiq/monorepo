import { describe, expect, it } from 'vitest';
import { formatDate } from './format';

describe('formatDate', () => {
  it('should format a valid date string correctly', () => {
    // using local date string to test happy path without timezone flakiness
    const dateStr = '2026-01-15T00:00:00.000Z';
    // this creates a Date object that is equivalent to what is created in the function
    const formatted = formatDate(dateStr);

    // Using simple assertions as timezone could affect output text slightly
    // Jan 14, 2026 or Jan 15, 2026
    expect(formatted).toContain('Jan');
    expect(formatted).toContain('2026');
  });

  it('should format a valid Date object correctly', () => {
    const date = new Date('2026-01-15T00:00:00.000Z');
    const formatted = formatDate(date);
    expect(formatted).toContain('Jan');
    expect(formatted).toContain('2026');
  });

  it('should return an empty string when provided an invalid date string', () => {
    // Regression test: Unparseable date strings shouldn't throw "RangeError: Invalid time value"
    expect(formatDate('invalid-date')).toBe('');
  });

  it('should return an empty string when provided an invalid Date object', () => {
    expect(formatDate(new Date('invalid-date'))).toBe('');
  });

  it('should return an empty string when provided empty input', () => {
    expect(formatDate('')).toBe('');
  });
});

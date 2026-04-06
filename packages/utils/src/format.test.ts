import { describe, expect, it } from 'vitest';
import { formatDate } from './format';

describe('formatDate', () => {
  it('should return empty string for invalid date string to prevent RangeError', () => {
    // Arrange
    const invalidDateString = 'invalid date';

    // Act
    const result = formatDate(invalidDateString);

    // Assert
    expect(result).toBe('');
  });

  it('should format a valid Date object correctly', () => {
    const validDate = new Date('2026-01-15T00:00:00Z');
    const result = formatDate(validDate);
    expect(result).toBe('Jan 15, 2026'); // Depends on locale, en-US expected
  });

  it('should format a valid date string correctly', () => {
    const validDateString = '2026-01-15T00:00:00Z';
    const result = formatDate(validDateString);
    expect(result).toBe('Jan 15, 2026');
  });

  it('should return empty string for null/empty values', () => {
    // @ts-expect-error Testing invalid input
    expect(formatDate(null)).toBe('');
    expect(formatDate('')).toBe('');
  });
});

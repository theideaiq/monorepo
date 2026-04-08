import { describe, expect, it } from 'vitest';
import { formatDate } from './format';

describe('formatDate', () => {
  it('should return empty string for an invalid date string', () => {
    // This previously threw a RangeError: Invalid time value
    const result = formatDate('invalid');
    expect(result).toBe('');
  });
});

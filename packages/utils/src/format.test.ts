import { describe, expect, it } from 'vitest';
import { formatIQD } from './format';

describe('formatIQD', () => {
  it('should format simple integers correctly', () => {
    expect(formatIQD(100)).toBe('100');
    expect(formatIQD(1000)).toBe('1,000');
    expect(formatIQD(50000)).toBe('50,000');
  });

  it('should round floats to nearest integer', () => {
    expect(formatIQD(100.2)).toBe('100');
    expect(formatIQD(100.5)).toBe('101');
    expect(formatIQD(100.8)).toBe('101');
    expect(formatIQD(12345.67)).toBe('12,346');
  });

  it('should handle large numbers', () => {
    expect(formatIQD(1000000)).toBe('1,000,000');
  });

  it('should handle zero', () => {
    expect(formatIQD(0)).toBe('0');
  });
});

import { describe, expect, it } from 'vitest';
import {
  formatCompactCurrency,
  formatCompactNumber,
  formatCurrency,
  formatDate,
  formatIQD,
  formatNumber,
} from './format';

describe('formatCurrency', () => {
  it('formats USD correctly', () => {
    expect(formatCurrency(10.5, 'USD')).toBe('$10.50');
  });

  it('formats IQD correctly', () => {
    // en-US locale for IQD currency style formats it with 'IQD'
    expect(formatCurrency(50000, 'IQD')).toContain('IQD');
    expect(formatCurrency(50000, 'IQD')).toContain('50,000');
  });
});

describe('formatIQD', () => {
  it('formats decimal IQD correctly without currency symbol', () => {
    expect(formatIQD(50000)).toBe('50,000');
  });
});

describe('formatDate', () => {
  it('formats date string correctly', () => {
    expect(formatDate('2026-01-15T00:00:00.000Z')).toBe('Jan 15, 2026');
  });

  it('returns empty string for invalid date', () => {
    expect(formatDate('')).toBe('');
    expect(formatDate(new Date('invalid'))).toBe('');
  });
});

describe('formatCompactNumber', () => {
  it('formats large numbers compactly', () => {
    expect(formatCompactNumber(1500000)).toBe('1.5M');
    expect(formatCompactNumber(1200)).toBe('1.2K');
  });

  it('returns empty string for non-finite numbers', () => {
    expect(formatCompactNumber(NaN)).toBe('');
  });
});

describe('formatNumber', () => {
  it('formats decimals correctly', () => {
    expect(formatNumber(1234567.89)).toBe('1,234,567.89');
  });
});

describe('formatCompactCurrency', () => {
  it('formats large currency correctly', () => {
    expect(formatCompactCurrency(1500000)).toBe('$1.5M');
  });
});

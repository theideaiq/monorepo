import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { formatCurrency } from './formatters';

describe('formatCurrency', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('formats currency correctly with default options', () => {
    expect(formatCurrency(1234.56)).toBe('1,234.56');
    expect(formatCurrency(1000)).toBe('1,000');
  });

  it('formats currency with custom options', () => {
    expect(formatCurrency(1234.56, { maximumFractionDigits: 0 })).toBe('1,235');
  });

  it('caches Intl.NumberFormat instances', () => {
    const formatMock = vi.fn((n) => `mocked ${n}`);

    // We use a regular function so it can be called with 'new'
    const spy = vi.spyOn(Intl, 'NumberFormat').mockImplementation(function(locale, options) {
      return { format: formatMock };
    // biome-ignore lint/suspicious/noExplicitAny: mocking constructor return type is complex
    } as any);

    const uniqueOptions = { minimumFractionDigits: 3 };

    formatCurrency(100, uniqueOptions);
    expect(spy).toHaveBeenCalled();

    const callsBefore = spy.mock.calls.length;

    formatCurrency(200, uniqueOptions);
    expect(spy).toHaveBeenCalledTimes(callsBefore); // Should not increase

    // Test with another set of options
    const uniqueOptions2 = { minimumFractionDigits: 4 };
    formatCurrency(300, uniqueOptions2);
    expect(spy).toHaveBeenCalledTimes(callsBefore + 1);
  });
});

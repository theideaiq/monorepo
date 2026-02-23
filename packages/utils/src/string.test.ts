import { describe, expect, it } from 'vitest';
import { safeJsonLdStringify } from './string';

describe('safeJsonLdStringify', () => {
  it('should stringify a simple object', () => {
    const data = { name: 'John Doe', age: 30 };
    expect(safeJsonLdStringify(data)).toBe('{"name":"John Doe","age":30}');
  });

  it('should escape HTML tags', () => {
    const data = { name: '<script>alert("XSS")</script>' };
    expect(safeJsonLdStringify(data)).toBe(
      '{"name":"\\u003cscript\\u003ealert(\\"XSS\\")\\u003c/script\\u003e"}'
    );
  });

  it('should escape ampersands', () => {
    const data = { name: 'Tom & Jerry' };
    expect(safeJsonLdStringify(data)).toBe('{"name":"Tom \\u0026 Jerry"}');
  });

  it('should escape line separators', () => {
    const data = { text: 'Line 1\u2028Line 2\u2029Line 3' };
    expect(safeJsonLdStringify(data)).toBe(
      '{"text":"Line 1\\u2028Line 2\\u2029Line 3"}'
    );
  });

  it('should handle nested objects', () => {
    const data = {
      user: {
        name: '<b>Bold</b>',
        bio: 'Me & You',
      },
    };
    expect(safeJsonLdStringify(data)).toBe(
      '{"user":{"name":"\\u003cb\\u003eBold\\u003c/b\\u003e","bio":"Me \\u0026 You"}}'
    );
  });

  it('should handle undefined', () => {
    expect(safeJsonLdStringify(undefined)).toBe('');
  });
});

import { describe, it, expect } from 'vitest';
import { safeJsonLdStringify } from './string';

describe('safeJsonLdStringify', () => {
  it('should stringify a simple object', () => {
    const obj = { name: 'Test' };
    expect(safeJsonLdStringify(obj)).toBe('{"name":"Test"}');
  });

  it('should escape HTML tags to prevent XSS', () => {
    const obj = { content: '<script>alert("XSS")</script>' };
    const expected = '{"content":"\\u003cscript\\u003ealert(\\"XSS\\")\\u003c/script\\u003e"}';
    expect(safeJsonLdStringify(obj)).toBe(expected);
  });

  it('should escape ampersands', () => {
    const obj = { text: 'Ben & Jerry' };
    const expected = '{"text":"Ben \\u0026 Jerry"}';
    expect(safeJsonLdStringify(obj)).toBe(expected);
  });

  it('should escape line separators', () => {
    const obj = { text: 'Line\u2028Separator' };
    const expected = '{"text":"Line\\u2028Separator"}';
    expect(safeJsonLdStringify(obj)).toBe(expected);
  });

  it('should handle nested objects', () => {
    const obj = {
      name: 'Product',
      details: {
        description: '<b>Bold</b> & Beautiful',
      },
    };
    const expected =
      '{"name":"Product","details":{"description":"\\u003cb\\u003eBold\\u003c/b\\u003e \\u0026 Beautiful"}}';
    expect(safeJsonLdStringify(obj)).toBe(expected);
  });
});

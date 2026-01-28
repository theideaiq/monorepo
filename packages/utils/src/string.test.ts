import { describe, it, expect } from 'vitest';
import { safeJsonLdStringify } from './string';

describe('safeJsonLdStringify', () => {
  it('should stringify simple objects correctly', () => {
    const data = { name: 'Sentinel', role: 'Guardian' };
    expect(safeJsonLdStringify(data)).toBe('{"name":"Sentinel","role":"Guardian"}');
  });

  it('should escape < characters to prevent XSS', () => {
    const data = { bio: '<script>alert(1)</script>' };
    const result = safeJsonLdStringify(data);
    expect(result).not.toContain('<script>');
    expect(result).toContain('\\u003cscript>');
    expect(result).toContain('\\u003c/script>');
  });

  it('should handle nested objects', () => {
    const data = { user: { name: 'Hacker', input: '<img src=x onerror=alert(1)>' } };
    const result = safeJsonLdStringify(data);
    expect(result).toContain('\\u003cimg');
  });

  it('should handle arrays', () => {
    const data = ['<a>link</a>', '<b>bold</b>'];
    const result = safeJsonLdStringify(data);
    expect(result).toBe('["\\u003ca>link\\u003c/a>","\\u003cb>bold\\u003c/b>"]');
  });
});

import { describe, it, expect } from 'vitest';
import { safeJsonLdStringify } from './string';

describe('safeJsonLdStringify', () => {
  it('should serialize simple objects', () => {
    const obj = { name: 'Test' };
    expect(safeJsonLdStringify(obj)).toBe('{"name":"Test"}');
  });

  it('should escape script tags', () => {
    const obj = { html: '<script>alert(1)</script>' };
    const result = safeJsonLdStringify(obj);
    expect(result).not.toContain('<script>');
    expect(result).not.toContain('</script>');
    expect(result).toContain('\\u003cscript\\u003e');
  });

  it('should escape special characters', () => {
    const obj = { chars: "< > & '" };
    const result = safeJsonLdStringify(obj);
    expect(result).toContain('\\u003c');
    expect(result).toContain('\\u003e');
    expect(result).toContain('\\u0026');
    expect(result).toContain('\\u0027');
  });
});

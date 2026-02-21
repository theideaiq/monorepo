import { describe, expect, it } from 'vitest';
import { safeJsonLdStringify } from './string';

describe('safeJsonLdStringify', () => {
  it('should serialize simple objects correctly', () => {
    const data = { name: 'Test' };
    expect(safeJsonLdStringify(data)).toBe('{"name":"Test"}');
  });

  it('should escape <script> tags to prevent XSS', () => {
    const data = { name: '<script>alert("XSS")</script>' };
    const result = safeJsonLdStringify(data);
    expect(result).not.toContain('<script>');
    expect(result).not.toContain('</script>');
    expect(result).toContain('\\u003cscript\\u003e');
    expect(result).toContain('\\u003c/script\\u003e');
  });

  it('should escape other dangerous characters', () => {
    const data = { content: 'Wait & See >' };
    const result = safeJsonLdStringify(data);
    expect(result).toContain('\\u0026');
    expect(result).toContain('\\u003e');
  });

  it('should handle complex objects', () => {
    const data = {
      '@context': 'https://schema.org',
      name: 'My Site',
      description: 'Contains <tags>',
    };
    const result = safeJsonLdStringify(data);
    expect(JSON.parse(result)).toEqual(data); // Should still be valid JSON when parsed (if we unescape)
    // Actually, JSON.parse handles unicode escapes, so this should pass directly
    expect(JSON.parse(result)).toEqual(data);
  });
});

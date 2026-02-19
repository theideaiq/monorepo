import { decodeHtmlEntities, safeJsonLdStringify, slugify } from '@repo/utils';
import { describe, expect, it } from 'vitest';

describe('String Utils (@repo/utils)', () => {
  describe('safeJsonLdStringify', () => {
    it('should serialize objects correctly', () => {
      expect(safeJsonLdStringify({ foo: 'bar' })).toBe('{"foo":"bar"}');
    });

    it('should escape < to \\u003c to prevent script injection', () => {
      const payload = { key: '<script>alert(1)</script>' };
      const result = safeJsonLdStringify(payload);
      // We expect strict equality with the escaped string
      expect(result).toBe('{"key":"\\u003cscript>alert(1)\\u003c/script>"}');
      // Verify no raw script tags exist
      expect(result).not.toContain('<script');
      expect(result).not.toContain('</script');
    });

    it('should handle nested objects', () => {
      const payload = { deep: { nested: '<' } };
      expect(safeJsonLdStringify(payload)).toBe('{"deep":{"nested":"\\u003c"}}');
    });
  });

  describe('slugify', () => {
    it('should convert text to a url-friendly slug', () => {
      expect(slugify('Hello World!')).toBe('hello-world');
      expect(slugify('  Spaced   String  ')).toBe('spaced-string');
      expect(slugify('Complex@#$Chars')).toBe('complexchars');
      expect(slugify('Multiple--Dashes')).toBe('multiple-dashes');
    });

    it('should handle empty, null or undefined input', () => {
      expect(slugify('')).toBe('');
      // @ts-expect-error testing runtime safety
      expect(slugify(null)).toBe('');
      // @ts-expect-error testing runtime safety
      expect(slugify(undefined)).toBe('');
    });
  });

  describe('decodeHtmlEntities', () => {
    it('should decode named entities', () => {
      expect(decodeHtmlEntities('&amp;')).toBe('&');
      expect(decodeHtmlEntities('&lt;')).toBe('<');
      expect(decodeHtmlEntities('&gt;')).toBe('>');
      expect(decodeHtmlEntities('&quot;')).toBe('"');
      expect(decodeHtmlEntities('&#39;')).toBe("'");
      expect(decodeHtmlEntities('&nbsp;')).toBe(' ');
    });

    it('should decode numeric entities', () => {
      expect(decodeHtmlEntities('&#65;')).toBe('A');
      expect(decodeHtmlEntities('&#128512;')).toBe('😀'); // Emoji
      expect(decodeHtmlEntities('&#x41;')).toBe('A'); // Lowercase hex
      expect(decodeHtmlEntities('&#X41;')).toBe('A'); // Uppercase hex
    });

    it('should handle mixed content', () => {
      expect(decodeHtmlEntities('Tom &amp; Jerry')).toBe('Tom & Jerry');
      expect(decodeHtmlEntities('1 &lt; 2')).toBe('1 < 2');
    });

    it('should handle empty or null input', () => {
      expect(decodeHtmlEntities('')).toBe('');
      // @ts-expect-error testing runtime safety
      expect(decodeHtmlEntities(null)).toBe('');
      // @ts-expect-error testing runtime safety
      expect(decodeHtmlEntities(undefined)).toBe('');
    });
  });
});

import { decodeHtmlEntities, safeJsonLdStringify, slugify } from '@repo/utils';
import { describe, expect, it } from 'vitest';

describe('String Utils (@repo/utils)', () => {
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

  describe('safeJsonLdStringify', () => {
    it('should escape HTML characters in JSON', () => {
      const data = {
        name: '<script>alert("xss")</script>',
        description: 'Me & You',
      };
      const result = safeJsonLdStringify(data);
      expect(result).not.toContain('<script>');
      expect(result).toContain('\\u003cscript\\u003e');
      expect(result).toContain('\\u0026');
    });

    it('should handle simple objects', () => {
      const data = { name: 'Test' };
      expect(safeJsonLdStringify(data)).toBe('{"name":"Test"}');
    });

    it('should handle line separators', () => {
      // Line separator U+2028 and Paragraph separator U+2029 are valid in JSON
      // but can break JavaScript strings if not escaped.
      const data = { text: 'Line\u2028Break' };
      expect(safeJsonLdStringify(data)).toContain('\\u2028');
    });
  });
});

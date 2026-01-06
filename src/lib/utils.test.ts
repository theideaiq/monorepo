import { describe, it, expect } from 'vitest';
import { decodeHtmlEntities } from './string-utils';
import { cn } from './utils';

describe('cn (classname utility)', () => {
  it('should merge classes correctly', () => {
    expect(cn('px-2 py-1', 'bg-red-500')).toBe('px-2 py-1 bg-red-500');
  });

  it('should handle conditional classes', () => {
    expect(cn('px-2', true && 'py-1', false && 'bg-red-500')).toBe('px-2 py-1');
  });

  it('should handle tailwind conflicts (last wins)', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });

  it('should handle undefined and null values', () => {
    expect(cn('px-2', undefined, null, 'py-1')).toBe('px-2 py-1');
  });
});

describe('decodeHtmlEntities', () => {
  it('should decode basic HTML entities', () => {
    expect(decodeHtmlEntities('Hello &amp; World')).toBe('Hello & World');
    expect(decodeHtmlEntities('Foo &lt; Bar')).toBe('Foo < Bar');
    expect(decodeHtmlEntities('Foo &gt; Bar')).toBe('Foo > Bar');
    expect(decodeHtmlEntities('&quot;Quote&quot;')).toBe('"Quote"');
    expect(decodeHtmlEntities('&#39;Single Quote&#39;')).toBe("'Single Quote'");
  });

  it('should handle numeric entities', () => {
    expect(decodeHtmlEntities('&#169; 2024')).toBe('© 2024');
  });

  it('should handle text without entities', () => {
    expect(decodeHtmlEntities('Hello World')).toBe('Hello World');
  });

  it('should not execute scripts', () => {
    // This function just returns a string, so execution isn't possible unless rendered unsafely.
    // However, we verify that it returns the script tag as a string string, not executed.
    // The key here is that the OUTPUT of this function will be put into {variable},
    // which React escapes. So if we decode &lt;script&gt; to <script>, React will display <script> literally.
    expect(decodeHtmlEntities('&lt;script&gt;alert(1)&lt;/script&gt;')).toBe('<script>alert(1)</script>');
  });
});

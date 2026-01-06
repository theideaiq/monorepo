import { describe, it, expect } from 'vitest';
import { decodeHtmlEntities } from './string-utils';

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
    expect(decodeHtmlEntities('&lt;script&gt;alert(1)&lt;/script&gt;')).toBe(
      '<script>alert(1)</script>',
    );
  });
});

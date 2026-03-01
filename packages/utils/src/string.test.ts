import { describe, expect, it } from 'vitest';
import { slugify } from './string';

describe('slugify', () => {
  it('converts a string to a valid URL-friendly slug', () => {
    expect(slugify('Hello World!')).toBe('hello-world');
  });

  it('handles leading and trailing whitespace', () => {
    expect(slugify('  Hello World!  ')).toBe('hello-world');
  });

  it('handles multiple spaces', () => {
    expect(slugify('Hello   World!')).toBe('hello-world');
  });

  it('removes non-word characters', () => {
    expect(slugify('Hello@#$%World!')).toBe('helloworld');
  });

  // Regression test for accent bug handling
  it('correctly normalizes accents to base characters instead of removing them', () => {
    expect(slugify('Café')).toBe('cafe');
    expect(slugify('Jalapeño')).toBe('jalapeno');
    expect(slugify('São Paulo')).toBe('sao-paulo');
    expect(slugify('Façade')).toBe('facade');
    expect(slugify('München')).toBe('munchen');
  });

  it('handles strings that are already slugs', () => {
    expect(slugify('hello-world')).toBe('hello-world');
  });

  it('handles strings with mixed casing', () => {
    expect(slugify('hElLo WoRlD')).toBe('hello-world');
  });
});

/**
 * Safely decodes HTML entities in a string.
 */
const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&nbsp;': ' ',
  '&apos;': "'",
};

// Pre-compiled regex for performance (avoids recompilation in loops).
const ENTITY_REGEX = /&[a-zA-Z0-9#]+;/g;
const NUMERIC_ENTITY_REGEX = /^&#\d+;$/;

/**
 * Decodes HTML entities in a string to their corresponding characters.
 * Handles named entities and numeric entities (decimal).
 *
 * @note Currently only supports decimal numeric entities (e.g. &#65;), not hexadecimal (e.g. &#x41;).
 *
 * @param text - The string containing HTML entities.
 * @returns The decoded string.
 */
export function decodeHtmlEntities(text: string): string {
  if (!text) return '';

  return text.replace(ENTITY_REGEX, (match) => {
    if (ENTITIES[match]) return ENTITIES[match];

    // Handle numeric entities
    if (NUMERIC_ENTITY_REGEX.test(match)) {
      // Use fromCodePoint for Emoji/Astral support
      return String.fromCodePoint(Number.parseInt(match.slice(2, -1), 10));
    }

    return match;
  });
}

/**
 * Converts a string into a URL-friendly slug.
 *
 * @warning Strips all non-English (non-ASCII) characters. Not suitable for non-Latin scripts (e.g., Arabic).
 * @throws {TypeError} If text is null or undefined.
 *
 * @param text - The text to slugify.
 * @returns The slugified string.
 *
 * @example
 * slugify("Hello World!") // -> "hello-world"
 * slugify("مرحبا") // -> "" (Returns empty string for non-Latin)
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w-]+/g, '') // Remove all non-word chars
    .replace(/--+/g, '-'); // Replace multiple - with single -
}

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
const ENTITY_REGEX = /&[a-zA-Z0-9#xX]+;/g;
const NUMERIC_ENTITY_REGEX = /^&#[xX]?[0-9a-fA-F]+;$/;

/**
 * Decodes HTML entities in a string to their corresponding characters.
 * Handles named entities and numeric entities (decimal and hex).
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
      // Handle hex vs decimal
      const lowerMatch = match.toLowerCase();
      const isHex = lowerMatch.startsWith('&#x');
      // If match is `&#X...;` or `&#x...;`, we want to slice off the first 3 characters and the last 1 character.
      // If match is `&#...;`, we slice off the first 2 characters and the last 1 character.
      const numStr = isHex ? match.slice(3, -1) : match.slice(2, -1);
      const radix = isHex ? 16 : 10;

      const parsed = Number.parseInt(numStr, radix);
      if (Number.isNaN(parsed)) return match;

      // Use fromCodePoint for Emoji/Astral support
      try {
        return String.fromCodePoint(parsed);
      } catch (e) {
        return match;
      }
    }

    return match;
  });
}

/**
 * Converts a string into a URL-friendly slug.
 *
 * @param text - The text to slugify.
 * @returns The slugified string.
 *
 * @example
 * slugify("Hello World!") // -> "hello-world"
 */
export function slugify(text: string): string {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w-]+/g, '') // Remove all non-word chars
    .replace(/--+/g, '-'); // Replace multiple - with single -
}

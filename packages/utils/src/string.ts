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
// Regex Breakdown:
// /&             - Matches literal '&' (start of entity)
//  [a-zA-Z0-9#]+ - Matches one or more alphanumeric characters or '#'
//  ;             - Matches literal ';' (end of entity)
// /g             - Global flag to match all occurrences
const ENTITY_REGEX = /&[a-zA-Z0-9#]+;/g;

// Regex Breakdown:
// /^    - Matches the start of the string
//  &#   - Matches literal '&#' (start of numeric entity)
//  \d+  - Matches one or more digits (the decimal entity code)
//  ;    - Matches literal ';' (end of numeric entity)
// $/    - Matches the end of the string
const NUMERIC_ENTITY_REGEX = /^&#\d+;$/;

/**
 * Decodes HTML entities in a string to their corresponding characters.
 * Handles named entities and numeric entities (decimal).
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
 * @param text - The text to slugify.
 * @returns The slugified string.
 *
 * @example
 * slugify("Hello World!") // -> "hello-world"
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

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
 * @param text - The string containing HTML entities.
 * @returns The decoded string.
 */
export function decodeHtmlEntities(text: string): string {
  if (!text) return '';

  return text.replace(/&[a-zA-Z0-9#xX]+;/g, (match) => {
    if (ENTITIES[match]) return ENTITIES[match];

    // Handle numeric entities
    const numericMatch = match.match(/^&#(\d+|[xX][0-9a-fA-F]+);$/);
    if (numericMatch) {
      let codePoint = 0;
      if (numericMatch[1].toLowerCase().startsWith('x')) {
        codePoint = Number.parseInt(numericMatch[1].slice(1), 16);
      } else {
        codePoint = Number.parseInt(numericMatch[1], 10);
      }
      // Use fromCodePoint for Emoji/Astral support
      return String.fromCodePoint(codePoint);
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
export function slugify(text: string | null | undefined): string {
  if (text == null) return '';
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w-]+/g, '') // Remove all non-word chars
    .replace(/--+/g, '-'); // Replace multiple - with single -
}

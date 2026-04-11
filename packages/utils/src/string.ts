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
const NUMERIC_ENTITY_REGEX = /^&#(\d+|[xX][0-9a-fA-F]+);$/;

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
    const numericMatch = match.match(NUMERIC_ENTITY_REGEX);
    if (numericMatch && numericMatch[1]) {
      const codeStr = numericMatch[1];
      const radix = codeStr.toLowerCase().startsWith('x') ? 16 : 10;
      const code = Number.parseInt(codeStr.toLowerCase().startsWith('x') ? codeStr.slice(1) : codeStr, radix);
      if (!Number.isNaN(code)) {
        // Use fromCodePoint for Emoji/Astral support
        return String.fromCodePoint(code);
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
  if (text === null || text === undefined) return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w-]+/g, '') // Remove all non-word chars
    .replace(/--+/g, '-'); // Replace multiple - with single -
}

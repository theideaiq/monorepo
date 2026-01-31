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
const NUMERIC_ENTITY_REGEX = /^&#([xX]?)([\da-fA-F]+);$/;

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
    const numericMatch = match.match(NUMERIC_ENTITY_REGEX);
    if (numericMatch) {
      const isHex = numericMatch[1]?.toLowerCase() === 'x';
      const value = numericMatch[2];
      // Use fromCodePoint for Emoji/Astral support
      return String.fromCodePoint(Number.parseInt(value || '0', isHex ? 16 : 10));
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

/**
 * Safely serializes data to a JSON string for use in JSON-LD scripts.
 * Escapes < to \u003c to prevent script injection attacks (XSS).
 *
 * @param data - The data to serialize.
 * @returns The sanitized JSON string.
 */
export function sanitizeJsonLd(data: unknown): string {
  const json = JSON.stringify(data);
  if (!json) return '';
  return json.replace(/</g, '\\u003c');
}

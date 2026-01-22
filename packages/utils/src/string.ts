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
// Support decimal (&#65;) and hex (&#x41;) entities
const NUMERIC_ENTITY_REGEX = /^&#([xX]?[0-9a-fA-F]+);$/;

/**
 * Decodes HTML entities in a string to their corresponding characters.
 * Handles named entities, numeric entities (decimal), and hex entities.
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
      const codePart = match.slice(2, -1); // Remove &# and ;
      let codePoint: number;

      if (codePart.startsWith('x') || codePart.startsWith('X')) {
        codePoint = parseInt(codePart.slice(1), 16);
      } else {
        codePoint = parseInt(codePart, 10);
      }

      if (!isNaN(codePoint)) {
        return String.fromCodePoint(codePoint);
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

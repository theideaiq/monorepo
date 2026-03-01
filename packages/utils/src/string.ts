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
const ENTITY_REGEX = /&(?:[a-zA-Z0-9]+|#\d+|#[xX][a-fA-F0-9]+);/g;
const NUMERIC_ENTITY_REGEX = /^&#(\d+);$/;
const HEX_ENTITY_REGEX = /^&#[xX]([a-fA-F0-9]+);$/;

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

    // Handle decimal numeric entities
    const decMatch = match.match(NUMERIC_ENTITY_REGEX);
    if (decMatch && decMatch[1]) {
      return String.fromCodePoint(Number.parseInt(decMatch[1], 10));
    }

    // Handle hex numeric entities
    const hexMatch = match.match(HEX_ENTITY_REGEX);
    if (hexMatch && hexMatch[1]) {
      return String.fromCodePoint(Number.parseInt(hexMatch[1], 16));
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
    .normalize('NFD') // Decompose combined characters into base + diacritic
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w-]+/g, '') // Remove all non-word chars
    .replace(/--+/g, '-'); // Replace multiple - with single -
}

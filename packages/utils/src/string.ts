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
export function decodeHtmlEntities(text: string | null | undefined): string {
  if (!text) return text || '';

  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&#x27;': "'",
    '&#x2F;': '/',
    '&#x60;': '`',
    '&#x3D;': '=',
    '&apos;': "'",
    '&nbsp;': ' ',
    '&cent;': '¢',
    '&pound;': '£',
    '&yen;': '¥',
    '&euro;': '€',
    '&copy;': '©',
    '&reg;': '®',
  };

  return text.replace(/&[#a-zA-Z0-9]+;/g, (match) => {
    if (entities[match]) return entities[match];

    // Numeric decimal (e.g. &#128512;)
    const numMatch = match.match(/^&#([0-9]+);$/);
    if (numMatch) {
      // Use fromCodePoint instead of fromCharCode to support surrogate pairs (emoji)
      return String.fromCodePoint(parseInt(numMatch[1], 10));
    }

    // Numeric hex (e.g. &#x41;, &#x1f600;)
    const hexMatch = match.match(/^&#x([a-fA-F0-9]+);$/i);
    if (hexMatch) {
      return String.fromCodePoint(parseInt(hexMatch[1], 16));
    }

    return match;
  });
}

export function slugify(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w-]+/g, '') // Remove all non-word chars
    .replace(/--+/g, '-'); // Replace multiple - with single -
}

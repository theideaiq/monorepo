/**
 * Safely decodes HTML entities in a string.
 * This is useful for displaying text from APIs (like YouTube) that return encoded HTML.
 * Note: When using this in a React component, render the result directly (e.g. <div>{decoded}</div>).
 * React will automatically escape the characters, preventing XSS.
 * DO NOT use this result with dangerouslySetInnerHTML.
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

const ENTITY_REGEX = /&[a-zA-Z0-9#]+;/g;
// ⚡ Bolt Optimization: Hoist regex to avoid re-compilation and use .test() for performance
const NUMERIC_ENTITY_REGEX = /^&#\d+;$/;

export function decodeHtmlEntities(text: string): string {
  if (!text) return '';

  return text.replace(ENTITY_REGEX, (match) => {
    if (ENTITIES[match]) return ENTITIES[match];

    // Handle numeric entities
    if (NUMERIC_ENTITY_REGEX.test(match)) {
      return String.fromCharCode(Number.parseInt(match.slice(2, -1), 10));
    }

    return match;
  });
}

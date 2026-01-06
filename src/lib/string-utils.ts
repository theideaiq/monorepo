/**
 * Safely decodes HTML entities in a string.
 * This is useful for displaying text from APIs (like YouTube) that return encoded HTML.
 * Note: When using this in a React component, render the result directly (e.g. <div>{decoded}</div>).
 * React will automatically escape the characters, preventing XSS.
 * DO NOT use this result with dangerouslySetInnerHTML.
 */
export function decodeHtmlEntities(text: string): string {
  if (!text) return '';

  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&nbsp;': ' ',
    '&apos;': "'",
  };

  return text.replace(/&[a-zA-Z0-9#]+;/g, (match) => {
    if (entities[match]) return entities[match];

    // Handle numeric entities
    if (match.match(/^&#\d+;$/)) {
      return String.fromCharCode(parseInt(match.slice(2, -1), 10));
    }

    return match;
  });
}

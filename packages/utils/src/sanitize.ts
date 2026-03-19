import sanitizeHtmlLib from 'sanitize-html';

/**
 * Sanitizes HTML content for server-side use to prevent XSS.
 * Uses sanitize-html which is safe for Node environments.
 *
 * @param html - The HTML string to sanitize.
 * @returns The sanitized HTML string.
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';
  return sanitizeHtmlLib(html, {
    allowedTags: sanitizeHtmlLib.defaults.allowedTags.concat([
      'img', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', 'tr', 'td', 'th', 'tbody', 'thead', 'tfoot'
    ]),
    allowedAttributes: {
      ...sanitizeHtmlLib.defaults.allowedAttributes,
      img: ['src', 'alt', 'width', 'height'],
      '*': ['style'], // Allow inline styles for all allowed tags in emails
      a: ['href', 'style', 'target'],
    },
  });
}

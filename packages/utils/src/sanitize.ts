import sanitizeHtmlLib from 'sanitize-html';

export function sanitizeHtml(html: string): string {
  return sanitizeHtmlLib(html, {
    allowedAttributes: {
      '*': ['style'],
      a: ['href', 'name', 'target'],
      img: ['src', 'srcset', 'alt', 'title', 'width', 'height', 'loading'],
    },
  });
}

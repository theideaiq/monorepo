/**
 * Safely serializes an object to a JSON-LD string, escaping characters
 * that could be used for XSS attacks when injected into HTML.
 *
 * Specifically, it escapes '<' to preventing early closing of script tags.
 */
export function safeJsonLdStringify(data: unknown): string {
  // JSON.stringify does not escape '<' or '>' by default.
  // We replace '<' with '\u003c' to prevent attacks like </script>
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

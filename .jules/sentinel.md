## 2026-01-27 - [CRITICAL] JSON-LD XSS Vulnerability
**Vulnerability:** `dangerouslySetInnerHTML` was used with `JSON.stringify` to inject JSON-LD data. This allows XSS if user-controlled data (like URL segments) contains `<script>` tags, as `JSON.stringify` does not escape `<`.
**Learning:** `JSON.stringify` is not safe for use inside `<script>` tags without additional escaping because `</script>` can terminate the block.
**Prevention:** Use a safe serializer like `safeJsonLdStringify` that escapes `<` to `\u003c`, preventing the browser from interpreting it as an HTML tag.

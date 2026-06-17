# Sentinel's Journal

## 2025-02-18 - [XSS in JSON-LD Injection]
**Vulnerability:** Unsanitized `JSON.stringify` usage in `dangerouslySetInnerHTML` for JSON-LD scripts allowed XSS via `<` character injection (e.g. `</script>`).
**Learning:** `JSON.stringify` does not escape `<` or `/` by default, assuming the output is for JSON parsing, not HTML embedding. When embedded in `<script>`, `</script>` terminates the block.
**Prevention:** Use `safeJsonLdStringify` (from `@repo/utils`) which escapes `<` to `\u003c` for any JSON-LD script injection.

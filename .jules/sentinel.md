# Sentinel's Journal

## 2025-02-18 - JSON-LD XSS Injection
**Vulnerability:** Found `dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}` in SEO components. This allows XSS if `jsonLd` contains `</script>`.
**Learning:** `JSON.stringify` does not escape HTML characters. When embedded in a `<script>` tag, the browser's HTML parser runs before the JS parser, so `</script>` closes the block immediately.
**Prevention:** Use a dedicated `safeJsonLdStringify` helper that escapes `<`, `>`, and `&` to Unicode sequences (e.g., `\u003c`), which are valid in JSON strings but safe in HTML.

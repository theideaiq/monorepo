## 2025-04-10 - XSS Vulnerability in JSON-LD Structured Data
**Vulnerability:** XSS vulnerability in `apps/web/src/components/seo/JsonLd.tsx` and `apps/web/src/components/seo/BreadcrumbJsonLd.tsx` via unsanitized JSON-LD serialization inside `<script type="application/ld+json">`.
**Learning:** `JSON.stringify` does not escape `<` characters by default. Using `dangerouslySetInnerHTML` directly with `JSON.stringify` allows malicious inputs to break out of the script tag (e.g. `</script><script>alert(1)</script>`) and execute arbitrary code.
**Prevention:** Always sanitize JSON strings injected into `<script>` tags by replacing `<` with its unicode equivalent `\u003c` (e.g., `JSON.stringify(data).replace(/</g, '\\u003c')`).

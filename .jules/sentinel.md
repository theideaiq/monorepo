## 2025-02-18 - [XSS in JSON-LD Script Injection]
**Vulnerability:** JSON-LD data injected into `<script type="application/ld+json">` using `dangerouslySetInnerHTML` was vulnerable to XSS. If user-controlled input contained `</script>`, it could break out of the script tag and execute arbitrary HTML/JS.
**Learning:** `JSON.stringify()` is not sufficient for safe injection into HTML script tags because it does not escape `<` or `/` characters by default, allowing the closing script tag sequence to be injected.
**Prevention:** Always sanitize JSON strings injected into HTML by replacing `<` with `\u003c`. Use the `sanitizeJsonLd` utility from `@repo/utils` for this purpose.

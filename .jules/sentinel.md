## 2024-04-09 - JSON-LD XSS Vulnerability
**Vulnerability:** Unsanitized JSON-LD injection via `dangerouslySetInnerHTML` in `JsonLd.tsx` and `BreadcrumbJsonLd.tsx`.
**Learning:** Even structured data meant for SEO can be an XSS vector if user input (like URL pathnames) ends up in the JSON string without sanitization. Replacing `<` with `\u003c` is necessary.
**Prevention:** Always sanitize JSON strings passed to `dangerouslySetInnerHTML` by using `.replace(/</g, '\\u003c')`.

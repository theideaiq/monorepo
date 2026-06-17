## 2026-02-20 - XSS in JSON-LD Injection
**Vulnerability:** Found `JSON.stringify` used directly inside `dangerouslySetInnerHTML` for JSON-LD scripts in `JsonLd.tsx` and `BreadcrumbJsonLd.tsx`. This allows XSS if user input (e.g., breadcrumb segment) contains `</script>`.
**Learning:** Developers often forget that `JSON.stringify` doesn't escape HTML-significant characters like `<`, `>`, `&`. When injected into a `<script>` tag, this can terminate the script block prematurely.
**Prevention:** Use a dedicated `safeJsonLdStringify` utility that escapes these characters (e.g., `<` to `\u003c`) before injecting JSON into HTML.

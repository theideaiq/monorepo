## 2025-03-28 - Cross-Site Scripting (XSS) in JSON-LD Injection
**Vulnerability:** XSS payload execution via unescaped `JSON.stringify` injected using `dangerouslySetInnerHTML` in React SEO components (`JsonLd`, `BreadcrumbJsonLd`).
**Learning:** React does not automatically escape data injected via `dangerouslySetInnerHTML`. Injecting `JSON.stringify` directly leaves the application vulnerable if the data contains malicious HTML elements (e.g., from unvalidated URL path segments in Breadcrumbs or other user-controlled data).
**Prevention:** Always escape HTML characters (specifically replacing `<` with `\u003c`) in the `JSON.stringify` output prior to rendering with `dangerouslySetInnerHTML`.

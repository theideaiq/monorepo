## 2024-05-18 - JSON-LD Structured Data XSS Prevention
**Vulnerability:** JSON-LD structured data inside a `<script type="application/ld+json">` tag allows users to perform Cross-Site Scripting (XSS) if the data injected contains `<` or `>` characters because the script content is injected directly as HTML.
**Learning:** React's `dangerouslySetInnerHTML` does not sanitize `<` inside `<script>` blocks because it treats the content strictly as raw string logic.
**Prevention:** To prevent XSS vulnerabilities without modifying the structure or semantics of the JSON-LD, explicitly replace all `<` characters with their unicode equivalents: `dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}`.

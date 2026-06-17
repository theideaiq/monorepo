## 2026-03-29 - Missing Structured Data for Core Entities
**Learning:** Dynamic product pages were missing JSON-LD structured data (Product schema), making it difficult for search engines to surface rich snippets for these core business entities.
**Action:** Inject JSON-LD structured data for dynamic routes by mounting a discrete React component (e.g., `<ProductJsonLd />`) that renders a `<script type="application/ld+json">` tag within the server component payload alongside standard metadata tags, ensuring XSS safety by replacing `<` with `\u003c`.

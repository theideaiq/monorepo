## 2024-03-03 - [Initial]

## 2024-03-03 - Product JSON-LD Structured Data
**Learning:** Product pages were lacking Product Structured Data (JSON-LD), which is a critical signal for search engines to generate rich snippets (stars, pricing, availability in search results).
**Action:** Created and integrated a `ProductJsonLd` component within the `ProductPage` to map and output dynamic item attributes into a semantic Schema.org payload. Ensured current URL references construct canonically via environment variables to bypass client-side React hydration issues.

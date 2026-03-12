## 2024-05-24 - Sitemap Synchronization
**Learning:** Found a discrepancy between `sitemap.ts` hardcoded routes and actual application routes (e.g., `/club` vs `/plus`). This causes crawling errors (404s).
**Action:** When creating new top-level pages or renaming routes, always check `sitemap.ts` and `robots.ts` to ensure they reflect the current site structure. Ideally, derive sitemap routes from a shared configuration like `@repo/config` if possible.

## 2024-03-12 - Product Pages Missing Structured Data
**Learning:** E-commerce product pages (`/product/[slug]`) lack Schema.org Product JSON-LD, reducing the chance of Rich Snippets (price, rating, availability) in search results.
**Action:** Always inject `Product` structured data on product detail pages using the standard `@type: Product` schema, mapping price, currency, availability, and ratings.

## 2024-05-24 - Sitemap Synchronization
**Learning:** Found a discrepancy between `sitemap.ts` hardcoded routes and actual application routes (e.g., `/club` vs `/plus`). This causes crawling errors (404s).
**Action:** When creating new top-level pages or renaming routes, always check `sitemap.ts` and `robots.ts` to ensure they reflect the current site structure. Ideally, derive sitemap routes from a shared configuration like `@repo/config` if possible.

## 2025-02-18 - Product Schema Completeness
**Learning:** The `AggregateRating` schema for Products requires `reviewCount` or `ratingCount`. If missing, search engines may invalidate the structured data, preventing Rich Snippets (star ratings) from appearing in search results.
**Action:** Always ensure `reviewCount` is explicitly available in the product data model and mapped correctly in the `ProductJsonLd` component when implementing `AggregateRating` schema.

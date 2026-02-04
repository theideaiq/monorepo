## 2024-05-24 - Sitemap Synchronization
**Learning:** Found a discrepancy between `sitemap.ts` hardcoded routes and actual application routes (e.g., `/club` vs `/plus`). This causes crawling errors (404s).
**Action:** When creating new top-level pages or renaming routes, always check `sitemap.ts` and `robots.ts` to ensure they reflect the current site structure. Ideally, derive sitemap routes from a shared configuration like `@repo/config` if possible.

## 2024-05-25 - Product Structured Data Gap
**Learning:** Product detail pages (`/product/[slug]`) lacked `Product` JSON-LD Schema, missing the opportunity for rich snippets (price, availability, ratings) in search results.
**Action:** Always implement `ProductJsonLd` or similar schema components for key entity pages immediately upon creation.

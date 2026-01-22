## 2024-05-24 - Sitemap Synchronization
**Learning:** Found a discrepancy between `sitemap.ts` hardcoded routes and actual application routes (e.g., `/club` vs `/plus`). This causes crawling errors (404s).
**Action:** When creating new top-level pages or renaming routes, always check `sitemap.ts` and `robots.ts` to ensure they reflect the current site structure. Ideally, derive sitemap routes from a shared configuration like `@repo/config` if possible.

## 2024-05-25 - Missing Product Structured Data
**Learning:** Product detail pages (`/product/[slug]`) lack JSON-LD `Product` schema. This prevents Google from displaying rich snippets (price, availability, ratings) in search results, significantly reducing click-through rate potential.
**Action:** Always implement `application/ld+json` structured data for core entity pages (Products, Articles, Events) during the initial page build, ensuring dynamic mapping of database fields to Schema.org properties.

## 2024-05-24 - Sitemap Synchronization
**Learning:** Found a discrepancy between `sitemap.ts` hardcoded routes and actual application routes (e.g., `/club` vs `/plus`). This causes crawling errors (404s).
**Action:** When creating new top-level pages or renaming routes, always check `sitemap.ts` and `robots.ts` to ensure they reflect the current site structure. Ideally, derive sitemap routes from a shared configuration like `@repo/config` if possible.

## 2025-02-23 - Structured Data Coverage
**Learning:** Product pages were missing schema.org structured data, limiting rich snippet eligibility (price, availability, rating) in SERPs. The `Product` interface lacks `reviewCount` but calculates `rating` from `reviews`, making accurate `AggregateRating` schema tricky without interface updates.
**Action:** Always implement JSON-LD structured data for core entities (Products, Articles) using dedicated components (e.g., `ProductJsonLd`) alongside the visual component. Ensure data models expose necessary fields for schema (like `reviewCount`) to maximize rich snippet potential.

## 2024-05-24 - Sitemap Synchronization
**Learning:** Found a discrepancy between `sitemap.ts` hardcoded routes and actual application routes (e.g., `/club` vs `/plus`). This causes crawling errors (404s).
**Action:** When creating new top-level pages or renaming routes, always check `sitemap.ts` and `robots.ts` to ensure they reflect the current site structure. Ideally, derive sitemap routes from a shared configuration like `@repo/config` if possible.

## 2025-02-23 - Product Schema Fallback
**Learning:** Product Pages relying on database connectivity can render 404s or empty metadata if the DB is down, hurting SEO stability.
**Action:** Implemented a robust `try/catch` fallback in `getProductBySlug` that throws on DB error to trigger the fallback mock data, ensuring `ProductJsonLd` always receives valid data even during outages.

## 2024-05-24 - Sitemap Synchronization
**Learning:** Found a discrepancy between `sitemap.ts` hardcoded routes and actual application routes (e.g., `/club` vs `/plus`). This causes crawling errors (404s).
**Action:** When creating new top-level pages or renaming routes, always check `sitemap.ts` and `robots.ts` to ensure they reflect the current site structure. Ideally, derive sitemap routes from a shared configuration like `@repo/config` if possible.

## 2024-05-24 - Product Structured Data
**Learning:** Product pages were missing Schema.org Structured Data, reducing visibility in search results (Rich Snippets).
**Action:** Implemented `ProductJsonLd` server component to inject sanitized JSON-LD. Ensure all future entity pages (e.g., Articles, Events) have dedicated JSON-LD components.

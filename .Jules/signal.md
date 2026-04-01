## 2024-04-01 - Missing Product Structured Data
**Learning:** Found that Product pages (`apps/web/src/app/[locale]/product/[slug]/page.tsx`) lacked JSON-LD Structured Data for Products, missing out on rich snippets (stars, prices in search).
**Action:** Created `ProductJsonLd.tsx` and injected it into Product pages to include schema.org `Product`, `Offer`, and `AggregateRating` attributes to improve indexability and visibility in Google Search.

## 2024-05-18 - Missing Structured Data for Products

**Learning:** Discovered a missing Structured Data opportunity for core business entities (Products). Without `Product` JSON-LD schema on product details pages, search engines might not be able to display rich snippets like product ratings, price, or availability in search results, negatively impacting visibility and click-through rates.

**Action:** Created `ProductJsonLd` component and injected it into `apps/web/src/app/[locale]/product/[slug]/page.tsx` to explicitly provide `Product` schema.org JSON-LD type details (name, image, description, offers, aggregateRating). Next time, proactively look for opportunities to add Structured Data to core entities like articles and breadcrumbs.
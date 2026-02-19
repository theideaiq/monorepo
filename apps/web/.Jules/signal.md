## 2024-05-24 - Sitemap Synchronization
**Learning:** Found a discrepancy between `sitemap.ts` hardcoded routes and actual application routes (e.g., `/club` vs `/plus`). This causes crawling errors (404s).
**Action:** When creating new top-level pages or renaming routes, always check `sitemap.ts` and `robots.ts` to ensure they reflect the current site structure. Ideally, derive sitemap routes from a shared configuration like `@repo/config` if possible.

## 2024-05-25 - Secure JSON-LD Injection
**Learning:** Hardcoded `JSON.stringify` inside `<script>` tags is vulnerable to XSS if user-generated content (like product descriptions) contains malicious HTML entities (e.g., `</script>`).
**Action:** Always use the `safeJsonLdStringify` utility from `@repo/utils` when injecting Structured Data. This escapes HTML entities (e.g., `<` -> `\u003c`) to prevent script injection while preserving JSON validity for crawlers.

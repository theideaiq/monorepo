## 2026-02-24 - [Intl.NumberFormat Caching]
**Learning:** `Intl.NumberFormat` instantiation inside React components (e.g., `ProductView`) is a common performance anti-pattern in this codebase, causing unnecessary object creation on every render.
**Action:** Always refactor locale-specific formatting (like `en-IQ`) into shared, cached utilities in `@repo/utils` (e.g., `formatIQD`), which also ensures consistent formatting rules (e.g., no decimals).

## 2025-02-18 - Cache Intl formatters at module level
Smell: Instantiating `Intl.NumberFormat` and `Intl.DateTimeFormat` inside functional components or render loops.
Standard: Cache these formatters at the module level (e.g., in `@repo/utils/src/format.ts`) to prevent repetitive CPU overhead and reduce garbage collection, particularly when formatting items in lists or grids.

## 2025-01-20 - Prevent recreating Intl formatters on every render
Smell: Recreating `Intl.NumberFormat` or `Intl.DateTimeFormat` on every component render (e.g., `new Intl.NumberFormat('en-IQ').format(price)`). This allocates new objects needlessly and is an expensive anti-pattern.
Standard: Always use the cached `getNumberFormatter` and `getDateTimeFormatter` utilities from `@repo/utils` to reduce object allocation and CPU overhead.

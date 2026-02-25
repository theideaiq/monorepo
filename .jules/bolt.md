## 2025-05-27 - Performance: Cached Intl.NumberFormat
**Learning:** Instantiating `Intl.NumberFormat` inside React components (render loop) creates unnecessary object churn. Caching the formatter instance (e.g., in a module-level variable) significantly reduces allocation overhead, especially for frequently rendered lists like carts.
**Action:** Use `formatIQDNumber` from `@repo/utils` for currency formatting instead of `new Intl.NumberFormat(...)`.

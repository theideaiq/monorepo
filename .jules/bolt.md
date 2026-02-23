# Bolt's Journal

## 2025-01-09 - Intl.NumberFormat Caching
**Learning:** Instantiating `Intl.NumberFormat` inside React components (render loop) is an expensive operation that can cause performance issues, especially in lists like `ProductCard`.
**Action:** Always create cached instances of `Intl.NumberFormat` outside of the component lifecycle or use a shared utility like `formatIQDNumber` in `@repo/utils`.

## 2025-02-18 - Intl.NumberFormat Performance
**Learning:** `Intl.NumberFormat` instantiation is expensive and was frequently occurring inside React render paths (e.g., `ProductCard`, `CartDrawer`).
**Action:** Always use the cached `formatCurrency` utility in `@/lib/formatters` instead of direct instantiation.

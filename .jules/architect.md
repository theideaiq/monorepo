## 2025-05-24 - Intl.NumberFormat Instantiation
Smell: Instantiating `new Intl.NumberFormat` inline inside React components (especially loops/lists) causes repetitive CPU overhead, memory allocation, and poor maintainability if formatting rules change.
Standard: Cache `Intl` instances at the module level or use standardized utility functions from `@repo/utils` (e.g., `formatCurrency`) instead of inline instantiation.

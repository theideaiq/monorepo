## 2024-05-18 - Intl.NumberFormat instantiation in Render
**Learning:** Recreating `Intl.NumberFormat` or `Intl.DateTimeFormat` instances on every React render is an expensive anti-pattern.
**Action:** Cache these formatters as module-level singletons (e.g., in `@repo/utils/src/format.ts`) and reuse them across components to reduce object allocation.
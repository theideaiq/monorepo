## 2026-04-08 - Cache Intl.NumberFormat inside render loops
**Learning:** Instantiating `Intl.NumberFormat` or `Intl.DateTimeFormat` inside a React component's render loop is an expensive CPU operation and leads to excess garbage collection, particularly when formatting items in lists or grids.
**Action:** Always cache instances at the module level (e.g., in `@repo/utils`) rather than instantiating them inline inside functional components.

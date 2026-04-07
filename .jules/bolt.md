## 2025-04-07 - Cache Intl.NumberFormat inside Render Loops
**Learning:** Instantiating `Intl.NumberFormat` inside React components or render loops (e.g. `items.map`) causes repetitive CPU overhead and unnecessary garbage collection. This is a subtle but impactful bottleneck for lists displaying formatted currencies or numbers.
**Action:** Always cache `Intl.NumberFormat` instances at the module level (or export them from a shared utility) to reuse the formatter and prevent GC pressure during renders.

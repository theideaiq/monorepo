## 2026-03-09 - [Inline Intl.NumberFormat Instantiation]
**Learning:** Instantiating `Intl.NumberFormat` inline within React components creates significant overhead during render cycles. It forces the browser to repeatedly initialize localization logic, leading to performance bottlenecks when rendering lists of elements like ProductCards.
**Action:** Extract `Intl.NumberFormat` instantiations to a dedicated module, effectively caching and reusing a singleton instance across all renders.

## 2025-03-18 - Intl.NumberFormat caching
**Learning:** Instantiating Intl.NumberFormat inline in React components or utility functions causes expensive recalculations during render loops.
**Action:** Create, export, and reuse cached formatter instances globally (e.g., using a centralized formatCurrency utility) instead of inline instantiation.

## 2024-03-17 - Cached Intl.NumberFormat
**Learning:** Instantiating Intl.NumberFormat inline in React components causes expensive recalculations during render cycles.
**Action:** Always create, export, and reuse cached formatter instances (e.g., using a centralized formatCurrency utility) to prevent unnecessary performance overhead.

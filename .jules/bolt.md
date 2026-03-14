## 2024-03-14 - Prevent inline Intl.NumberFormat instantiation in React renders
**Learning:** Instantiating `Intl.NumberFormat` inline inside React components causes expensive recalculations during every render cycle.
**Action:** Always create, export, and reuse cached formatter instances (e.g., in `apps/web/src/lib/formatters.ts`) to optimize React frontend performance.

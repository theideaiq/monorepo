## 2024-03-23 - Computed derived state totals in Zustand store instead of on render
**Learning:** Recalculating totals (e.g., total quantities) on every React render using `.reduce()` for UI components like `BottomNav` and `WebNavbar` is inefficient. It's better to calculate derived state totals once during Zustand store updates and expose them as scalar values.
**Action:** Always compute derived scalar totals inside the Zustand update actions and store them directly in the state when possible, rather than reducing arrays on every render.

## 2026-03-30 - Pre-compute Derived State in Zustand Stores
**Learning:** Found O(N) array calculations (like `.reduce()`) being executed inside React component renders via Zustand selectors (e.g., `useCartStore`). This causes unnecessary performance overhead on every render.
**Action:** Always pre-compute and store derived state (like `totalItems`) during state updates (e.g., `addItem`, `removeItem`) in the Zustand store itself to avoid expensive recalculations during renders.

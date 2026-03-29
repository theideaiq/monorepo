## 2024-05-17 - Pre-compute Derived State in Zustand
**Learning:** Computing derived state (like `totalItems`) inside React components using expensive array operations (e.g., `items.reduce`) causes unnecessary O(N) recalculations on every render.
**Action:** Pre-compute and store derived state during Zustand state updates (`addItem`, `removeItem`, etc.) to optimize component rendering and avoid redundant computations.

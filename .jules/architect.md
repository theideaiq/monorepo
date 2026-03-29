## 2024-03-29 - Pre-compute Derived State in Zustand Stores
Smell: Expensive array computations like `.reduce()` being executed within React component renders for derived state.
Standard: Prefer pre-computing and storing derived state (like `totalItems`) during state updates (e.g., `addItem`, `removeItem`) inside the Zustand store to avoid unnecessary O(N) recalculations and re-renders.

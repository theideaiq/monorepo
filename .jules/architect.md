## 2024-05-24 - Pre-computing Derived State
Smell: Recalculating derived state (like total quantity of items) on every render using `.reduce()` inside React components.
Standard: Compute derived state totals once during Zustand store updates and expose them as scalar values.

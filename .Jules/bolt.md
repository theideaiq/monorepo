## 2024-05-17 - Pre-compute Derived State in Zustand Stores
**Learning:** In Zustand stores like `useCartStore`, computing values such as `totalItems` inside React component renders using array methods like `.reduce()` causes unnecessary O(N) recalculations on every render across multiple components.
**Action:** Pre-compute and store derived state (e.g., `totalItems`) during state updates (`addItem`, `removeItem`) alongside other values like `total`, preventing expensive computations in UI components.

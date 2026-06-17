# Testudo's Journal

## 2025-05-24 - Cart Store Test Obsolescence
Discovery: The `apps/web/src/stores/cart-store.test.ts` was testing a string-based implementation (e.g., `addItem('apple')`) while the actual store implementation had evolved to use complex `CartItem` objects. This indicates that tests were not run or updated during previous refactoring, leading to a complete disconnect between the test suite and the codebase.
Strategy: When refactoring state management (Stores/Reducers), existing tests must be run *before* and *after* changes. Tests should use strict typing to prevent passing invalid shapes (e.g., strings instead of objects) which TypeScript would catch if the test file was properly typed and checked.

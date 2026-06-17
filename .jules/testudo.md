# Testudo's Journal - Critical Learnings

## 2025-02-18 - Untested Cart Store State
Discovery: The `apps/web/src/stores/cart-store.test.ts` was testing string items, while the implementation `apps/web/src/stores/cart-store.ts` uses complex `CartItem` objects. This indicates a complete lack of tests for the client-side cart logic.
Strategy: Rewrite tests to match the implementation types. In the future, ensure store refactors are accompanied by test updates.

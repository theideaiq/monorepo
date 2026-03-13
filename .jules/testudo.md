## 2024-05-24 - [Fixing Vitest cart store test failures in apps/web]
Discovery: The mock error checks are looking for exact string outputs, but the test expectations in `apps/web/src/stores/cart-store.test.ts` don't match the new store implementation which expects objects with quantity instead of primitive strings.
Strategy: Correct the string expectations in tests to match the actual implementations.

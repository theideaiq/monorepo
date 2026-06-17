## 2024-04-03 - Cart Store Test Mocks
Discovery: Tests for the `useCartStore` were failing because the `CartItem` schema was updated to an object but the test fixtures were still passing primitive strings (e.g. 'apple').
Strategy: Always update existing test cases in a file to reflect the current state schema when adding or modifying tests for a store, to prevent regressions and pre-existing test failures.

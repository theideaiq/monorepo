## 2024-05-22 - [Critical Gap: Cart Store Tests Testing Wrong Data Structure]
Discovery: The `src/stores/cart-store.test.ts` file was testing the `CartItem` store as if it contained an array of strings (e.g., `['apple']`), but the actual implementation in `cart-store.ts` uses complex objects (`{ id, productId, ... }`). This means the cart logic (add, remove, total calculation) was effectively untested and passing only by accident (or failing silently in CI).
Strategy: Rewrite the test suite to use proper `CartItem` objects and explicitly verify state mutations and total calculations.

## 2024-05-22 - [Discrepancy: String Utils Handling Nulls]
Discovery: The `string-utils.test.ts` expected `slugify(null)` to return `''`, but the implementation in `@repo/utils` immediately called `.toString()` on the input, causing a crash. Also, `decodeHtmlEntities` tests expected hex entity support which was missing.
Strategy: Update implementation to match test expectations (robustness over strictness).

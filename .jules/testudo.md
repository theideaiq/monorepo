## 2025-02-13 - Broken Cart Tests
Discovery: The cart-store.test.ts had false positive tests because it passed primitive strings as items when the `addItem` expects objects of type `CartItem`.
Strategy: Always test global stores with the exact interface matching the actual app state.

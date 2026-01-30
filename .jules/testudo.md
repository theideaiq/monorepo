## 2025-02-18 - [Ghost Test Suites]
Discovery: The `apps/web/src/stores/cart-store.test.ts` was testing a string-based cart implementation while the actual store used complex `CartItem` objects. The test was passing or valid only in a different reality, creating false confidence.
Strategy: When encountering state stores or complex objects, explicitly verify the data structure in the test setup matches the implementation interface.

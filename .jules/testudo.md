# Testudo's Journal

## 2024-05-22 - [Broken Cart Store Tests]
Discovery: The `cart-store.test.ts` in `apps/web` was testing a string-based implementation while the actual store uses complex `CartItem` objects. This discrepancy led to failing tests that provided no value.
Strategy: Ensure test fixtures match the actual data shape of the store. Use factory functions for complex objects to keep tests readable and maintainable.

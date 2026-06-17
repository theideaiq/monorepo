## 2025-02-19 - [Mock vs Real Discrepancy in Cart Store]
Discovery: `cart-store.test.ts` was testing with string inputs (`addItem('apple')`) while the implementation required objects (`addItem({ id: ... })`). This caused tests to fail or provide false confidence.
Strategy: Use factory functions (like `createMockCartItem`) in tests to generate valid data structures that match the implementation's type definitions. This ensures tests evolve with the schema.

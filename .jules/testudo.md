## 2025-05-23 - [Cart Store Type Mismatch]
Discovery: The `cart-store` unit tests were completely broken because they passed string primitives to actions (`addItem('apple')`) that strictly required `CartItem` objects. This discrepancy was hidden because the tests were likely never run or the implementation drifted significantly without updating tests.
Strategy: Always verify tests against the *actual* TypeScript interfaces of the store. Use helper factories (like `createMockCartItem`) to enforce type correctness in tests and prevent "string vs object" regression.

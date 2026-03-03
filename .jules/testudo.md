## 2024-05-19 - Mismatched Mocks in State Management Tests
Discovery: Testing `useCartStore` with primitive values (`'apple'`) instead of full `CartItem` objects caused false assertions and silent failures because the store implementation correctly mapped array mutations to complex objects (e.g., adding a `quantity` field). The test asserted on the primitive value, resulting in mismatch errors.
Strategy: Use comprehensive object factories (`createMockItem`) that strictly match the interfaces (e.g., `CartItem`) when testing state managers or stores to avoid typing mismatch and runtime errors.

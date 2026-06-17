# Testudo's Journal

## 2025-02-18 - [False Confidence in Store Tests]
Discovery: Found existing unit tests for `cart-store` passing strings (`addItem('apple')`) to a store expecting `CartItem` objects. Javascript/Vitest didn't throw type errors at runtime, leading to passing tests that verified nothing relevant.
Strategy: Always define a strict `createMockItem` helper that matches the Typescript interface for complex state objects. Use `beforeEach` to strictly reset store state to avoid pollution.

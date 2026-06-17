# Testudo's Journal

## 2025-02-18 - Broken Cart Store Tests
Discovery: The `cart-store.test.ts` was testing a string-based implementation while the actual store uses complex objects (`CartItem`). The tests were failing with type mismatches (expected string, got object). This suggests a major refactor occurred without updating the tests, leaving the critical cart logic unprotected.
Strategy: Always verify tests against the *current* type definitions. When refactoring stores, tests must be updated to match the new state shape immediately. Use factory helpers for complex objects in tests to keep them readable and maintainable.

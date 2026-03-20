## 2026-03-20 - Untested Store Methods in Cart

Discovery: Complex Reducer logic like `updateQuantity` within Zustand stores (e.g., `cart-store`) completely bypassed unit tests, leaving the application vulnerable to unchecked regressions. The previous tests had incorrectly assumed `addItem` took strings instead of the complex `CartItem` objects required by the actual interface, revealing a significant gap between test types and actual implementation.

Strategy: Always mock state parameters dynamically when injecting test states or when interacting with poorly-typed existing tests. Use localized type assertions (`as any`) for new tests added to legacy suites in order to test exactly ONE gap effectively without triggering scope creep or widespread refactors.
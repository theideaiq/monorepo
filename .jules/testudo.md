## 2025-02-19 - Phantom Tests & Shared Utils Gaps

Discovery: The `apps/web/src/stores/cart-store.test.ts` was testing a string-based implementation while the actual store used complex objects. This created a false sense of security where tests passed (or were ignored) despite being completely disconnected from reality. Additionally, `@repo/utils` lacked its own test suite, and its consumers (`apps/web`) had failing tests for it, indicating a broken contract.

Strategy:
1. **Type-Safe Testing**: Ensure tests share the same type definitions as the implementation to catch divergence at compile time.
2. **Co-located Package Tests**: Shared packages (`packages/*`) must have their own test suites configured and running in CI, rather than relying on consumer apps to test them.

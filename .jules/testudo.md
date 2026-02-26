## 2024-05-23 - Shared Package Testing Gap
Discovery: Core packages like `@repo/payment-engine` lack internal test runners, relying on consumer apps (`apps/web`) for verification. This risks logic drift and makes unit testing difficult.
Strategy: Implement critical logic tests within the primary consumer (`apps/web`) until a dedicated test runner is added to the shared package.

## 2024-05-23 - Cart Store Test Drift
Discovery: Tests for `useCartStore` were asserting string arrays while the implementation had evolved to use complex `CartItem` objects. This complete drift meant critical checkout logic was effectively untested.
Strategy: When refactoring stores, always run existing tests first to catch drift immediately. Tests must match the interface defined in the store.

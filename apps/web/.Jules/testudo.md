# Testudo's Journal

## 2025-02-19 - Store State Evolution vs Test Stagnation
Discovery: `src/stores/cart-store.test.ts` failed because the store implementation evolved to use complex objects (with quantity) while the test still expected simple string arrays. This indicates a disconnect between state shape changes and test updates, likely exacerbated by loose typing in tests or lack of type-checking during test runs.
Strategy: When testing Zustand stores or any state management, explicitly import and use the state interface/type in the test to enforce type safety. Ensure tests mirror the actual state structure, not just a simplified version.

## 2025-02-19 - Utility Edge Cases
Discovery: `src/lib/string-utils.test.ts` fails on null inputs for `slugify`, throwing runtime errors instead of handling gracefully as expected by the test.
Strategy: Utilities should have defensive programming for `null`/`undefined` if they are expected to handle it, or types should strict-block `null`. Tests must align with the actual runtime contract.

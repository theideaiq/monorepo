## 2025-05-22 - Supabase Client Mocking
Discovery: Unit testing Supabase service wrappers requires mocking the fluent API chain (e.g., `.from().select().gt().limit()`) in a specific order. The client is instantiated inside the function, necessitating `vi.mock('@/lib/supabase/client', ...)` to intercept the factory function.
Strategy: Use `vi.mock` with `mockReturnValue` chaining to simulate the exact query builder structure used in the implementation. Ensure the final promise-returning method (like `limit` or `single`) resolves/rejects as expected.

## 2025-05-22 - Baseline Test Failures
Discovery: The repository currently has failing tests in `src/lib/string-utils.test.ts` and `src/stores/cart-store.test.ts`.
Strategy: When adding new tests, verify them in isolation or strictly filter the test run (e.g., `pnpm test <file>`) to distinguish new regressions from existing debt. Do not attempt to fix unrelated broken tests unless instructed.

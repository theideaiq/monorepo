# Architect's Journal

## 2026-02-14 - Test Colocation
Smell: Tests for shared packages (like `@repo/utils`) are located in consuming applications (e.g., `apps/web`), leading to potential breakage if the package is used elsewhere, and making the package harder to develop in isolation.
Standard: Shared packages must have their own unit tests co-located with source files (e.g., `src/foo.ts` -> `src/foo.test.ts`). Each package is responsible for testing its own public API.

## 2026-01-24 - Co-located Tests in Shared Packages
Smell: Unit tests for shared packages (like `@repo/utils`) located in consuming applications (like `apps/web`), causing loose coupling and testing infrastructure gaps.
Standard: Tests for shared packages must be co-located within the package (e.g., `src/foo.test.ts` next to `src/foo.ts`) and executed via the package's own test runner (Vitest).

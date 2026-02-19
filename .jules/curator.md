# Curator's Journal

## 2025-02-18 - [Co-location of Tests in Shared Packages]
Structure: Move unit tests from consuming applications (e.g., `apps/web/src/lib/*.test.ts`) to the shared package they test (e.g., `packages/utils/src/*.test.ts`).
Rule: Tests for shared packages must be co-located with the source code within the package directory, not in consuming applications. Each package must have its own test configuration (`vitest`) to ensure self-contained verification.

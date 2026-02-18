# Curator's Journal

## 2025-02-18 - Co-located Tests in Shared Packages
Structure: Tests for shared packages (e.g., `@repo/utils`) must be co-located with the source code within the package directory (e.g., `packages/utils/src/string.test.ts`), not in consuming applications.
Rule: Do not place unit tests for shared utilities in application `src/lib` folders. Keep them next to the utility implementation.

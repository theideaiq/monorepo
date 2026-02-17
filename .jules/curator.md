# Curator's Journal

## 2026-02-17 - Co-location of Tests in Shared Packages
Structure: Tests for shared packages (e.g., `@repo/utils`) must be co-located with the source code within the package directory.
Rule: Each shared package must have its own test runner configuration (e.g., `vitest`), `test` script in `package.json`, and ensure `tsconfig.json` includes test files for type checking.

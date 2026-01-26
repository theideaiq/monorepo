# Architect's Journal

## 2026-01-26 - Co-location of Tests
Smell: Tests for shared packages located in consuming apps (e.g., `apps/web` testing `@repo/utils`).
Standard: Tests must be co-located within the shared package (e.g., `packages/utils/src/*.test.ts`) to ensure modularity and proper context.

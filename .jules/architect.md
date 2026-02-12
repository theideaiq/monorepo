## 2025-05-23 - Co-located Tests in Shared Packages
Smell: Tests for shared packages (e.g., `@repo/utils`) located in consumer apps (e.g., `apps/web`), causing duplication and hidden bugs.
Standard: Shared packages must contain their own unit tests co-located with source files (e.g., `src/string.test.ts`) and configured with `vitest`.

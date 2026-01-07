## 2024-05-23 - Vitest Alias Mismatch
Discovery: The `vitest.config.mts` mapped `@` to `./`, while `tsconfig.json` mapped `@/*` to `./src/*`. This caused imports in source files (like `@/lib/wayl`) to fail during tests because Vitest looked in the project root instead of `src`.
Strategy: Align `vitest.config.mts` aliases with `tsconfig.json` to ensure consistent module resolution between build and test environments.

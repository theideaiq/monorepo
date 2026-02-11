## 2026-02-11 - Co-locate Shared Tests
Structure: Shared packages (e.g., `@repo/utils`) must be self-contained and testable.
Rule: Unit tests for shared code must be co-located with the source file (e.g., `src/string.ts` -> `src/string.test.ts`) inside the package, rather than relying on consumer apps (e.g., `apps/web`) to test them.

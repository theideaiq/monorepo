## 2026-02-10 - Co-location of Unit Tests
Structure: Unit tests for shared packages should reside in the same package as the source code.
Rule: Shared packages (e.g., @repo/utils) must contain their own unit tests co-located with source files (e.g., src/string.ts and src/string.test.ts), rather than being tested from consumer apps.

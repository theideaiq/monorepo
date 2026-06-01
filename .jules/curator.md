## 2024-04-02 - Co-location of Workspace Package Tests
Structure: Tests for functions and utilities in shared workspace packages (e.g., `@repo/utils`) were found in consumer packages (e.g., `apps/web/src/lib/string-utils.test.ts`).
Rule: Tests must be co-located with the code they verify. A package testing its own internal utilities must contain its own tests using Vitest configured in its `package.json` with a `"test": "vitest run"` script. Consumer apps should not contain unit tests for external shared workspace functions.

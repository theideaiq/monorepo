## 2024-03-21 - Test Co-location
Structure: Tests for a specific package are co-located within that package, next to the source files they test.
Rule: Do not place tests for a utility package inside a consuming application (e.g. apps/web/src/lib/string-utils.test.ts testing @repo/utils).

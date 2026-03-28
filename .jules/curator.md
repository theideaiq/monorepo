## 2024-03-28 - Co-location of Utils Tests
Structure: We group test files next to their corresponding source code in shared packages rather than housing them in consumer apps.
Rule: Tests for shared packages (like @repo/utils) must be co-located with their source files (e.g. string.test.ts next to string.ts).

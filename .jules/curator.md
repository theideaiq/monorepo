## 2025-03-04 - Co-location of tests for shared packages
Structure: Co-locate tests for shared packages inside the package itself instead of consuming applications.
Rule: Tests for shared workspace packages (e.g., `@repo/utils`) must be co-located alongside the module they are testing within the package's `src/` directory, rather than placed in consumer applications like `apps/web`.
